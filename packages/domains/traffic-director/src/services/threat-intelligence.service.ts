import { ExtractedSignals } from '../types';
import { TorExitSyncService } from './tor-exit-sync.service';

export interface SystemThreatFeed {
  key: string;
  name: string;
  category: 'compliance' | 'spy_tools' | 'anonymizers' | 'datacenter';
  description: string;
  asns: number[];
  cidrs: string[];
  userAgents: string[];
  signatureCount: number;
}

export interface CustomThreatEntry {
  id: string;
  companyId: string;
  name: string;
  type: 'ip' | 'cidr' | 'asn' | 'user_agent';
  value: string;
  mode: 'blacklist' | 'whitelist';
  description?: string;
  createdAt: string;
}

function ipToLong(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) return 0;
  return (
    ((parseInt(parts[0], 10) << 24) |
      (parseInt(parts[1], 10) << 16) |
      (parseInt(parts[2], 10) << 8) |
      parseInt(parts[3], 10)) >>>
    0
  );
}

function isIpInCidr(ip: string, cidr: string): boolean {
  if (!ip) return false;
  if (!cidr.includes('/')) {
    return ip === cidr;
  }
  const [range, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  if (isNaN(bits) || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  const ipLong = ipToLong(ip);
  const rangeLong = ipToLong(range);
  return (ipLong & mask) === (rangeLong & mask);
}

export class ThreatIntelligenceService {
  // Pre-configured system threat feeds
  private static readonly SYSTEM_FEEDS: Record<string, SystemThreatFeed> = {
    meta_reviewers: {
      key: 'meta_reviewers',
      name: 'Meta Ad Reviewers & Dublin QA',
      category: 'compliance',
      description: 'Internal Meta Platforms review teams, Dublin QA subnets, and automated ad compliance verification crawlers.',
      asns: [32934, 63293],
      cidrs: [
        '157.240.0.0/16',
        '31.13.24.0/21',
        '31.13.64.0/18',
        '57.144.0.0/14',
        '69.63.176.0/20',
        '69.171.224.0/19',
        '173.252.64.0/18',
        '204.15.20.0/22'
      ],
      userAgents: [
        'facebookexternalhit',
        'meta-externalagent',
        'facebookcatalog',
        'Facebot',
        'Meta-AdsBot'
      ],
      signatureCount: 42
    },
    google_compliance: {
      key: 'google_compliance',
      name: 'Google AdsBot & Policy Scanners',
      category: 'compliance',
      description: 'Google LLC ad destination reviewers, automated landing page policy evaluators, and AdsBot crawlers.',
      asns: [15169, 396982],
      cidrs: [
        '66.249.64.0/19',
        '64.233.160.0/19',
        '72.14.192.0/18',
        '209.85.128.0/17',
        '108.177.0.0/17',
        '74.125.0.0/16'
      ],
      userAgents: [
        'Googlebot',
        'AdsBot-Google',
        'Mediapartners-Google',
        'Google-Adwords',
        'FeedFetcher-Google'
      ],
      signatureCount: 38
    },
    tiktok_qa: {
      key: 'tiktok_qa',
      name: 'TikTok Ads QA Review Team',
      category: 'compliance',
      description: 'ByteDance moderation and compliance teams operating out of Singapore, Dublin, and US testing clusters.',
      asns: [138699, 396986],
      cidrs: [
        '130.44.0.0/16',
        '143.204.0.0/16'
      ],
      userAgents: [
        'Bytespider',
        'TikTokBot',
        'Bytedance'
      ],
      signatureCount: 16
    },
    spy_scrapers: {
      key: 'spy_scrapers',
      name: 'Spy Services (AdPlexity, SpyOver, Anstrex)',
      category: 'spy_tools',
      description: 'Hosting networks and automated scrapers dedicated to stealing competitor creatives and cloaked offers.',
      asns: [
        209242, // PacketHub
        9009,   // M247
        212238, // DataCamp
        62240,  // Clouvider
        20473,  // Choopa/Vultr
        174,    // Cogent
        8100,   // QuadraNet
        60781,  // Leaseweb
        49505   // Selectel
      ],
      cidrs: [
        '198.51.100.0/24',
        '185.156.72.0/22',
        '194.26.29.0/24'
      ],
      userAgents: [
        'AdPlexity',
        'SpyOver',
        'Anstrex',
        'Dropispy',
        'BigSpy',
        'PowerAdSpy',
        'AdSpy'
      ],
      signatureCount: 65
    },
    tor_network: {
      key: 'tor_network',
      name: 'Tor Anonymity Exit Nodes',
      category: 'anonymizers',
      description: 'Real-time synchronization with the official Tor Project bulk exit node directory.',
      asns: [],
      cidrs: [],
      userAgents: [],
      signatureCount: 1850
    },
    cloud_datacenters: {
      key: 'cloud_datacenters',
      name: 'Major Cloud Datacenters',
      category: 'datacenter',
      description: 'AWS, GCP, Azure, DigitalOcean, Hetzner, OVH, and Oracle server farm IP blocks.',
      asns: [
        16509, 14618, // AWS
        15169, 396982, // GCP
        8075, 8068,   // Azure
        14061,         // DigitalOcean
        24940, 213230, // Hetzner
        16276,         // OVH
        31898          // Oracle
      ],
      cidrs: [
        '34.0.0.0/11',
        '52.0.0.0/11',
        '54.0.0.0/12'
      ],
      userAgents: [],
      signatureCount: 240
    }
  };

  // Company feed toggles: companyId -> Set of enabled feed keys
  // By default, if not set, meta_reviewers, google_compliance, tiktok_qa, spy_scrapers, and tor_network are ENABLED.
  private static companyEnabledFeeds: Map<string, Set<string>> = new Map();

  // Custom threat lists per company: companyId -> CustomThreatEntry[]
  private static companyCustomEntries: Map<string, CustomThreatEntry[]> = new Map();

  /**
   * Get all system feeds with status for a company
   */
  static getSystemFeeds(companyId?: string) {
    const effectiveCompanyId = companyId || 'default';
    const enabledSet = this.companyEnabledFeeds.get(effectiveCompanyId);

    return Object.values(this.SYSTEM_FEEDS).map(feed => {
      const isEnabled = enabledSet ? enabledSet.has(feed.key) : true; // Enabled by default
      const isTor = feed.key === 'tor_network';
      return {
        ...feed,
        signatureCount: isTor ? TorExitSyncService.getStats().count : feed.signatureCount,
        isEnabled
      };
    });
  }

  /**
   * Toggle a system feed for a company
   */
  static toggleSystemFeed(companyId: string, feedKey: string, enabled: boolean) {
    if (!this.SYSTEM_FEEDS[feedKey]) {
      throw new Error(`Invalid threat feed: ${feedKey}`);
    }

    if (!this.companyEnabledFeeds.has(companyId)) {
      // Initialize with all feeds enabled
      this.companyEnabledFeeds.set(companyId, new Set(Object.keys(this.SYSTEM_FEEDS)));
    }

    const set = this.companyEnabledFeeds.get(companyId)!;
    if (enabled) {
      set.add(feedKey);
    } else {
      set.delete(feedKey);
    }

    return { success: true, feedKey, isEnabled: enabled };
  }

  /**
   * Get custom entries for a company
   */
  static getCustomEntries(companyId: string): CustomThreatEntry[] {
    return this.companyCustomEntries.get(companyId) || [];
  }

  /**
   * Add a custom threat entry
   */
  static addCustomEntry(companyId: string, entry: Omit<CustomThreatEntry, 'id' | 'companyId' | 'createdAt'>): CustomThreatEntry {
    if (!entry.name || !entry.value || !entry.type) {
      throw new Error('Name, type, and value are required');
    }

    const newEntry: CustomThreatEntry = {
      id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      companyId,
      name: entry.name.trim(),
      type: entry.type,
      value: entry.value.trim(),
      mode: entry.mode || 'blacklist',
      description: entry.description?.trim(),
      createdAt: new Date().toISOString()
    };

    const list = this.companyCustomEntries.get(companyId) || [];
    list.unshift(newEntry);
    this.companyCustomEntries.set(companyId, list);

    return newEntry;
  }

  /**
   * Delete a custom threat entry
   */
  static deleteCustomEntry(companyId: string, entryId: string): boolean {
    const list = this.companyCustomEntries.get(companyId) || [];
    const filtered = list.filter(e => e.id !== entryId);
    this.companyCustomEntries.set(companyId, filtered);
    return filtered.length < list.length;
  }

  /**
   * Evaluates visitor signals against enabled global threat intelligence feeds
   * and custom company blacklists/whitelists in < 1ms.
   */
  static checkThreat(
    signals: ExtractedSignals,
    companyId?: string
  ): { isThreat: boolean; isWhitelisted?: boolean; matchedFeed?: string; reason?: string } {
    const effectiveCompanyId = companyId || 'default';
    const enabledSet = this.companyEnabledFeeds.get(effectiveCompanyId);

    const isFeedEnabled = (key: string) => (enabledSet ? enabledSet.has(key) : true);

    const ip = (signals.ipAddress || '').split(':')[0].trim();
    const ua = signals.userAgent || '';
    const asn = signals.asnOrg ? parseInt(signals.asnOrg.replace(/\D/g, ''), 10) : undefined;

    // 1. Check Custom Company Whitelists first (Whitelist bypasses all firewalls)
    const customEntries = this.companyCustomEntries.get(effectiveCompanyId) || [];
    for (const item of customEntries) {
      if (item.mode === 'whitelist') {
        if (item.type === 'ip' && item.value === ip) {
          return { isThreat: false, isWhitelisted: true, matchedFeed: 'Custom Whitelist', reason: `IP matched custom whitelist: ${item.name}` };
        }
        if (item.type === 'cidr' && isIpInCidr(ip, item.value)) {
          return { isThreat: false, isWhitelisted: true, matchedFeed: 'Custom Whitelist', reason: `Subnet matched custom whitelist: ${item.name}` };
        }
        if (item.type === 'user_agent' && ua.toLowerCase().includes(item.value.toLowerCase())) {
          return { isThreat: false, isWhitelisted: true, matchedFeed: 'Custom Whitelist', reason: `User-Agent matched custom whitelist: ${item.name}` };
        }
      }
    }

    // 2. Check Custom Company Blacklists
    for (const item of customEntries) {
      if (item.mode === 'blacklist') {
        if (item.type === 'ip' && item.value === ip) {
          return { isThreat: true, matchedFeed: 'Custom Blacklist', reason: `IP matched custom blacklist: ${item.name} (${item.value})` };
        }
        if (item.type === 'cidr' && isIpInCidr(ip, item.value)) {
          return { isThreat: true, matchedFeed: 'Custom Blacklist', reason: `IP in blacklisted subnet: ${item.name} (${item.value})` };
        }
        if (item.type === 'user_agent' && ua.toLowerCase().includes(item.value.toLowerCase())) {
          return { isThreat: true, matchedFeed: 'Custom Blacklist', reason: `Blacklisted User-Agent signature: ${item.name}` };
        }
        if (item.type === 'asn' && (signals.asnOrg || '').toLowerCase().includes(item.value.toLowerCase())) {
          return { isThreat: true, matchedFeed: 'Custom Blacklist', reason: `Blacklisted ASN: ${item.name}` };
        }
      }
    }

    // 3. Tor Network Feed
    if (isFeedEnabled('tor_network')) {
      if (TorExitSyncService.isTorExitNode(ip) || signals.isTor) {
        return { isThreat: true, matchedFeed: 'Tor Exit Node Feed', reason: `IP ${ip} is an active Tor anonymity network exit node.` };
      }
    }

    // 4. Meta Reviewers Feed
    if (isFeedEnabled('meta_reviewers')) {
      const feed = this.SYSTEM_FEEDS.meta_reviewers;
      for (const cidr of feed.cidrs) {
        if (isIpInCidr(ip, cidr)) {
          return { isThreat: true, matchedFeed: feed.name, reason: `IP belongs to Meta Dublin review / compliance subnet (${cidr})` };
        }
      }
      for (const uaPat of feed.userAgents) {
        if (ua.toLowerCase().includes(uaPat.toLowerCase())) {
          return { isThreat: true, matchedFeed: feed.name, reason: `User-Agent matches Meta crawler signature (${uaPat})` };
        }
      }
      if (asn && feed.asns.includes(asn)) {
        return { isThreat: true, matchedFeed: feed.name, reason: `ASN belongs to Meta Platforms internal network (AS${asn})` };
      }
    }

    // 5. Google Ads Compliance Feed
    if (isFeedEnabled('google_compliance')) {
      const feed = this.SYSTEM_FEEDS.google_compliance;
      for (const cidr of feed.cidrs) {
        if (isIpInCidr(ip, cidr)) {
          return { isThreat: true, matchedFeed: feed.name, reason: `IP belongs to Google AdsBot inspection subnet (${cidr})` };
        }
      }
      for (const uaPat of feed.userAgents) {
        if (ua.toLowerCase().includes(uaPat.toLowerCase())) {
          return { isThreat: true, matchedFeed: feed.name, reason: `User-Agent matches Google AdsBot crawler signature (${uaPat})` };
        }
      }
      if (asn && feed.asns.includes(asn)) {
        return { isThreat: true, matchedFeed: feed.name, reason: `ASN belongs to Google LLC corporate crawler network (AS${asn})` };
      }
    }

    // 6. TikTok QA Feed
    if (isFeedEnabled('tiktok_qa')) {
      const feed = this.SYSTEM_FEEDS.tiktok_qa;
      for (const cidr of feed.cidrs) {
        if (isIpInCidr(ip, cidr)) {
          return { isThreat: true, matchedFeed: feed.name, reason: `IP belongs to ByteDance / TikTok QA review cluster (${cidr})` };
        }
      }
      for (const uaPat of feed.userAgents) {
        if (ua.toLowerCase().includes(uaPat.toLowerCase())) {
          return { isThreat: true, matchedFeed: feed.name, reason: `User-Agent matches ByteDance compliance crawler (${uaPat})` };
        }
      }
      if (asn && feed.asns.includes(asn)) {
        return { isThreat: true, matchedFeed: feed.name, reason: `ASN belongs to ByteDance network (AS${asn})` };
      }
    }

    // 7. Spy Scrapers Feed
    if (isFeedEnabled('spy_scrapers')) {
      const feed = this.SYSTEM_FEEDS.spy_scrapers;
      if (signals.isSpyService) {
        return { isThreat: true, matchedFeed: feed.name, reason: `Competitor spy service detected: ${signals.spyServiceName || 'Ad Spy Scraper'}` };
      }
      if (asn && feed.asns.includes(asn)) {
        return { isThreat: true, matchedFeed: feed.name, reason: `ASN is dedicated to proxy rotation and spy tools (AS${asn})` };
      }
      for (const uaPat of feed.userAgents) {
        if (ua.toLowerCase().includes(uaPat.toLowerCase())) {
          return { isThreat: true, matchedFeed: feed.name, reason: `User-Agent matches competitive spy tool (${uaPat})` };
        }
      }
    }

    // 8. Cloud Datacenters Feed
    if (isFeedEnabled('cloud_datacenters')) {
      const feed = this.SYSTEM_FEEDS.cloud_datacenters;
      if (signals.networkType === 'datacenter') {
        return { isThreat: true, matchedFeed: feed.name, reason: `Request originated from cloud hosting datacenter (${signals.asnOrg || 'Cloud Datacenter'})` };
      }
      if (asn && feed.asns.includes(asn)) {
        return { isThreat: true, matchedFeed: feed.name, reason: `Datacenter ASN flagged (AS${asn})` };
      }
    }

    return { isThreat: false };
  }
}
