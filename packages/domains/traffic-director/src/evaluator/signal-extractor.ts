import { ExtractedSignals } from '../types';

const BOT_PATTERNS = [
  { name: 'Googlebot', regex: /googlebot/i },
  { name: 'Bingbot', regex: /bingbot/i },
  { name: 'Baiduspider', regex: /baiduspider/i },
  { name: 'YandexBot', regex: /yandexbot/i },
  { name: 'DuckDuckBot', regex: /duckduckbot/i },
  { name: 'Twitterbot', regex: /twitterbot/i },
  { name: 'FacebookExternalHit', regex: /facebookexternalhit/i },
  { name: 'LinkedInBot', regex: /linkedinbot/i },
  { name: 'Slackbot', regex: /slackbot/i },
  { name: 'TelegramBot', regex: /telegrambot/i },
  { name: 'WhatsApp', regex: /whatsapp/i },
  { name: 'Pinterest', regex: /pinterest/i },
  { name: 'Applebot', regex: /applebot/i },
  { name: 'Discordbot', regex: /discordbot/i },
  { name: 'PythonRequests', regex: /python-requests/i },
  { name: 'cURL', regex: /curl\//i },
  { name: 'Wget', regex: /wget\//i },
  { name: 'Postman', regex: /postmanruntime/i },
  { name: 'HeadlessChrome', regex: /headlesschrome/i },
  { name: 'PhantomJS', regex: /phantomjs/i },
  { name: 'AhrefsBot', regex: /ahrefsbot/i },
  { name: 'SemrushBot', regex: /semrushbot/i }
];

const CLOUD_ASN_PATTERNS = [
  { org: 'AWS', regex: /amazon|aws/i, asns: ['16509', '14618', '8987'] },
  { org: 'GOOGLE_CLOUD', regex: /google.*cloud|google.*llc/i, asns: ['15169', '396982', '36040'] },
  { org: 'AZURE', regex: /microsoft|azure/i, asns: ['8075', '8068', '8069'] },
  { org: 'DIGITALOCEAN', regex: /digitalocean/i, asns: ['14061'] },
  { org: 'HETZNER', regex: /hetzner/i, asns: ['24940', '213230'] },
  { org: 'OVH', regex: /ovh/i, asns: ['16276'] },
  { org: 'ORACLE', regex: /oracle/i, asns: ['31898'] },
  { org: 'CLOUDFLARE', regex: /cloudflare/i, asns: ['13335'] }
];

export class SignalExtractor {
  static extractFromRequest(req: any): ExtractedSignals {
    const headers = req.headers || {};
    const query = req.query || {};
    const rawIp = 
      (headers['cf-connecting-ip'] as string) ||
      (headers['x-real-ip'] as string) ||
      (headers['x-forwarded-for'] ? (headers['x-forwarded-for'] as string).split(',')[0].trim() : '') ||
      req.ip ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const userAgent = (headers['user-agent'] as string) || '';
    const referrer = (headers['referer'] as string) || (headers['referrer'] as string) || '';
    
    // Country detection (Edge headers or fallback)
    const country = 
      (headers['cf-ipcountry'] as string) || 
      (headers['x-country-code'] as string) || 
      (headers['x-geo-country'] as string) || 
      'US';

    const city = (headers['cf-ipcity'] as string) || (headers['x-geo-city'] as string) || 'Unknown';
    const language = (headers['accept-language'] as string)?.split(',')[0]?.split(';')[0]?.trim() || 'en';

    // Bot detection
    let isBot = false;
    let botName: string | undefined;

    for (const bot of BOT_PATTERNS) {
      if (bot.regex.test(userAgent)) {
        isBot = true;
        botName = bot.name;
        break;
      }
    }

    // Datacenter & ASN classification
    const rawAsn = (headers['cf-ipasn'] as string) || (headers['x-asn'] as string) || '';
    const rawAsnOrg = (headers['cf-as-organization'] as string) || (headers['x-asn-org'] as string) || '';
    
    let networkType: 'residential' | 'datacenter' | 'cellular' | 'vpn' | 'unknown' = 'residential';
    let asnOrg: string | undefined = undefined;

    for (const cloud of CLOUD_ASN_PATTERNS) {
      if ((rawAsnOrg && cloud.regex.test(rawAsnOrg)) || (rawAsn && cloud.asns.includes(rawAsn))) {
        networkType = 'datacenter';
        asnOrg = cloud.org;
        isBot = true; // Flag cloud datacenter traffic as automated review/scanner traffic
        break;
      }
    }

    // Heuristic datacenter detection for common cloud hosting IP ranges
    if (rawIp.startsWith('54.') || rawIp.startsWith('52.') || rawIp.startsWith('34.') || rawIp.startsWith('35.') || rawIp.startsWith('104.196.')) {
      networkType = 'datacenter';
      if (!asnOrg) asnOrg = 'CLOUD_PROVIDER';
    }

    // Device & OS detection
    const { deviceType, os, browser } = this.parseClientCharacteristics(userAgent);

    // Optional telemetry parameters passed from client probe (query or JSON body)
    const body = req.body || {};
    const touchPoints = typeof query.tp !== 'undefined' 
      ? parseInt(query.tp as string, 10) 
      : (typeof body.touchPoints === 'number' ? body.touchPoints : undefined);

    const gpuRenderer = (query.gpu as string) || (typeof body.gpuRenderer === 'string' ? body.gpuRenderer : undefined);
    const batteryLevel = typeof query.bat !== 'undefined' 
      ? parseFloat(query.bat as string) 
      : (typeof body.batteryLevel === 'number' ? body.batteryLevel : undefined);
    
    let isEmulated = false;
    if (gpuRenderer && /swiftshader|llvmpipe|software rasterizer|virtualbox/i.test(gpuRenderer)) {
      isEmulated = true;
    }
    if (deviceType === 'mobile' && touchPoints === 0) {
      isEmulated = true;
    }

    return {
      ipAddress: rawIp,
      country: country.toUpperCase(),
      city,
      deviceType,
      os,
      browser,
      userAgent,
      referrer,
      isBot,
      botName,
      language,
      networkType,
      asn: rawAsn,
      asnOrg,
      touchPoints,
      gpuRenderer,
      batteryLevel,
      isEmulated,
      headers,
      queryParams: query,
      timestamp: new Date()
    };
  }

  static parseClientCharacteristics(ua: string): { deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown'; os: string; browser: string } {
    const lower = ua.toLowerCase();
    
    let deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown' = 'desktop';
    if (/tablet|ipad|playbook|silk/i.test(lower)) {
      deviceType = 'tablet';
    } else if (/mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini/i.test(lower)) {
      deviceType = 'mobile';
    } else if (lower === '' || lower === 'curl' || lower === 'wget') {
      deviceType = 'unknown';
    }

    let os = 'Unknown OS';
    if (/windows nt 10.0/i.test(lower)) os = 'Windows 10/11';
    else if (/windows nt/i.test(lower)) os = 'Windows';
    else if (/iphone|ipad|ipod|os\s+[0-9_]+.*like\s+mac\s+os\s+x/i.test(lower)) os = 'iOS';
    else if (/android/i.test(lower)) os = 'Android';
    else if (/macintosh|mac os x/i.test(lower)) os = 'macOS';
    else if (/linux/i.test(lower)) os = 'Linux';

    let browser = 'Unknown Browser';
    if (/edg\//i.test(lower)) browser = 'Microsoft Edge';
    else if (/chrome|crios/i.test(lower)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(lower)) browser = 'Firefox';
    else if (/safari/i.test(lower) && !/chrome/i.test(lower)) browser = 'Safari';
    else if (/opera|opr\//i.test(lower)) browser = 'Opera';

    return { deviceType, os, browser };
  }
}
