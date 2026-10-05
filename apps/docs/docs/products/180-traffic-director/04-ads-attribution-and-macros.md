---
id: ads-attribution-and-macros
title: Ads Attribution & Dynamic Macro Interpolation
sidebar_label: Ads Attribution & Macros
sidebar_position: 4
description: Dynamic macro interpolation, click token forwarding, Server-to-Server (S2S) postbacks, and conversion attribution in 180 Traffic Director.
---

# Ads Attribution & Dynamic Macro Interpolation

High-velocity performance marketers and media buyers rely on dynamic tracking tokens (macros) to pass click IDs, creative IDs, placement tags, and campaign identifiers from ad networks into downstream landing pages and affiliate networks.

**180 Dynamic Macro Interpolation** captures, substitutes, and forwards these variables seamlessly without manual URL query string manipulation.

```mermaid
graph LR
    AdClick[Ad Network Click<br/>?fbclid=123&utm_cam={{campaign.id}}] --> TD[180 Traffic Director]
    TD --> Parse[Extract & Store Click Record]
    TD --> Forward[Dynamic Macro Interpolation]
    Forward --> LandingPage[Offer Landing Page<br/>?click_id=clk_9918&cam_id=cam_4881]

    LandingPage --> Purchase[Customer Converts / Buys via 180 Pay]
    Purchase --> Postback[S2S Conversion Postback Dispatched]
    Postback --> MetaAPI[Meta Conversions API / TikTok Events API]
```

---

## 1. Supported Ad Network Macro Standards

Traffic Director recognizes and dynamically parses macro syntax across all major ad networks:

| Ad Network | Macro Syntax | Ingested Variable |
| :--- | :--- | :--- |
| **Meta / Facebook** | `{{campaign.id}}`, `{{ad.id}}`, `{{placement}}` | `cam_id`, `ad_id`, `placement` |
| **TikTok Ads** | `__CAMPAIGN_ID__`, `__AID__`, `__CID__` | `cam_id`, `ad_group_id`, `creative_id` |
| **Google Ads** | `{campaignid}`, `{creative}`, `{keyword}`, `{matchtype}` | `cam_id`, `creative_id`, `keyword`, `matchtype` |
| **Custom UTM Tokens** | `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` | Standard Google Analytics UTM schema |

---

## 2. Dynamic Macro URL Substitution

When configuring an offer URL in Traffic Director, you can embed destination template tokens:

```
https://offer.yourbrand.com/checkout?sub1={click_id}&sub2={campaign_id}&geo={country}
```

At the moment of evaluation, Traffic Director dynamically replaces these placeholders:
- `{click_id}` $\rightarrow$ Unique internal click ID (`clk_89127390`)
- `{campaign_id}` $\rightarrow$ Ingested ad platform campaign identifier
- `{country}` $\rightarrow$ Detected 2-letter ISO country code (`US`, `GB`, `IN`)

---

## 3. Server-to-Server (S2S) Conversion Postbacks

Client-side browser pixels (like the Meta Pixel or Google Tag) are frequently blocked by ad blockers, iOS 14.5+ privacy protections, and network firewalls, leading to 20%-40% under-reported conversions.

180 Traffic Director provides **Server-to-Server (S2S) Postback Engine**:
1. When a transaction completes in **180 Pay** or an external affiliate network:
2. The endpoint calls `POST /api/v1/traffic/postback?click_id=clk_89127390&payout=49.00`.
3. Traffic Director matches the transaction against the original click record.
4. An out-of-band server postback is fired directly to the Meta Conversions API (CAPI), TikTok Events API, or Google Offline Conversion API, guaranteeing 100% conversion attribution fidelity.
