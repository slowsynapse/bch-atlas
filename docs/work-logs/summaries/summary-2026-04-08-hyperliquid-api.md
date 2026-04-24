# Summary: Hyperliquid API Integration

**Date:** 2026-04-08
**Status:** Complete

## What was done

Added a Hyperliquid API client for fetching BCH/USD historical OHLCV price data, following the existing Chaingraph client pattern.

## Files created

- **`src/lib/hyperliquid/types.ts`** — TypeScript interfaces for candle data, intervals, and asset metadata
- **`src/lib/hyperliquid/client.ts`** — Low-level fetch wrapper for the Hyperliquid info endpoint (POST, no auth required)
- **`src/lib/hyperliquid/queries.ts`** — Domain functions: `getCandleSnapshot`, `getAllCandles` (paginated), `getBchCandles`, `getBchPrice`, `getAvailableAssets`
- **`src/app/api/prices/route.ts`** — Next.js API route exposing price data via `/api/prices`

## API Route Usage

```
GET /api/prices                          → BCH daily candles, last 30 days
GET /api/prices?interval=1h&days=7       → BCH hourly candles, last 7 days
GET /api/prices?coin=ETH&interval=4h     → ETH 4h candles, last 30 days
GET /api/prices?mode=price               → Latest BCH price
GET /api/prices?mode=assets              → All available Hyperliquid perp assets
```

## Library Usage

```typescript
import { getBchCandles, getBchPrice, getAvailableAssets } from '@/lib/hyperliquid/queries'

const candles = await getBchCandles('1d', 30)    // Last 30 daily candles
const { price } = await getBchPrice()             // Latest BCH/USD price
const assets = await getAvailableAssets()          // All available coins
```

## Verification

- `npx tsc --noEmit` — passes
- `npm run build` — passes (route shows as `ƒ /api/prices`)
- `npm run lint` — no new errors
- Live API test confirmed BCH data returns correctly
