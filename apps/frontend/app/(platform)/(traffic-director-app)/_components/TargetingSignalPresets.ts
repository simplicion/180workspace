export interface PresetOption {
  value: string;
  label: string;
  hint?: string;
  badge?: string;
}

export const CONDITION_TYPE_OPTIONS = [
  // Geographic & Location
  { value: 'geo_country', label: 'Country (ISO 3166-1 Code)', group: 'Geographic' },
  { value: 'geo_region', label: 'State / Region / Province', group: 'Geographic' },
  { value: 'geo_city', label: 'City Name', group: 'Geographic' },
  { value: 'geo_postal_code', label: 'Postal / PIN / ZIP Code', group: 'Geographic' },
  { value: 'geo_timezone', label: 'Visitor Timezone', group: 'Geographic' },

  // Device, OS & Hardware
  { value: 'device_type', label: 'Device Category (Mobile/Desktop/Tablet)', group: 'Device & Hardware' },
  { value: 'os', label: 'Operating System (iOS/Android/Windows)', group: 'Device & Hardware' },
  { value: 'browser', label: 'Browser & In-App Webviews', group: 'Device & Hardware' },
  { value: 'sec_ch_ua', label: 'Client Hints (Sec-CH-UA)', group: 'Device & Hardware' },
  { value: 'gpu_renderer', label: 'Hardware GPU (WebGL Engine)', group: 'Device & Hardware' },
  { value: 'touch_support', label: 'Touchscreen Hardware Presence', group: 'Device & Hardware' },
  { value: 'battery_valid', label: 'Battery Level Health Check', group: 'Device & Hardware' },

  // Security, Bot & Network
  { value: 'bot_status', label: 'Bot / Human Classification', group: 'Security & Network' },
  { value: 'network_type', label: 'Network Type (Residential/Datacenter/Cellular)', group: 'Security & Network' },
  { value: 'asn_provider', label: 'Cloud Hosting ASN (AWS/Meta/GCP/Azure)', group: 'Security & Network' },
  { value: 'ip_address', label: 'IP Address or CIDR Subnet', group: 'Security & Network' },

  // Traffic Source & Context
  { value: 'referrer', label: 'HTTP Referrer (Ad Platform / Social)', group: 'Traffic Source' },
  { value: 'language', label: 'Browser Language (Accept-Language)', group: 'Traffic Source' },
  { value: 'query_param', label: 'URL Query Parameter (UTM/SubID)', group: 'Traffic Source' },
  { value: 'header', label: 'Custom HTTP Request Header', group: 'Traffic Source' },
  { value: 'time_range', label: 'Day / Time Schedule Targeting', group: 'Traffic Source' },
];

export const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals (Exact Match)' },
  { value: 'not_equals', label: 'Does Not Equal' },
  { value: 'in', label: 'In List (Comma-separated or Wildcard)' },
  { value: 'not_in', label: 'Not In List' },
  { value: 'starts_with', label: 'Starts With (Prefix)' },
  { value: 'contains', label: 'Contains Substring' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'regex', label: 'Regular Expression Match' },
];

export const TARGET_VALUE_PRESETS: Record<string, PresetOption[]> = {
  geo_country: [
    { value: 'US', label: 'United States (US)', badge: 'Tier 1' },
    { value: 'IN', label: 'India (IN)', badge: 'High Volume' },
    { value: 'GB', label: 'United Kingdom (GB)', badge: 'Tier 1' },
    { value: 'CA', label: 'Canada (CA)', badge: 'Tier 1' },
    { value: 'AU', label: 'Australia (AU)', badge: 'Tier 1' },
    { value: 'AE', label: 'United Arab Emirates (AE)', badge: 'MENA' },
    { value: 'SA', label: 'Saudi Arabia (SA)', badge: 'MENA' },
    { value: 'SG', label: 'Singapore (SG)', badge: 'Tier 1 APAC' },
    { value: 'DE', label: 'Germany (DE)', badge: 'Tier 1 EU' },
    { value: 'FR', label: 'France (FR)', badge: 'Tier 1 EU' },
    { value: 'IT', label: 'Italy (IT)' },
    { value: 'ES', label: 'Spain (ES)' },
    { value: 'NL', label: 'Netherlands (NL)' },
    { value: 'BR', label: 'Brazil (BR)', badge: 'LATAM' },
    { value: 'MX', label: 'Mexico (MX)', badge: 'LATAM' },
    { value: 'JP', label: 'Japan (JP)' },
    { value: 'KR', label: 'South Korea (KR)' },
    { value: 'NZ', label: 'New Zealand (NZ)' },
    { value: 'IE', label: 'Ireland (Meta Review Hub)', badge: 'Review Hub' },
    { value: 'SE', label: 'Sweden (SE)' },
    { value: 'NO', label: 'Norway (NO)' },
    { value: 'DK', label: 'Denmark (DK)' },
    { value: 'CH', label: 'Switzerland (CH)' },
    { value: 'AT', label: 'Austria (AT)' },
    { value: 'ZA', label: 'South Africa (ZA)' },
    { value: 'PH', label: 'Philippines (PH)' },
    { value: 'ID', label: 'Indonesia (ID)' },
    { value: 'VN', label: 'Vietnam (VN)' },
    { value: 'TH', label: 'Thailand (TH)' },
    { value: 'MY', label: 'Malaysia (MY)' },
  ],

  geo_region: [
    // Indian States & Union Territories
    { value: 'DL', label: 'DL - Delhi NCR', badge: 'India Metro' },
    { value: 'MH', label: 'MH - Maharashtra (Mumbai, Pune)', badge: 'India Metro' },
    { value: 'KA', label: 'KA - Karnataka (Bangalore)', badge: 'India Tech' },
    { value: 'TG', label: 'TG - Telangana (Hyderabad)', badge: 'India Tech' },
    { value: 'TN', label: 'TN - Tamil Nadu (Chennai)', badge: 'India South' },
    { value: 'UP', label: 'UP - Uttar Pradesh (Noida, Lucknow)', badge: 'India North' },
    { value: 'GJ', label: 'GJ - Gujarat (Ahmedabad, Surat)', badge: 'India West' },
    { value: 'WB', label: 'WB - West Bengal (Kolkata)', badge: 'India East' },
    { value: 'HR', label: 'HR - Haryana (Gurgaon, Faridabad)', badge: 'India Metro' },
    { value: 'PB', label: 'PB - Punjab (Chandigarh)', badge: 'India North' },
    { value: 'RJ', label: 'RJ - Rajasthan (Jaipur)', badge: 'India North' },
    { value: 'KL', label: 'KL - Kerala (Kochi, Trivandrum)', badge: 'India South' },
    // US Major States
    { value: 'CA', label: 'CA - California', badge: 'US West' },
    { value: 'TX', label: 'TX - Texas', badge: 'US South' },
    { value: 'NY', label: 'NY - New York', badge: 'US East' },
    { value: 'FL', label: 'FL - Florida', badge: 'US East' },
    { value: 'IL', label: 'IL - Illinois (Chicago)', badge: 'US Midwest' },
    { value: 'PA', label: 'PA - Pennsylvania', badge: 'US East' },
    { value: 'OH', label: 'OH - Ohio', badge: 'US Midwest' },
    { value: 'GA', label: 'GA - Georgia (Atlanta)', badge: 'US South' },
    { value: 'NC', label: 'NC - North Carolina', badge: 'US East' },
    { value: 'MI', label: 'MI - Michigan', badge: 'US Midwest' },
    // Global Regions
    { value: 'ENG', label: 'ENG - England (London, Manchester)', badge: 'UK' },
    { value: 'SCT', label: 'SCT - Scotland (Edinburgh, Glasgow)', badge: 'UK' },
    { value: 'ON', label: 'ON - Ontario (Toronto)', badge: 'Canada' },
    { value: 'BC', label: 'BC - British Columbia (Vancouver)', badge: 'Canada' },
    { value: 'NSW', label: 'NSW - New South Wales (Sydney)', badge: 'Australia' },
    { value: 'VIC', label: 'VIC - Victoria (Melbourne)', badge: 'Australia' },
  ],

  geo_city: [
    // Top Indian Cities
    { value: 'Mumbai', label: 'Mumbai (IN)', badge: 'Tier 1 Metro' },
    { value: 'Delhi', label: 'Delhi / New Delhi (IN)', badge: 'Capital' },
    { value: 'Bangalore', label: 'Bangalore / Bengaluru (IN)', badge: 'Silicon Valley' },
    { value: 'Hyderabad', label: 'Hyderabad (IN)', badge: 'Tech Hub' },
    { value: 'Chennai', label: 'Chennai (IN)', badge: 'Tier 1 Metro' },
    { value: 'Kolkata', label: 'Kolkata (IN)', badge: 'Tier 1 Metro' },
    { value: 'Pune', label: 'Pune (IN)', badge: 'Tech Hub' },
    { value: 'Ahmedabad', label: 'Ahmedabad (IN)', badge: 'Commercial' },
    { value: 'Gurgaon', label: 'Gurgaon / Gurugram (IN)', badge: 'NCR Tech' },
    { value: 'Noida', label: 'Noida (IN)', badge: 'NCR Tech' },
    { value: 'Jaipur', label: 'Jaipur (IN)' },
    { value: 'Chandigarh', label: 'Chandigarh (IN)' },
    { value: 'Kochi', label: 'Kochi / Cochin (IN)' },
    // Global Hubs
    { value: 'New York', label: 'New York (US)', badge: 'Global Metro' },
    { value: 'Los Angeles', label: 'Los Angeles (US)', badge: 'Global Metro' },
    { value: 'Chicago', label: 'Chicago (US)' },
    { value: 'Houston', label: 'Houston (US)' },
    { value: 'London', label: 'London (GB)', badge: 'Global Metro' },
    { value: 'Manchester', label: 'Manchester (GB)' },
    { value: 'Toronto', label: 'Toronto (CA)' },
    { value: 'Sydney', label: 'Sydney (AU)' },
    { value: 'Melbourne', label: 'Melbourne (AU)' },
    { value: 'Dubai', label: 'Dubai (AE)', badge: 'MENA Hub' },
    { value: 'Singapore', label: 'Singapore (SG)', badge: 'APAC Hub' },
    { value: 'Berlin', label: 'Berlin (DE)' },
    { value: 'Paris', label: 'Paris (FR)' },
    { value: 'Tokyo', label: 'Tokyo (JP)' },
  ],

  geo_postal_code: [
    // Popular Indian PIN Codes
    { value: '110001', label: '110001 - Connaught Place / Central Delhi', badge: 'Delhi CBD' },
    { value: '400001', label: '400001 - Fort / South Mumbai', badge: 'Mumbai CBD' },
    { value: '560001', label: '560001 - MG Road / Bangalore CBD', badge: 'Bangalore CBD' },
    { value: '500081', label: '500081 - HITEC City / Cyberabad / Hyderabad', badge: 'Hyderabad IT' },
    { value: '600001', label: '600001 - Chennai Central / George Town', badge: 'Chennai CBD' },
    { value: '700001', label: '700001 - BBD Bagh / Kolkata Central', badge: 'Kolkata CBD' },
    { value: '411001', label: '411001 - Pune Central / Camp', badge: 'Pune CBD' },
    { value: '380001', label: '380001 - Ahmedabad Central', badge: 'Ahmedabad' },
    // US Major ZIP Codes
    { value: '90210', label: '90210 - Beverly Hills / Los Angeles, CA', badge: 'High Income' },
    { value: '10001', label: '10001 - Manhattan / New York, NY', badge: 'NYC CBD' },
    { value: '30301', label: '30301 - Atlanta, GA', badge: 'Atlanta' },
    { value: '60601', label: '60601 - Chicago Loop, IL', badge: 'Chicago' },
    { value: '75201', label: '75201 - Dallas Downtown, TX', badge: 'Dallas' },
    { value: '94102', label: '94102 - San Francisco, CA', badge: 'SF Tech' },
    // UK Postcodes
    { value: 'SW1A', label: 'SW1A - Westminster / Central London', badge: 'London CBD' },
    { value: 'EC1A', label: 'EC1A - City of London (Financial Hub)', badge: 'Finance' },
    { value: 'M1', label: 'M1 - Manchester Central', badge: 'Manchester' },
  ],

  geo_timezone: [
    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST +5:30)', badge: 'India Standard Time' },
    { value: 'America/New_York', label: 'America/New_York (EST / EDT)', badge: 'US Eastern' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST / PDT)', badge: 'US Pacific' },
    { value: 'America/Chicago', label: 'America/Chicago (CST / CDT)', badge: 'US Central' },
    { value: 'Europe/London', label: 'Europe/London (GMT / BST)', badge: 'UK Time' },
    { value: 'Europe/Berlin', label: 'Europe/Berlin (CET / CEST)', badge: 'Central Europe' },
    { value: 'Europe/Paris', label: 'Europe/Paris (CET / CEST)', badge: 'Western Europe' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST +4:00)', badge: 'Gulf Standard Time' },
    { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT +8:00)', badge: 'Singapore Time' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST +9:00)', badge: 'Japan Time' },
    { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST +10:00)', badge: 'Australia East' },
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  ],

  device_type: [
    { value: 'mobile', label: 'Mobile (Smartphones - iPhone & Android)', badge: 'High Value' },
    { value: 'desktop', label: 'Desktop (Mac, Windows, Linux)' },
    { value: 'tablet', label: 'Tablet (iPad, Galaxy Tab)' },
    { value: 'smarttv', label: 'Smart TV & Console' },
    { value: 'bot', label: 'Bot / Automated Headless' },
  ],

  os: [
    { value: 'ios', label: 'Apple iOS (iPhone & iPad)' },
    { value: 'android', label: 'Google Android' },
    { value: 'macos', label: 'Apple macOS' },
    { value: 'windows', label: 'Microsoft Windows (10 / 11)' },
    { value: 'linux', label: 'Linux' },
    { value: 'chromeos', label: 'ChromeOS' },
  ],

  browser: [
    { value: 'chrome', label: 'Google Chrome' },
    { value: 'safari', label: 'Apple Safari' },
    { value: 'instagram', label: 'Instagram In-App Browser', badge: 'Social Ad' },
    { value: 'tiktok', label: 'TikTok In-App Browser', badge: 'Social Ad' },
    { value: 'facebook', label: 'Facebook / Messenger In-App', badge: 'Social Ad' },
    { value: 'snapchat', label: 'Snapchat In-App Browser', badge: 'Social Ad' },
    { value: 'in_app_webview', label: 'Generic In-App WebView (All Social Networks)', badge: 'In-App' },
    { value: 'firefox', label: 'Mozilla Firefox' },
    { value: 'edge', label: 'Microsoft Edge' },
    { value: 'samsungbrowser', label: 'Samsung Internet' },
    { value: 'brave', label: 'Brave Browser' },
    { value: 'opera', label: 'Opera' },
  ],

  referrer: [
    { value: 'instagram.com', label: 'Instagram (instagram.com)', badge: 'Ad Platform' },
    { value: 'tiktok.com', label: 'TikTok (tiktok.com)', badge: 'Ad Platform' },
    { value: 'facebook.com', label: 'Facebook (facebook.com)', badge: 'Ad Platform' },
    { value: 'google.com', label: 'Google (google.com / Google Ads)', badge: 'Search' },
    { value: 'youtube.com', label: 'YouTube (youtube.com)' },
    { value: 'twitter.com', label: 'X / Twitter (twitter.com / x.com)' },
    { value: 'snapchat.com', label: 'Snapchat (snapchat.com)' },
    { value: 'pinterest.com', label: 'Pinterest (pinterest.com)' },
    { value: 'bing.com', label: 'Microsoft Bing (bing.com)' },
    { value: 'direct', label: 'Direct Traffic (No Referrer Header)' },
  ],

  sec_ch_ua: [
    { value: '?1', label: 'Verified Mobile Device (?1)', badge: 'Authentic' },
    { value: '?0', label: 'Verified Desktop Device (?0)' },
    { value: 'Chromium', label: 'Chromium Engine' },
    { value: 'Google Chrome', label: 'Google Chrome Browser' },
    { value: 'Mobile Safari', label: 'Mobile Safari WebKit' },
    { value: 'HeadlessChrome', label: 'Headless Chrome (Bot Signature)', badge: 'Bot' },
  ],

  gpu_renderer: [
    { value: 'apple', label: 'Apple Metal / GPU (Real iPhone / Mac)', badge: 'Real User' },
    { value: 'adreno', label: 'Qualcomm Adreno (Real Android)', badge: 'Real User' },
    { value: 'mali', label: 'ARM Mali (Real Android)', badge: 'Real User' },
    { value: 'nvidia', label: 'NVIDIA GeForce / RTX (Real PC)' },
    { value: 'amd', label: 'AMD Radeon (Real PC)' },
    { value: 'intel', label: 'Intel Iris / UHD Graphics' },
    { value: 'powervr', label: 'PowerVR Graphics' },
    { value: 'swiftshader', label: 'Google SwiftShader (Virtual Cloud Reviewer)', badge: 'Bot Detected' },
    { value: 'llvmpipe', label: 'Mesa LLVMpipe (Linux Server Headless)', badge: 'Bot Detected' },
    { value: 'mesa', label: 'Mesa Software Rasterizer', badge: 'Bot Detected' },
  ],

  network_type: [
    { value: 'residential', label: 'Residential ISP (Home Broadband / Fiber)', badge: 'Safe' },
    { value: 'cellular', label: 'Mobile Cellular (4G / 5G Carrier)', badge: 'Safe' },
    { value: 'datacenter', label: 'Cloud Datacenter (AWS/GCP/Meta/Azure)', badge: 'Bot Traffic' },
    { value: 'vpn', label: 'Commercial VPN / Anonymous Proxy' },
  ],

  asn_provider: [
    { value: 'META', label: 'Meta Platforms (ASN 32934, 63293 - Ad Review Team)', badge: 'Meta Reviewer' },
    { value: 'BYTEDANCE', label: 'ByteDance / TikTok (ASN 138699 - Ad QA)', badge: 'TikTok Reviewer' },
    { value: 'AWS', label: 'Amazon Web Services (ASN 16509, 14618)' },
    { value: 'GOOGLE_CLOUD', label: 'Google Cloud (ASN 15169, 396982)' },
    { value: 'AZURE', label: 'Microsoft Azure (ASN 8075, 8068)' },
    { value: 'DIGITALOCEAN', label: 'DigitalOcean (ASN 14061)' },
    { value: 'HETZNER', label: 'Hetzner Online (ASN 24940, 213230)' },
    { value: 'OVH', label: 'OVHcloud (ASN 16276)' },
    { value: 'ORACLE', label: 'Oracle Cloud (ASN 31898)' },
    { value: 'CLOUDFLARE', label: 'Cloudflare (ASN 13335)' },
  ],

  bot_status: [
    { value: 'human', label: 'Real Human Visitor', badge: 'Target' },
    { value: 'bot', label: 'Known Bot / Crawler / Ad QA Engine', badge: 'Block' },
  ],

  touch_support: [
    { value: 'true', label: 'Touch Screen Present (Real Mobile/Tablet)', badge: 'Authentic' },
    { value: 'false', label: 'No Touch Points (Desktop or Emulated Bot)' },
  ],

  battery_valid: [
    { value: 'true', label: 'Realistic Battery (< 100% or Discharging)', badge: 'Real Device' },
    { value: 'false', label: 'Static 100% Charging (Cloud Emulators & Scrapers)' },
  ],

  language: [
    { value: 'en', label: 'English (en)' },
    { value: 'hi', label: 'Hindi (hi)', badge: 'India' },
    { value: 'es', label: 'Spanish (es)' },
    { value: 'fr', label: 'French (fr)' },
    { value: 'de', label: 'German (de)' },
    { value: 'pt', label: 'Portuguese (pt)' },
    { value: 'it', label: 'Italian (it)' },
    { value: 'ar', label: 'Arabic (ar)' },
    { value: 'zh', label: 'Chinese (zh)' },
    { value: 'ja', label: 'Japanese (ja)' },
    { value: 'ru', label: 'Russian (ru)' },
  ],

  time_range: [
    { value: 'weekend', label: 'Weekend (Saturday & Sunday)' },
    { value: 'weekday', label: 'Weekday (Monday to Friday)' },
    { value: 'morning', label: 'Morning Hours (06:00 - 12:00)' },
    { value: 'afternoon', label: 'Afternoon Hours (12:00 - 18:00)' },
    { value: 'evening', label: 'Evening Peak (18:00 - 24:00)' },
    { value: 'night', label: 'Late Night (00:00 - 06:00)' },
  ],
};

export function hasPresetOptions(type: string): boolean {
  return Boolean(TARGET_VALUE_PRESETS[type]);
}

export function getPresetsForType(type: string): PresetOption[] {
  return TARGET_VALUE_PRESETS[type] || [];
}

export function getDefaultValueForType(type: string): string {
  const presets = TARGET_VALUE_PRESETS[type];
  if (presets && presets.length > 0) {
    return presets[0].value;
  }
  return '';
}
