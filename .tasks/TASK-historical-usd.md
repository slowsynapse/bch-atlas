# Task: Historical USD Value for Every Campaign

## Goal
Show a USD ($) value on every campaign, calculated using the **BCH/USD price at the time the campaign was created**. Display a note that this is the historical USD value.

## Data Context

### Campaigns
- **225 Flipstarter campaigns** (`data/flipstarters-with-addresses.json`): 145 have `transactionTimestamp` (Unix seconds). Earliest: Mar 2020, Latest: Apr 2025. 80 have no timestamp.
- **101 FundMe campaigns** (`data/fundme.json`): All have `time: '2026-03-19'` (placeholder scrape date). No transactionTimestamp.

### Price Sources
1. **Hyperliquid** (`src/lib/hyperliquid/`) — already built. `POST https://api.hyperliquid.xyz/info` with `candleSnapshot`. Has BCH perp data from ~Dec 2020. Returns OHLCV.
   - Usage: `getCandleSnapshot('BCH', '1d', startMs, endMs)` from `@/lib/hyperliquid/queries`
2. **CoinGecko free API** — for campaigns before Hyperliquid data exists (Mar 2020 – Nov 2020).
   - `https://api.coingecko.com/api/v3/coins/bitcoin-cash/history?date=DD-MM-YYYY`
   - Or market chart: `https://api.coingecko.com/api/v3/coins/bitcoin-cash/market_chart?vs_currency=usd&days=max`

### Date Resolution Priority
1. `transactionTimestamp` (flipstarter blockchain data) — most accurate
2. `time` field (FundMe, fallback)

## Implementation

### 1. Price lookup utility: `src/lib/pricing/historical-price.ts`
- Server-only (Node.js, not client-side)
- Function: `getHistoricalBchPrice(date: Date): Promise<{ price: number, source: 'hyperliquid' | 'coingecko' | 'estimated' }>`
- Cache results in a Map (same-day campaigns share the same price)
- Use Hyperliquid for Dec 2020+, CoinGecko for earlier dates
- For campaigns with no date at all, return null (skip USD display)

### 2. Enhanced campaign type: `src/types/campaign.ts`
- Add `usdValueAtTime?: number` and `priceSource?: string` to Campaign interface

### 3. Data layer: `src/lib/data/campaigns-with-pricing.ts`
- Wrap `getCampaigns()` — for each campaign, resolve date, fetch historical price, attach `usdValueAtTime`
- Memoize/cached (server component, runs once per build/request)

### 4. UI Updates

**Campaign detail page** (`src/app/campaigns/[id]/page.tsx`):
- Below the BCH goal amount, show USD equivalent
- Format: `≈ $1,234 USD` with small note "at BCH price on [date]"
- Match existing holographic design style

**Campaign list page** (`src/app/campaigns/page.tsx`):
- Show USD value next to BCH amount

**Graph visualization** (if feasible):
- Could update node labels to show USD, but keep it optional

## Design Notes
- Follow existing dark holographic theme (`#00E0A0`, `#00FF88`, `ds-panel`, `ds-label`)
- Small/secondary text for the historical note (text-xs, text-[#7A8899])
- Example: `≈ $1,234 USD` with subtext `at BCH price on Feb 9, 2021`

## Constraints
- Server-side only — no client-side API calls for pricing
- Cache prices so we don't hammer APIs on every request
- Handle missing dates gracefully (show BCH only, no USD)
- CoinGecko free API has rate limits (~10-30 req/min) — batch or cache aggressively

## Files to Create/Modify
- `src/lib/pricing/historical-price.ts` (NEW)
- `src/lib/data/campaigns-with-pricing.ts` (NEW)
- `src/types/campaign.ts` (MODIFY — add optional fields)
- `src/app/campaigns/[id]/page.tsx` (MODIFY — show USD)
- `src/app/campaigns/page.tsx` (MODIFY — show USD in list)
