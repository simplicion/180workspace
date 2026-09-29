/**
 * TorExitSyncService
 * 
 * Periodically synchronizes the official Tor Project bulk exit node directory:
 * https://check.torproject.org/torbulkexitlist
 * 
 * Maintains an in-memory O(1) Set<string> of active Tor exit nodes for sub-millisecond
 * zero-latency edge evaluation without database queries.
 */

export interface TorSyncStats {
  count: number;
  lastSyncTime: Date | null;
  status: 'active' | 'syncing' | 'idle' | 'failed';
  lastError?: string;
}

export class TorExitSyncService {
  private static torExitNodes: Set<string> = new Set<string>();
  private static lastSyncTime: Date | null = null;
  private static status: 'active' | 'syncing' | 'idle' | 'failed' = 'idle';
  private static lastError?: string;
  private static syncInterval: any = null;

  // Initial seed of well-known high-volume Tor exit nodes for immediate zero-cold-start protection
  private static readonly INITIAL_SEED_NODES = [
    '185.220.101.4', '185.220.101.5', '185.220.101.6', '185.220.101.7',
    '185.220.101.8', '185.220.101.9', '185.220.101.10', '185.220.101.11',
    '185.220.101.12', '185.220.101.13', '185.220.101.14', '185.220.101.15',
    '185.220.100.240', '185.220.100.241', '185.220.100.242', '185.220.100.243',
    '185.220.100.244', '185.220.100.245', '185.220.100.246', '185.220.100.247',
    '185.220.100.248', '185.220.100.249', '185.220.100.250', '185.220.100.251',
    '185.220.100.252', '185.220.100.253', '185.220.100.254', '185.220.100.255',
    '185.220.102.4', '185.220.102.5', '185.220.102.6', '185.220.102.7',
    '185.220.102.8', '185.220.102.9', '185.220.103.4', '185.220.103.5',
    '171.25.193.20', '171.25.193.25', '171.25.193.77', '171.25.193.78',
    '192.42.116.16', '192.42.116.17', '192.42.116.18', '192.42.116.19',
    '199.249.230.64', '199.249.230.65', '199.249.230.66', '199.249.230.67',
    '199.249.230.68', '199.249.230.69', '199.249.230.70', '199.249.230.71',
    '23.129.64.100', '23.129.64.101', '23.129.64.102', '23.129.64.103',
    '23.129.64.104', '23.129.64.105', '23.129.64.106', '23.129.64.107',
    '109.70.100.18', '109.70.100.19', '109.70.100.20', '109.70.100.21',
    '104.244.72.70', '104.244.72.71', '104.244.72.72', '104.244.72.73',
    '51.15.43.205', '51.15.54.40', '51.15.67.142', '51.15.83.189',
    '162.247.74.200', '162.247.74.201', '162.247.74.202', '162.247.74.203',
    '162.247.74.204', '162.247.74.205', '162.247.74.206', '162.247.74.207',
    '193.32.127.18', '193.32.127.19', '193.32.127.20', '193.32.127.21'
  ];

  static {
    // Seed initial list immediately
    for (const ip of this.INITIAL_SEED_NODES) {
      this.torExitNodes.add(ip);
    }
    this.status = 'active';
    this.lastSyncTime = new Date();

    // Start background sync every 4 hours (14,400,000 ms)
    if (typeof setInterval !== 'undefined') {
      this.syncInterval = setInterval(() => {
        this.syncTorExitNodes().catch(() => {});
      }, 4 * 60 * 60 * 1000);
      if (this.syncInterval && typeof this.syncInterval.unref === 'function') {
        this.syncInterval.unref();
      }
    }
  }

  /**
   * Fetches latest Tor exit nodes from the official Tor Project directory
   */
  static async syncTorExitNodes(): Promise<TorSyncStats> {
    this.status = 'syncing';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch('https://check.torproject.org/torbulkexitlist', {
        signal: controller.signal,
        headers: {
          'User-Agent': '180workspace-TrafficDirector-TorSync/1.0'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Tor exit list returned HTTP ${response.status}`);
      }

      const text = await response.text();
      const lines = text.split('\n');
      const newNodes = new Set<string>();

      for (const rawLine of lines) {
        const ip = rawLine.trim();
        // Basic IPv4 validation
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
          newNodes.add(ip);
        }
      }

      if (newNodes.size > 50) {
        // Swap in the freshly synchronized set atomically
        this.torExitNodes = newNodes;
        this.lastSyncTime = new Date();
        this.status = 'active';
        this.lastError = undefined;
      } else {
        // Keep existing set if response was truncated
        this.status = 'active';
      }
    } catch (err: any) {
      clearTimeout(timeout);
      this.status = 'failed';
      this.lastError = err?.message || 'Failed to fetch Tor exit list';
      // Ensure seed nodes remain active on network failure
      if (this.torExitNodes.size === 0) {
        for (const ip of this.INITIAL_SEED_NODES) {
          this.torExitNodes.add(ip);
        }
      }
    }

    return this.getStats();
  }

  /**
   * Checks if an IP address is a known Tor exit node in O(1) time
   */
  static isTorExitNode(ip: string): boolean {
    if (!ip) return false;
    const cleanIp = ip.split(':')[0].trim();
    return this.torExitNodes.has(cleanIp);
  }

  /**
   * Returns synchronization diagnostics
   */
  static getStats(): TorSyncStats {
    return {
      count: this.torExitNodes.size,
      lastSyncTime: this.lastSyncTime,
      status: this.status,
      lastError: this.lastError
    };
  }

  /**
   * Add custom Tor IP for testing or manual overrides
   */
  static addNode(ip: string) {
    if (ip) this.torExitNodes.add(ip.trim());
  }
}
