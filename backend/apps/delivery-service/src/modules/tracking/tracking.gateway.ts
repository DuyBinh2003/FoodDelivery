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
}
