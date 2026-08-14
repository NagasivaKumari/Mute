import { io, Socket } from 'socket.io-client';

export type WsEventHandler = (payload: unknown) => void;

export class SentinelWebSocket {
  private socket: Socket | null = null;
  private handlers = new Map<string, Set<WsEventHandler>>();

  connect(apiUrl: string, token: string): void {
    const baseUrl = apiUrl.replace(/\/v1\/?$/, '');
    this.socket = io(baseUrl, {
      path: '/ws',
      query: { token },
      transports: ['websocket'],
    });

    for (const [event, set] of this.handlers) {
      for (const handler of set) {
        this.socket.on(event, handler);
      }
    }
  }

  on(event: string, handler: WsEventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    this.socket?.on(event, handler);
  }

  off(event: string, handler: WsEventHandler): void {
    this.handlers.get(event)?.delete(handler);
    this.socket?.off(event, handler);
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }
}
