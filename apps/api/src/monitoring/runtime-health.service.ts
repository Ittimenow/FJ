import { Injectable } from "@nestjs/common";

@Injectable()
export class RuntimeHealthService {
  private readonly startedAt = new Date();
  private redis = {
    configured: false,
    connected: false,
    error: null as string | null
  };

  setRedisState(state: { configured: boolean; connected: boolean; error?: string | null }) {
    this.redis = {
      configured: state.configured,
      connected: state.connected,
      error: state.error ?? null
    };
  }

  snapshot() {
    return {
      startedAt: this.startedAt.toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      memory: {
        rssMb: roundMb(process.memoryUsage().rss),
        heapUsedMb: roundMb(process.memoryUsage().heapUsed)
      },
      redis: this.redis
    };
  }
}

function roundMb(bytes: number) {
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}
