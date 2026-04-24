# Plan: Historical USD Value for Every Campaign

**Date:** 2026-04-08
**Task:** Show historical BCH/USD price on every campaign

## Approach

### 1. Price Data Sources
- **Hyperliquid** (Dec 2020+): Batch-fetch all daily candles from Dec 2020 to now (~2000 days, ~4 API calls). Build a Map<dateKey, price>.
- **CoinGecko** (Mar 2020 – Nov 2020): Use `/coins/bitcoin-cash/market_chart/range` to get the full early range in one call. Extract daily close prices.
- **Fallback**: Campaigns with no date → no USD display.

### 2. Architecture
```
src/lib/pricing/historical-price.ts   — Price cache + lookup
src/lib/data/campaigns-with-pricing.ts — Enriches Campaign[] with usdValueAtTime
src/types/campaign.ts                  — Add usdValueAtTime?, priceSource? fields
```

### 3. Data Flow
- Server components + API route call `getCampaignsWithPricing()` instead of `getCampaigns()`
- Price cache is module-level (singleton in Node.js), populated on first call
- Campaign detail page: calls `getCampaignByIdWithPricing(id)`
- API route: returns enriched campaigns (usdValueAtTime included in JSON)
- Client components receive USD data via API, no client-side price fetching

### 4. UI Changes
- **Detail page**: Below BCH goal, show `≈ $X,XXX USD` with note "at BCH price on [date]"
- **CampaignCard**: Show USD value below BCH amount in smaller text
- Match existing holographic theme colors

### 5. Verification
- `npm run build` passes
- `npm run lint` passes
- Dev server loads all affected pages
