import { Injectable } from "@nestjs/common";
import { realtimeEvents } from "@cashflow/shared";
import { Server } from "socket.io";

@Injectable()
export class GamesRealtimeService {
  private server: Server | null = null;

  bindServer(server: Server) {
    this.server = server;
  }

  broadcastSnapshot(gameId: string, snapshot: unknown) {
    this.server?.to(gameId).emit(realtimeEvents.stateUpdate, snapshot);
  }

  broadcastChatMessage(gameId: string, message: unknown) {
    this.server?.to(gameId).emit(realtimeEvents.chatMessage, message);
  }

  broadcastAction(
    gameId: string,
    result: {
      snapshot: unknown;
      events: Array<{ type: string; payload: Record<string, unknown> }>;
    }
  ) {
    if (!this.server) return;
    for (const event of result.events) {
      if (event.type === realtimeEvents.stateUpdate) continue;
      this.server.to(gameId).emit(event.type, event.payload);
    }
    this.broadcastSnapshot(gameId, result.snapshot);
  }
}
