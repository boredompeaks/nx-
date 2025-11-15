// TURN Server Selection and Management

import { TurnServer } from './types';
import { probeServerLatency, exponentialBackoff } from './utils';
import { TURN_PROBE_TIMEOUT, PROBE_CACHE_DURATION } from './constants';

export class TurnSelector {
  private servers: TurnServer[];
  private cachedBest: TurnServer | null = null;
  private probeTimeout: number;
  private lastProbeTime: number = 0;
  private readonly PROBE_CACHE_DURATION = 300000; // 5 minutes

  constructor(servers: TurnServer[], probeTimeout: number = TURN_PROBE_TIMEOUT) {
    if (!servers || servers.length === 0) {
      throw new Error('TURN servers array cannot be empty');
    }
    
    // Validate server URLs
    servers.forEach(server => {
      if (!server.urls || server.urls.length === 0) {
        throw new Error('TURN server must have at least one URL');
      }
    });
    
    this.servers = servers.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    this.probeTimeout = Math.max(1000, probeTimeout); // Minimum 1 second timeout
  }

  async selectOptimalServer(): Promise<TurnServer> {
    const now = Date.now();
    
    // Re-probe if cache expired
    if (this.cachedBest && (now - this.lastProbeTime < this.PROBE_CACHE_DURATION)) {
      return this.cachedBest;
    }

    const probePromises = this.servers.map(async (server) => {
      const hostname = this.extractHostname(server.urls[0]);
      if (!hostname) return { server, latency: Infinity };

      const probeUrl = `https://${hostname}`;
      const latency = await probeServerLatency(probeUrl, this.probeTimeout);
      
      return { server, latency };
    });

    try {
      const results = await Promise.all(probePromises);
      const best = results.reduce((prev, curr) => 
        curr.latency < prev.latency ? curr : prev
      );

      this.cachedBest = best.server;
      this.lastProbeTime = now;
      
      return best.server;
    } catch (error) {
      console.error('TURN server selection failed:', error);
      // Return first server as fallback
      return this.servers[0];
    }
  }

  private extractHostname(turnUrl: string): string | null {
    try {
      if (!turnUrl || typeof turnUrl !== 'string') {
        return null;
      }
      
      const match = turnUrl.match(/turn:([^:?]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  getNextFallback(currentServer: TurnServer): TurnServer | null {
    if (!currentServer) {
      return this.servers[0] || null;
    }
    
    const currentIndex = this.servers.indexOf(currentServer);
    if (currentIndex === -1 || currentIndex === this.servers.length - 1) {
      return null;
    }
    return this.servers[currentIndex + 1];
  }

  clearCache(): void {
    this.cachedBest = null;
    this.lastProbeTime = 0;
  }

  getServerCount(): number {
    return this.servers.length;
  }

  isHealthy(): boolean {
    return this.servers.length > 0;
  }
}