import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { TrackingService } from '@/modules/tracking/tracking.service.js';
import { UpdateDriverLocationDto } from '@/modules/tracking/dto/update-location.dto.js';
import type { DriverLocationData } from '@/modules/tracking/repositories/driver-location.redis.repository.js';
import { DispatchService, type TripOfferPayload } from '@/modules/dispatch/dispatch.service.js';

@WebSocketGateway({
  namespace: 'delivery',
  cors: {
    origin: '*',
  },
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  constructor(
    @Inject(forwardRef(() => TrackingService))
    private readonly trackingService: TrackingService,
    @Inject(forwardRef(() => DispatchService))
    private readonly dispatchService: DispatchService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to /delivery: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from /delivery: ${client.id}`);
  }

  @SubscribeMessage('order:track')
  async handleOrderTrack(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    if (!data?.orderId) {
      return { error: 'orderId is required' };
    }

    const room = `order_${data.orderId}`;
    await client.join(room);
    this.logger.log(`Client ${client.id} joined tracking room ${room}`);

    try {
      const currentLocation = await this.trackingService.getLocationByOrderId(data.orderId);
      if (currentLocation) {
        client.emit('driver:location_current', currentLocation);
      }
    } catch {
      // No location yet, client will wait for live updates
    }

    return { success: true, room };
  }

  @SubscribeMessage('driver:join')
  async handleDriverJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: string },
  ) {
    if (!data?.driverId) {
      return { error: 'driverId is required' };
    }

    const room = `driver_${data.driverId}`;
    await client.join(room);
    this.logger.log(`Driver client ${client.id} joined dispatch room ${room}`);
    return { success: true, room };
  }

  @SubscribeMessage('driver:accept_trip')
  async handleDriverAcceptTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; driverId: string },
  ) {
    if (!data?.orderId || !data?.driverId) {
      return { error: 'orderId and driverId are required' };
    }

    try {
      return await this.dispatchService.acceptTrip(data.orderId, data.driverId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: msg };
    }
  }

  @SubscribeMessage('driver:reject_trip')
  async handleDriverRejectTrip(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; driverId: string; reason?: string },
  ) {
    if (!data?.orderId || !data?.driverId) {
      return { error: 'orderId and driverId are required' };
    }

    return await this.dispatchService.rejectTrip(data.orderId, data.driverId, data.reason);
  }

  @SubscribeMessage('driver:update_location')
  async handleDriverUpdateLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: UpdateDriverLocationDto,
  ) {
    try {
      const locationData = await this.trackingService.updateLocation(dto);
      const room = `order_${dto.orderId}`;
      this.server.to(room).emit('driver:location_updated', locationData);
      return { success: true, data: locationData };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error handling driver:update_location: ${msg}`);
      return { error: msg };
    }
  }

  broadcastLocation(orderId: string, locationData: DriverLocationData) {
    if (this.server) {
      const room = `order_${orderId}`;
      this.server.to(room).emit('driver:location_updated', locationData);
    }
  }

  sendTripOffer(driverId: string, offer: TripOfferPayload) {
    if (this.server) {
      const room = `driver_${driverId}`;
      this.server.to(room).emit('driver:trip_offer', offer);
    }
  }

  cancelTripOffer(driverId: string, orderId: string) {
    if (this.server) {
      const room = `driver_${driverId}`;
      this.server.to(room).emit('driver:trip_cancelled', { orderId });
    }
  }
}
