import { prisma } from '@workspace/db';
import * as dns from 'dns';

export interface DnsRecord {
  type: 'A' | 'CNAME' | 'TXT';
  name: string;
  value: string;
  ttl?: number;
  description: string;
  status?: 'valid' | 'pending' | 'failed';
}

export interface DomainConfig {
  domain: string;
  type: 'ADVERTISING_WEBSITE' | 'TRAFFIC_LINK' | 'COMPANY_PROFILE';
  targetId: string;
  companyId?: string;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'FAILED' | 'REMOVED';
  sslStatus: 'PENDING' | 'ACTIVE' | 'FAILED';
  isApex: boolean;
  records: DnsRecord[];
  verifiedAt?: string | null;
  lastCheckedAt?: string | null;
}

export class DomainsService {
  private static VERCEL_ANYCAST_IP = '76.76.21.21';
  private static VERCEL_CNAME_TARGET = 'cname.vercel-dns.com';

  /**
   * Normalizes domain name (lowercase, trim, strip protocol and paths)
   */
  static normalizeDomain(input: string): string {
    if (!input) return '';
    let domain = input.trim().toLowerCase();
    domain = domain.replace(/^https?:\/\//i, '');
    domain = domain.replace(/\/.*$/, '');
    domain = domain.replace(/:\d+$/, '');
    return domain;
  }

  /**
   * Checks if domain is an Apex domain (e.g. "mybrand.com") vs a Subdomain ("go.mybrand.com")
   */
  static isApexDomain(domain: string): boolean {
    const clean = this.normalizeDomain(domain);
    const parts = clean.split('.').filter(Boolean);
    const secondLevelTlds = ['co.uk', 'com.au', 'co.nz', 'co.za', 'com.br', 'co.jp', 'com.sg'];
    const matchedSecondLevel = secondLevelTlds.some(tld => clean.endsWith(`.${tld}`));

    if (matchedSecondLevel) {
      return parts.length === 3;
    }
    return parts.length <= 2;
  }

  /**
   * Calculates required DNS records for a given custom domain
   */
  static calculateRequiredRecords(domain: string, verificationToken?: string): DnsRecord[] {
    const clean = this.normalizeDomain(domain);
    const isApex = this.isApexDomain(clean);

    if (isApex) {
      const records: DnsRecord[] = [
        {
          type: 'A',
          name: '@',
          value: this.VERCEL_ANYCAST_IP,
          ttl: 3600,
          description: 'Points your apex domain to the edge server routing network'
        },
        {
          type: 'CNAME',
          name: 'www',
          value: this.VERCEL_CNAME_TARGET,
          ttl: 3600,
          description: 'Ensures www.' + clean + ' resolves seamlessly to your website/link'
        }
      ];

      if (verificationToken) {
        records.push({
          type: 'TXT',
          name: '_vercel',
          value: verificationToken,
          ttl: 3600,
          description: 'Domain ownership verification record'
        });
      }

      return records;
    } else {
      // Subdomain (e.g. "go.mybrand.com" -> host: "go")
      const subHost = clean.split('.')[0];
      return [
        {
          type: 'CNAME',
          name: subHost,
          value: this.VERCEL_CNAME_TARGET,
          ttl: 3600,
          description: `Routes traffic for ${clean} to the edge platform`
        }
      ];
    }
  }

  /**
   * Registers a domain in 180workspace and initiates verification
   */
  static async addDomain(
    companyId: string,
    params: {
      domain: string;
      type: 'ADVERTISING_WEBSITE' | 'TRAFFIC_LINK' | 'COMPANY_PROFILE';
      targetId: string;
    }
  ): Promise<{ success: boolean; data: DomainConfig; message: string }> {
    const cleanDomain = this.normalizeDomain(params.domain);
    if (!cleanDomain || cleanDomain.length < 4 || !cleanDomain.includes('.')) {
      throw new Error('Invalid domain name provided.');
    }

    // Check if domain is already registered
    const existing = await prisma.domainRegistry.findUnique({
      where: { domain: cleanDomain }
    });

    if (existing && existing.companyId && existing.companyId !== companyId) {
      throw new Error('This domain is already connected to another organization.');
    }

    const isApex = this.isApexDomain(cleanDomain);
    const verificationToken = `vc-domain-verify=${cleanDomain},${companyId.slice(0, 8)}`;
    const requiredRecords = this.calculateRequiredRecords(cleanDomain, verificationToken);

    // Call Vercel Custom Domains API if token is present
    let vercelData: any = null;
    if (process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID) {
      try {
        const vercelRes = await fetch(
          `https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: cleanDomain })
          }
        );
        vercelData = await vercelRes.json();
      } catch (err) {
        console.warn('[DomainsService] Vercel API registration warning:', err);
      }
    }

    // Upsert into DomainRegistry
    const registry = await prisma.domainRegistry.upsert({
      where: { domain: cleanDomain },
      update: {
        type: params.type,
        targetId: params.targetId,
        companyId
      },
      create: {
        domain: cleanDomain,
        type: params.type,
        targetId: params.targetId,
        companyId
      }
    });

    // Update target model customDomain reference
    await this.syncTargetCustomDomain(params.type, params.targetId, cleanDomain);

    const initialStatus = vercelData?.verified ? 'ACTIVE' : 'PENDING_VERIFICATION';
    const initialSslStatus = vercelData?.verified ? 'ACTIVE' : 'PENDING';

    return {
      success: true,
      data: {
        domain: registry.domain,
        type: registry.type as any,
        targetId: registry.targetId,
        companyId: registry.companyId || undefined,
        status: ((registry as any).status || initialStatus) as any,
        sslStatus: ((registry as any).sslStatus || initialSslStatus) as any,
        isApex,
        records: requiredRecords,
        verifiedAt: (registry as any).verifiedAt ? (registry as any).verifiedAt.toISOString() : null,
        lastCheckedAt: new Date().toISOString()
      },
      message: 'Domain registered successfully. Please configure the required DNS records.'
    };
  }

  /**
   * Verifies DNS propagation for a domain
   */
  static async verifyDomain(
    companyId: string,
    domain: string
  ): Promise<{
    success: boolean;
    verified: boolean;
    status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'FAILED';
    sslStatus: 'ACTIVE' | 'PENDING' | 'FAILED';
    records: DnsRecord[];
    diagnostics: {
      message: string;
      testedAt: string;
      details?: any;
    };
  }> {
    const cleanDomain = this.normalizeDomain(domain);
    const registry = await prisma.domainRegistry.findUnique({
      where: { domain: cleanDomain }
    });

    if (!registry) {
      throw new Error(`Domain "${cleanDomain}" is not registered.`);
    }

    const isApex = this.isApexDomain(cleanDomain);
    const verificationToken = `vc-domain-verify=${cleanDomain},${(companyId || '').slice(0, 8)}`;
    const requiredRecords = this.calculateRequiredRecords(cleanDomain, verificationToken);

    let isDnsValid = false;
    let isVercelVerified = false;
    const details: Record<string, any> = {};

    // 1. Check Vercel API if configured
    if (process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID) {
      try {
        const verifyRes = await fetch(
          `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${cleanDomain}/verify`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`
            }
          }
        );
        const vData = await verifyRes.json();
        if (vData?.verified) {
          isVercelVerified = true;
          isDnsValid = true;
        }
        details.vercel = vData;
      } catch (err) {
        console.warn('[DomainsService] Vercel verify API error:', err);
      }
    }

    // 2. Perform live DNS query via Node.js dns resolver
    try {
      if (isApex) {
        const aRecords = await dns.promises.resolve4(cleanDomain).catch(() => []);
        details.resolvedA = aRecords;
        if (aRecords.includes(this.VERCEL_ANYCAST_IP)) {
          isDnsValid = true;
        }
      } else {
        const cnameRecords = await dns.promises.resolveCname(cleanDomain).catch(() => []);
        details.resolvedCname = cnameRecords;
        if (cnameRecords.some(r => r.includes('vercel-dns') || r.includes('180workspace'))) {
          isDnsValid = true;
        }
      }
    } catch (dnsErr) {
      details.dnsError = String(dnsErr);
    }

    // 3. In local development or mock environments, simulate successful validation
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL_API_TOKEN) {
      isDnsValid = true;
      isVercelVerified = true;
      details.mock = 'Local development auto-verification enabled';
    }

    const newStatus = isDnsValid ? 'ACTIVE' : 'PENDING_VERIFICATION';
    const newSslStatus = isDnsValid ? 'ACTIVE' : 'PENDING';

    try {
      await prisma.domainRegistry.update({
        where: { domain: cleanDomain },
        data: {
          type: registry.type,
          targetId: registry.targetId,
          companyId: registry.companyId
        }
      });
    } catch (updateErr) {
      console.warn('[DomainsService] DomainRegistry update notice:', updateErr);
    }

    if (isDnsValid) {
      await this.syncTargetCustomDomain(registry.type, registry.targetId, cleanDomain);
    }

    // Update records status
    const evaluatedRecords = requiredRecords.map(r => ({
      ...r,
      status: (isDnsValid ? 'valid' : 'pending') as 'valid' | 'pending' | 'failed'
    }));

    return {
      success: true,
      verified: isDnsValid,
      status: newStatus as any,
      sslStatus: newSslStatus as any,
      records: evaluatedRecords,
      diagnostics: {
        message: isDnsValid
          ? 'DNS records are successfully configured and SSL is active.'
          : 'DNS records are not resolving yet. DNS propagation may take 5–15 minutes.',
        testedAt: new Date().toISOString(),
        details
      }
    };
  }

  /**
   * Retrieves domain details and current verification status
   */
  static async getDomainStatus(companyId: string, domain: string): Promise<DomainConfig | null> {
    const cleanDomain = this.normalizeDomain(domain);
    const registry = await prisma.domainRegistry.findUnique({
      where: { domain: cleanDomain }
    });

    if (!registry) return null;

    const records = (registry.verificationData as any) || this.calculateRequiredRecords(cleanDomain);

    return {
      domain: registry.domain,
      type: registry.type as any,
      targetId: registry.targetId,
      companyId: registry.companyId || undefined,
      status: registry.status as any,
      sslStatus: registry.sslStatus as any,
      isApex: (registry as any).isApex ?? this.isApexDomain(cleanDomain),
      records,
      verifiedAt: registry.verifiedAt ? registry.verifiedAt.toISOString() : null,
      lastCheckedAt: registry.lastCheckedAt ? registry.lastCheckedAt.toISOString() : null
    };
  }

  /**
   * Removes a connected domain
   */
  static async removeDomain(companyId: string, domain: string): Promise<{ success: boolean; message: string }> {
    const cleanDomain = this.normalizeDomain(domain);
    const registry = await prisma.domainRegistry.findUnique({
      where: { domain: cleanDomain }
    });

    if (!registry) {
      return { success: true, message: 'Domain already removed.' };
    }

    // Call Vercel API to remove domain from project if configured
    if (process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID) {
      try {
        await fetch(
          `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${cleanDomain}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`
            }
          }
        );
      } catch (err) {
        console.warn('[DomainsService] Vercel API delete warning:', err);
      }
    }

    // Unset customDomain on target entity
    await this.syncTargetCustomDomain(registry.type, registry.targetId, null);

    // Delete record from DomainRegistry
    await prisma.domainRegistry.delete({
      where: { domain: cleanDomain }
    });

    return {
      success: true,
      message: 'Custom domain removed successfully.'
    };
  }

  private static RESERVED_SUBDOMAINS = new Set([
    'api', 'app', 'admin', 'dashboard', 'auth', 'login', 'signup',
    'billing', 'docs', 'help', 'support', 'mail', 'ftp', 'status',
    'ws', 'cdn', 'static', 'assets', 'system', 'root', 'www', 'sites'
  ]);

  /**
   * Validates and checks live availability of a platform subdomain slug
   */
  static async checkSubdomainAvailability(
    slug: string,
    options?: { targetId?: string; companyId?: string; rootDomain?: string }
  ): Promise<{
    available: boolean;
    slug: string;
    fullDomain: string;
    reason?: string;
  }> {
    const cleanSlug = (slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const root = options?.rootDomain || process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_MAIN_DOMAIN || (process.env.NODE_ENV === 'development' ? 'localhost' : '180workspace.com');
    const fullDomain = `${cleanSlug}.${root}`;

    if (!cleanSlug || cleanSlug.length < 2) {
      return {
        available: false,
        slug: cleanSlug,
        fullDomain,
        reason: 'Subdomain must be at least 2 characters long.'
      };
    }

    if (cleanSlug.length > 63) {
      return {
        available: false,
        slug: cleanSlug,
        fullDomain,
        reason: 'Subdomain cannot exceed 63 characters.'
      };
    }

    if (cleanSlug.startsWith('-') || cleanSlug.endsWith('-')) {
      return {
        available: false,
        slug: cleanSlug,
        fullDomain,
        reason: 'Subdomain cannot start or end with a hyphen.'
      };
    }

    if (this.RESERVED_SUBDOMAINS.has(cleanSlug)) {
      return {
        available: false,
        slug: cleanSlug,
        fullDomain,
        reason: `"${cleanSlug}" is a reserved system subdomain.`
      };
    }

    // Check database domain registry
    const existing = await prisma.domainRegistry.findUnique({
      where: { domain: fullDomain }
    });

    if (existing) {
      // If it's already assigned to this exact target resource, it's available for this resource
      if (options?.targetId && existing.targetId === options.targetId) {
        return {
          available: true,
          slug: cleanSlug,
          fullDomain
        };
      }
      return {
        available: false,
        slug: cleanSlug,
        fullDomain,
        reason: `"${fullDomain}" is already taken.`
      };
    }

    // Also check if any website has this as its slug or customDomain
    const existingWebsite = await prisma.website.findFirst({
      where: {
        OR: [
          { slug: cleanSlug },
          { customDomain: fullDomain }
        ]
      }
    });

    if (existingWebsite && (!options?.targetId || existingWebsite.id !== options.targetId)) {
      return {
        available: false,
        slug: cleanSlug,
        fullDomain,
        reason: `"${fullDomain}" is already taken.`
      };
    }

    // Check if any TrafficLink has this custom domain
    const existingLink = await prisma.trafficLink.findFirst({
      where: { customDomain: fullDomain }
    });

    if (existingLink && (!options?.targetId || existingLink.id !== options.targetId)) {
      return {
        available: false,
        slug: cleanSlug,
        fullDomain,
        reason: `"${fullDomain}" is already taken.`
      };
    }

    return {
      available: true,
      slug: cleanSlug,
      fullDomain
    };
  }

  /**
   * Internal helper to sync customDomain on Website, TrafficLink, or Company
   */
  private static async syncTargetCustomDomain(type: string, targetId: string, domain: string | null) {
    try {
      if (type === 'ADVERTISING_WEBSITE') {
        await prisma.website.update({
          where: { id: targetId },
          data: { customDomain: domain }
        });
      } else if (type === 'TRAFFIC_LINK') {
        await prisma.trafficLink.update({
          where: { id: targetId },
          data: { customDomain: domain }
        });
      } else if (type === 'COMPANY_PROFILE') {
        await prisma.company.update({
          where: { id: targetId },
          data: { customDomain: domain }
        });
      }
    } catch (err) {
      console.warn(`[DomainsService] Could not sync customDomain to target ${type}:${targetId}:`, err);
    }
  }
}
