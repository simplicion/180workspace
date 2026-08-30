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
  { org: 'META', regex: /facebook|meta.*platforms/i, asns: ['32934', '63293'] },
  { org: 'BYTEDANCE', regex: /bytedance|tiktok/i, asns: ['138699'] },
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
      (typeof headers['cf-connecting-ip'] === 'string' ? headers['cf-connecting-ip'] : '') ||
      (typeof headers['x-real-ip'] === 'string' ? headers['x-real-ip'] : '') ||
      (typeof headers['x-forwarded-for'] === 'string' ? headers['x-forwarded-for'].split(',')[0].trim() : '') ||
      req.ip ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const userAgent = typeof headers['user-agent'] === 'string' ? headers['user-agent'] : '';
    const referrer = typeof headers['referer'] === 'string' ? headers['referer'] : (typeof headers['referrer'] === 'string' ? headers['referrer'] : '');
    
    // Country detection (Edge headers or fallback)
    const country = 
      (typeof headers['cf-ipcountry'] === 'string' ? headers['cf-ipcountry'] : '') || 
      (typeof headers['x-country-code'] === 'string' ? headers['x-country-code'] : '') || 
      (typeof headers['x-geo-country'] === 'string' ? headers['x-geo-country'] : '') || 
      'US';

    const city = (typeof headers['cf-ipcity'] === 'string' ? headers['cf-ipcity'] : '') || (typeof headers['x-geo-city'] === 'string' ? headers['x-geo-city'] : '') || 'Unknown';
    const postalCode = (typeof headers['cf-postal-code'] === 'string' ? headers['cf-postal-code'] : '') || (typeof headers['x-geo-postal-code'] === 'string' ? headers['x-geo-postal-code'] : '') || (typeof headers['x-postal-code'] === 'string' ? headers['x-postal-code'] : '') || (typeof headers['x-zip-code'] === 'string' ? headers['x-zip-code'] : '') || (typeof query.zip === 'string' ? query.zip : undefined) || (typeof query.postal_code === 'string' ? query.postal_code : undefined);
    const region = (typeof headers['cf-region'] === 'string' ? headers['cf-region'] : '') || (typeof headers['cf-region-code'] === 'string' ? headers['cf-region-code'] : '') || (typeof headers['x-geo-region'] === 'string' ? headers['x-geo-region'] : '') || undefined;
    const timezone = (typeof headers['cf-timezone'] === 'string' ? headers['cf-timezone'] : '') || (typeof headers['x-timezone'] === 'string' ? headers['x-timezone'] : '') || (typeof query.tz === 'string' ? query.tz : undefined);
    const language = typeof headers['accept-language'] === 'string' ? headers['accept-language'].split(',')[0]?.split(';')[0]?.trim() || 'en' : 'en';

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
    if (
      rawIp.startsWith('54.') || 
      rawIp.startsWith('52.') || 
      rawIp.startsWith('34.') || 
      rawIp.startsWith('35.') || 
      rawIp.startsWith('104.196.') ||
      rawIp.startsWith('157.240.') ||
      rawIp.startsWith('31.13.') ||
      rawIp.startsWith('69.63.') ||
      rawIp.startsWith('69.171.') ||
      rawIp.startsWith('66.220.')
    ) {
      networkType = 'datacenter';
      if (!asnOrg) asnOrg = 'CLOUD_PROVIDER';
      isBot = true;
    }

    // Device & OS detection
    const { deviceType, os, browser } = this.parseClientCharacteristics(userAgent);

    // Optional telemetry parameters passed from client probe (query or JSON body)
    const body = req.body || {};
    const finalPostal = postalCode || (body.postalCode as string) || (body.zip as string) || undefined;
    const finalRegion = region || (body.region as string) || undefined;
    const finalTimezone = timezone || (body.timezone as string) || undefined;

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

    // Client Hints verification (Detect desktop pretending to be mobile)
    const secChUaMobile = headers['sec-ch-ua-mobile'] as string;
    if (secChUaMobile === '?0' && deviceType === 'mobile') {
      isEmulated = true; // User-Agent spoofing detected!
    }

    return {
      ipAddress: rawIp,
      country: country.toUpperCase(),
      city,
      postalCode: finalPostal,
      region: finalRegion,
      timezone: finalTimezone,
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
    if (/instagram/i.test(lower)) browser = 'Instagram In-App';
    else if (/tiktok|bytedance|musical_ly/i.test(lower)) browser = 'TikTok In-App';
    else if (/fban|fbav|fb_iab/i.test(lower)) browser = 'Facebook In-App';
    else if (/snapchat/i.test(lower)) browser = 'Snapchat In-App';
    else if (/samsungbrowser/i.test(lower)) browser = 'Samsung Browser';
    else if (/brave/i.test(lower)) browser = 'Brave';
    else if (/edg\//i.test(lower)) browser = 'Microsoft Edge';
    else if (/chrome|crios/i.test(lower)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(lower)) browser = 'Firefox';
    else if (/safari/i.test(lower) && !/chrome/i.test(lower)) browser = 'Safari';
    else if (/opera|opr\//i.test(lower)) browser = 'Opera';

    return { deviceType, os, browser };
  }
}
