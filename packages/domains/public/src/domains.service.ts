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
        companyId,
        isApex,
        status: vercelData?.verified ? 'ACTIVE' : 'PENDING_VERIFICATION',
        sslStatus: vercelData?.verified ? 'ACTIVE' : 'PENDING',
        verificationData: requiredRecords as any,
        lastCheckedAt: new Date()
      },
      create: {
        domain: cleanDomain,
        type: params.type,
        targetId: params.targetId,
        companyId,
        isApex,
        status: vercelData?.verified ? 'ACTIVE' : 'PENDING_VERIFICATION',
        sslStatus: vercelData?.verified ? 'ACTIVE' : 'PENDING',
        verificationData: requiredRecords as any,
        lastCheckedAt: new Date()
      }
    });

    // Update target model customDomain reference
    await this.syncTargetCustomDomain(params.type, params.targetId, cleanDomain);

    return {
      success: true,
      data: {
        domain: registry.domain,
        type: registry.type as any,
        targetId: registry.targetId,
        companyId: registry.companyId || undefined,
        status: registry.status as any,
        sslStatus: registry.sslStatus as any,
        isApex: (registry as any).isApex ?? isApex,
        records: requiredRecords,
        verifiedAt: registry.verifiedAt ? registry.verifiedAt.toISOString() : null,
        lastCheckedAt: registry.lastCheckedAt ? registry.lastCheckedAt.toISOString() : null
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
      throw new Error('Domain record not found.');
    }

    const isApex = this.isApexDomain(cleanDomain);
    const requiredRecords = this.calculateRequiredRecords(cleanDomain);

    let isDnsValid = false;
    let isVercelVerified = false;
    let details: any = {};

    // 1. Try Vercel verification if configured
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

    const updated = await prisma.domainRegistry.update({
      where: { domain: cleanDomain },
      data: {
        status: newStatus,
        sslStatus: newSslStatus,
        verifiedAt: isDnsValid ? new Date() : registry.verifiedAt,
        lastCheckedAt: new Date()
      }
    });

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
      status: updated.status as any,
      sslStatus: updated.sslStatus as any,
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
