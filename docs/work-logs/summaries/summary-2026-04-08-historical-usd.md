# Summary: Historical USD Value for Every Campaign

**Date:** 2026-04-08
**Status:** Complete — build passes, lint clean (no new errors)

## What Changed

### New Files
- **`src/lib/pricing/historical-price.ts`** — Historical BCH/USD price lookup module
  - Fetches daily prices from two sources:
    - CoinGecko: Mar 2020 – Nov 2020 (pre-Hyperliquid era)
    - Hyperliquid: Dec 2020 onwards (perp candle data)
  - Module-level Map cache keyed by date (YYYY-MM-DD)
  - Singleton pattern: only fetches once, concurrent calls share the same promise
  - Fuzzy date matching: ±3 day window if exact date not found

- **`src/lib/data/campaigns-with-pricing.ts`** — Campaign enrichment layer
  - `getCampaignsWithPricing()` — returns all campaigns with USD values attached
  - `getCampaignByIdWithPricing(id)` — single campaign with USD value
  - Resolves date from `transactionTimestamp` (preferred) or `time` field
  - Calculates `usdValueAtTime = amount × historicalPrice`, rounded to integer

### Modified Files
- **`src/types/campaign.ts`** — Added `usdValueAtTime?`, `priceSource?`, `priceDate?` fields
- **`src/app/api/campaigns/route.ts`** — Now uses `getCampaignsWithPricing()` instead of `getCampaigns()`
- **`src/app/campaigns/[id]/page.tsx`** — Shows `≈ $X,XXX USD` below BCH goal with historical date note
- **`src/components/campaigns/CampaignCard.tsx`** — Shows `≈ $X,XXX` below BCH amount in campaign list

## Design Decisions
- **Server-side only** — No client-side price API calls. Prices are fetched on the server and included in API responses.
- **Lazy initialization** — Price cache is populated on first request, not at import time. Subsequent requests are instant.
- **Graceful degradation** — Campaigns without dates or without price data simply don't show USD. No errors.
- **No data file changes** — USD values are computed at runtime, not stored in JSON.

## Verification
- `npx tsc --noEmit` — passes
- `npm run lint` — no new errors (pre-existing errors unchanged)
- `npm run build` — passes, campaign detail page now dynamic (server-rendered)
