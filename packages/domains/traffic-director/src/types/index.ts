export type ConditionType = 
  | 'geo_country' 
  | 'geo_postal_code'
  | 'geo_region'
  | 'geo_city' 
  | 'geo_timezone'
  | 'device_type' 
  | 'os' 
  | 'browser' 
  | 'referrer'
  | 'sec_ch_ua'
  | 'ip_address'
  | 'header' 
  | 'query_param' 
  | 'bot_status' 
  | 'time_range' 
  | 'language'
  | 'network_type'       // residential, datacenter, cellular, vpn
  | 'asn_provider'       // AWS, GOOGLE_CLOUD, AZURE, DIGITALOCEAN, HETZNER, ORACLE, etc.
  | 'touch_support'      // boolean (mobile with touchpoints vs emulated)
  | 'gpu_renderer'       // checks against SwiftShader software renderer
  | 'battery_valid';     // checks against static 100% cloud test runners

export type ConditionOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains' 
  | 'in' 
  | 'not_in' 
  | 'regex' 
  | 'exists' 
  | 'not_exists'
  | 'starts_with';

export interface RuleCondition {
  type: ConditionType;
  operator: ConditionOperator;
  key?: string; // for custom header or query param name
  value: any;
}

export interface ExtractedSignals {
  ipAddress: string;
  country: string;
  city: string;
  postalCode?: string;
  region?: string;
  timezone?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  os: string;
  browser: string;
  userAgent: string;
  referrer: string;
  isBot: boolean;
  botName?: string;
  language: string;
  networkType: 'residential' | 'datacenter' | 'cellular' | 'vpn' | 'unknown';
  asn?: string;
  asnOrg?: string;
  touchPoints?: number;
  gpuRenderer?: string;
  batteryLevel?: number;
  isEmulated?: boolean;
  headers: Record<string, string | string[] | undefined>;
  queryParams: Record<string, any>;
  timestamp: Date;
}

export type TrafficActionType = 
  | 'redirect_302' 
  | 'redirect_301' 
  | 'redirect_307' 
  | 'rewrite'
  | 'proxy_safe_page'
  | 'proxy_target_offer'
  | 'js_replace';

export interface EvaluationResult {
  matchedRuleId: string | null;
  matchedRuleName: string | null;
  destinationUrl: string;
  actionType: TrafficActionType;
  isFallback: boolean;
  evaluationLatencyMs: number;
  signals: ExtractedSignals;
  warmupBlocked?: boolean;
  datacenterBlocked?: boolean;
  rampUpApplied?: boolean;
}

export interface CreateTrafficLinkDTO {
  companyId: string;
  name: string;
  slug: string;
  description?: string;
  fallbackUrl: string;
  customDomain?: string;
  tags?: string[];
  warmupUntil?: Date | string | null;
  rampUpEnabled?: boolean;
  rampUpDurationHours?: number;
  shieldMode?: 'server' | 'client_shield' | 'hybrid';
  datacenterBlocked?: boolean;
  safePageProxyMode?: boolean;
}

export interface UpdateTrafficLinkDTO {
  name?: string;
  slug?: string;
  description?: string;
  fallbackUrl?: string;
  customDomain?: string;
  tags?: string[];
  isActive?: boolean;
  warmupUntil?: Date | string | null;
  rampUpEnabled?: boolean;
  rampUpDurationHours?: number;
  shieldMode?: 'server' | 'client_shield' | 'hybrid';
  datacenterBlocked?: boolean;
  safePageProxyMode?: boolean;
}

export interface CreateTrafficRuleDTO {
  linkId: string;
  name: string;
  priority?: number;
  destinationUrl: string;
  actionType?: TrafficActionType;
  conditions: RuleCondition[];
  weight?: number;
  isActive?: boolean;
}

export interface UpdateTrafficRuleDTO {
  name?: string;
  priority?: number;
  destinationUrl?: string;
  actionType?: TrafficActionType;
  conditions?: RuleCondition[];
  weight?: number;
  isActive?: boolean;
}

