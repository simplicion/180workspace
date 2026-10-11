---
sidebar_position: 2
title: 01. Dynamic Macro Interpolation
---

# Feature Specification: Dynamic Macro Interpolation

## 1. Overview & Problem Statement

Performance media buyers, affiliate marketers, and programmatic advertisers constantly pass tracking parameters (click IDs, sub-affiliate IDs, creative angles, geo markers) from ad platforms (Facebook, TikTok, Google Ads, Taboola) into downstream affiliate networks (Everflow, Cake, Tune, Voluum).

Currently, static redirection passes through existing query parameters as-is. However, ad networks and affiliate platforms expect specific destination URL query token interpolation (e.g., `https://offer.com/?aff_sub={subid}&geo={country}&click_id={clickid}`).

**Dynamic Macro Interpolation** will allow users to use token placeholders directly inside destination URLs and safe page URLs that are automatically resolved and replaced at request time.

---

## 2. Supported Macro Tokens

| Macro Token | Evaluation Source | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `{clickid}` / `{click_id}` | UUIDv4 or Inbound Query | `c4b12e3a-7d2e-4b91-b3fa-92b036` | Unique click identifier for conversion tracking |
| `{subid1}` – `{subid5}` | Inbound Query Params | `campaign_v2_tier1` | Passthrough of arbitrary publisher sub-variables |
| `{country}` | GeoIP Resolver | `US`, `DE`, `JP` | ISO 3166-1 alpha-2 uppercase country code |
| `{city}` | GeoIP Resolver | `Berlin`, `New York` | Inferred metropolitan area |
| `{device}` | User-Agent Parser | `mobile`, `desktop`, `tablet` | Normalized client form factor |
| `{os}` | User-Agent Parser | `iOS`, `Android`, `Windows` | Operating system family |
| `{browser}` | User-Agent Parser | `Chrome`, `Safari`, `Firefox` | Primary browser name |
| `{ip}` | Request Extractor | `198.51.100.42` | Anonymized or raw client IP |
| `{timestamp}` | Edge Clock (Unix) | `1790683800` | Epoch timestamp in seconds |
| `{random}` | Cryptographic RNG | `849102` | Random integer to prevent browser cache poisoning |

---

## 3. Architecture & Interpolation Engine

```mermaid
flowchart LR
    Template["Destination URL: https://offer.com/?sub={subid1}&geo={country}"] --> Interpolator[Macro Interpolation Engine]
    Signals[ClientSignals: country='US', query={subid1: 'ad_angle_3'}] --> Interpolator
    Interpolator --> Resolved["Final URL: https://offer.com/?sub=ad_angle_3&geo=US"]
```

### Proposed Engine Implementation (`MacroInterpolator.ts`)

```typescript
export class MacroInterpolator {
  private static readonly MACRO_REGEX = /\{([a-zA-Z0-9_]+)\}/g;

  public static interpolate(
    templateUrl: string,
    signals: ClientSignals,
    clickId: string
  ): string {
    return templateUrl.replace(this.MACRO_REGEX, (match, token) => {
      const lower = token.toLowerCase();

      switch (lower) {
        case 'clickid':
        case 'click_id':
          return encodeURIComponent(signals.queryParams['click_id'] || clickId);
        case 'country':
          return encodeURIComponent(signals.country || 'UNKNOWN');
        case 'city':
          return encodeURIComponent(signals.city || '');
        case 'device':
          return encodeURIComponent(signals.deviceType || 'unknown');
        case 'os':
          return encodeURIComponent(signals.os || 'unknown');
        case 'browser':
          return encodeURIComponent(signals.browser || 'unknown');
        case 'ip':
          return encodeURIComponent(signals.ip || '');
        case 'timestamp':
          return Math.floor(Date.now() / 1000).toString();
        case 'random':
          return Math.floor(100000 + Math.random() * 900000).toString();
        default:
          // Check query parameters (e.g., {subid1}, {utm_source})
          if (signals.queryParams[lower] !== undefined) {
            return encodeURIComponent(signals.queryParams[lower]);
          }
          return match; // Retain unmatched tokens
      }
    });
  }
}
```

---

## 4. UI/UX Integration

In the Link Rule builder:
- Users will see a **"Insert Macro" pill selector** directly beneath the Destination URL input.
- Clicking any pill (`{clickid}`, `{country}`, `{subid1}`) inserts the macro tag at the cursor position.
- The **Differential Simulator** will visually preview the resolved URL based on simulated signals.
