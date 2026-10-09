import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: 'admin', cors: { origin: '*' } })
export class AdminGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    // In production, verify JWT from client.handshake.auth.token
    // if (!isValid(token)) client.disconnect();
    client.join('admin_notifications');
    console.log(`Admin client connected: ${client.id}`);
  }
}
