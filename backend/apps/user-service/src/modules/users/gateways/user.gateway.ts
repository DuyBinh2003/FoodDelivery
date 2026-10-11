import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: 'user', cors: { origin: '*' } })
export class UserGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const userId = (client.handshake.query?.userId as string) || (client.handshake.auth?.userId as string);
    if (userId) {
      client.join(`user_${userId}`);
      console.log(`[UserGateway] User connected: ${client.id} joined room user_${userId}`);
    } else {
      console.log(`[UserGateway] Anonymous client connected: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`[UserGateway] Client disconnected: ${client.id}`);
  }

  sendToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user_${userId}`).emit(event, payload);
    console.log(`[UserGateway] Emitted event "${event}" to room user_${userId}`);
  }
}
