import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, path: '/ws' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly orgRooms = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    const token =
      (client.handshake.query.token as string) ??
      (client.handshake.auth?.token as string);

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      }) as { orgId: string };

      const orgId = payload.orgId;
      client.join(`org:${orgId}`);

      if (!this.orgRooms.has(orgId)) {
        this.orgRooms.set(orgId, new Set());
      }
      this.orgRooms.get(orgId)!.add(client.id);
      this.logger.log(`Client ${client.id} joined org:${orgId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    for (const [, clients] of this.orgRooms) {
      clients.delete(client.id);
    }
  }

  emitApprovalCreated(
    orgId: string,
    payload: { approvalId: string; action: string; resource: string; agentId: string },
  ): void {
    this.server.to(`org:${orgId}`).emit('approval:created', payload);
  }

  emitApprovalResolved(
    orgId: string,
    payload: { approvalId: string; status: string },
  ): void {
    this.server.to(`org:${orgId}`).emit('approval:resolved', payload);
  }

  emitAuditCreated(
    orgId: string,
    payload: { auditId: string; action: string; decision: string; riskLevel?: string },
  ): void {
    this.server.to(`org:${orgId}`).emit('audit:created', payload);
  }
}
