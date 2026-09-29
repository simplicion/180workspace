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

const SPY_SERVICE_PATTERNS = [
  { name: 'AdPlexity', regex: /adplexity/i },
  { name: 'SpyOver', regex: /spyover/i },
  { name: 'Anstrex', regex: /anstrex/i },
  { name: 'Dropispy', regex: /dropispy/i },
  { name: 'BigSpy', regex: /bigspy/i },
  { name: 'PowerAdSpy', regex: /poweradspy/i },
  { name: 'AdHeart', regex: /adheart/i },
  { name: 'Advault', regex: /advault/i },
  { name: 'WhatRunsWhere', regex: /whatrunswhere/i },
  { name: 'NativeAdBuzz', regex: /nativeadbuzz/i },
  { name: 'Adbeat', regex: /adbeat/i },
  { name: 'PikassoScraper', regex: /pikasso|adscraper/i },
  { name: 'PuppeteerStealth', regex: /puppeteer-extra|stealth/i }
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
  { org: 'CLOUDFLARE', regex: /cloudflare/i, asns: ['13335'] },
  // Common scraper and proxy aggregation networks
  { org: 'PACKETHUB_SPY', regex: /packethub/i, asns: ['209242'] },
  { org: 'M247_PROXY', regex: /m247/i, asns: ['9009'] },
  { org: 'DATACAMP_PROXY', regex: /datacamp/i, asns: ['212238'] },
  { org: 'CLOUVIDER_PROXY', regex: /clouvider/i, asns: ['62240'] },
  { org: 'CHOOPA_VULTR', regex: /choopa|vultr/i, asns: ['20473'] },
  { org: 'COGENT', regex: /cogent/i, asns: ['174'] },
  { org: 'QUADRANET', regex: /quadranet/i, asns: ['8100'] },
  { org: 'LEASEWEB', regex: /leaseweb/i, asns: ['16265', '60781'] },
  { org: 'HOSTINGER', regex: /hostinger/i, asns: ['47583'] }
];

const ISP_PATTERNS = [
  { name: 'Jio', regex: /reliance.*jio|jio\s*infocomm/i },
  { name: 'Airtel', regex: /bharti.*airtel|airtel/i },
  { name: 'Vodafone', regex: /vodafone|vi\s*india/i },
  { name: 'BSNL', regex: /bharat.*sanchar|bsnl/i },
  { name: 'ACT Fibernet', regex: /atria.*convergence|act.*corp/i },
  { name: 'Comcast', regex: /comcast/i },
  { name: 'Verizon', regex: /verizon|cellco/i },
  { name: 'AT&T', regex: /at&t|att.*services/i },
  { name: 'Charter Spectrum', regex: /charter|spectrum/i },
  { name: 'T-Mobile', regex: /t-mobile/i },
  { name: 'Deutsche Telekom', regex: /deutsche.*telekom/i },
  { name: 'Orange', regex: /orange/i },
  { name: 'Telefonica', regex: /telefonica|o2/i },
  { name: 'BT', regex: /british.*telecom|bt\s*group/i },
  { name: 'Virgin Media', regex: /virgin.*media/i },
  { name: 'Rogers', regex: /rogers.*comm/i },
  { name: 'Bell', regex: /bell.*canada/i },
  { name: 'Telstra', regex: /telstra/i },
  { name: 'Optus', regex: /optus/i },
  { name: 'Starlink', regex: /starlink|spacex/i },
  { name: 'Cox', regex: /cox.*communications/i },
  { name: 'CenturyLink', regex: /centurylink|lumen/i },
];

export class SignalExtractor {
  static extractFromRequest(req: any): ExtractedSignals {
    const headers = req.headers || {};
    const query = req.query || {};
    const body = req.body || {};

    const rawIp = 
      (typeof headers['cf-connecting-ip'] === 'string' ? headers['cf-connecting-ip'] : '') ||
      (typeof headers['true-client-ip'] === 'string' ? headers['true-client-ip'] : '') ||
      (typeof headers['x-client-ip'] === 'string' ? headers['x-client-ip'] : '') ||
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

    // Fetch Metadata headers (Detect direct scrapers mimicking ad clicks)
    const secFetchSite = (headers['sec-fetch-site'] as string) || undefined;
    const secFetchMode = (headers['sec-fetch-mode'] as string) || undefined;
    const secFetchDest = (headers['sec-fetch-dest'] as string) || undefined;

    // Bot & Crawler detection
    let isBot = false;
    let botName: string | undefined;

    for (const bot of BOT_PATTERNS) {
      if (bot.regex.test(userAgent)) {
        isBot = true;
        botName = bot.name;
        break;
      }
    }

    // Spy Service & Competitive Scraper detection
    let isSpyService = false;
    let spyServiceName: string | undefined;

    for (const spy of SPY_SERVICE_PATTERNS) {
      if (spy.regex.test(userAgent)) {
        isSpyService = true;
        spyServiceName = spy.name;
        isBot = true;
        botName = `Spy Tool: ${spy.name}`;
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
        if (cloud.org.includes('SPY') || cloud.org.includes('PROXY')) {
          isSpyService = true;
          if (!spyServiceName) spyServiceName = cloud.org;
        }
        break;
      }
    }

    // Normalize Consumer ISP name
    let isp: string | undefined;
    if (rawAsnOrg) {
      for (const ispPattern of ISP_PATTERNS) {
        if (ispPattern.regex.test(rawAsnOrg)) {
          isp = ispPattern.name;
          break;
        }
      }
      if (!isp) {
        isp = rawAsnOrg;
      }
    }

    // Tor Network detection (Cloudflare marks Tor with country T1 or specific header)
    let isTor = false;
    if (country === 'T1' || headers['cf-threat-score'] === '100' || rawIp.startsWith('185.220.') || rawIp.startsWith('185.246.')) {
      isTor = true;
      networkType = 'vpn';
      isBot = true;
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
    if (gpuRenderer && /swiftshader|llvmpipe|software rasterizer|virtualbox|vmware/i.test(gpuRenderer)) {
      isEmulated = true;
      isBot = true;
    }
    if (deviceType === 'mobile' && touchPoints === 0) {
      isEmulated = true;
      isBot = true;
    }

    // Client Hints verification (Detect desktop pretending to be mobile)
    const secChUaMobile = headers['sec-ch-ua-mobile'] as string;
    if (secChUaMobile === '?0' && deviceType === 'mobile') {
      isEmulated = true; // User-Agent spoofing detected!
      isBot = true;
    }

    // VPN Heuristics: Client Timezone vs Geo Timezone Delta Anomaly
    const clientTimezone = (body.clientTimezone as string) || (query.ctz as string) || undefined;
    let hasTimezoneDelta = false;
    let isVpn = isTor || networkType === 'vpn';
    let vpnReason: string | undefined = isTor ? 'Tor Exit Node' : undefined;

    if (clientTimezone && finalTimezone) {
      const cTz = clientTimezone.toLowerCase();
      const gTz = finalTimezone.toLowerCase();
      // If client reports Asia timezone while IP is in America or Europe, flag proxy/VPN
      const clientRegion = cTz.split('/')[0];
      const geoRegion = gTz.split('/')[0];
      if (clientRegion && geoRegion && clientRegion !== geoRegion && clientRegion !== 'etc') {
        hasTimezoneDelta = true;
        isVpn = true;
        networkType = 'vpn';
        vpnReason = `Timezone mismatch (IP: ${finalTimezone} vs Client: ${clientTimezone})`;
      }
    }

    // WebRTC Leak detection flag passed from client
    if (body.isWebRtcLeak === true || query.webrtc_leak === '1') {
      isVpn = true;
      networkType = 'vpn';
      vpnReason = 'WebRTC Interface Leak Detected';
    }

    return {
      ipAddress: rawIp,
      country: country.toUpperCase(),
      city,
      postalCode: finalPostal,
      region: finalRegion,
      timezone: finalTimezone,
      clientTimezone,
      hasTimezoneDelta,
      deviceType,
      os,
      browser,
      userAgent,
      referrer,
      isBot,
      botName,
      isSpyService,
      spyServiceName,
      isVpn,
      vpnReason,
      isTor,
      isp,
      language,
      networkType,
      asn: rawAsn,
      asnOrg,
      touchPoints,
      gpuRenderer,
      batteryLevel,
      isEmulated,
      secFetchSite,
      secFetchMode,
      secFetchDest,
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
