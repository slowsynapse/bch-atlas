# Plan: Hyperliquid API Integration for BCH/USD Price Data

**Date:** 2026-04-08
**Goal:** Add a reusable Hyperliquid API client to fetch BCH/USD historical OHLCV data

## Approach

Follow the existing Chaingraph client pattern (`lib/chaingraph/`):

1. **`src/lib/hyperliquid/client.ts`** — Low-level POST client for the Hyperliquid info endpoint
2. **`src/lib/hyperliquid/queries.ts`** — Domain-specific functions (candle snapshots, meta)
3. **`src/lib/hyperliquid/types.ts`** — TypeScript interfaces for API responses
4. **Next.js API route** (`src/app/api/prices/route.ts`) — HTTP endpoint for client-side consumption

## API Details

- Endpoint: `POST https://api.hyperliquid.xyz/info`
- No authentication required
- `candleSnapshot` type returns OHLCV data
- Max ~500 candles per request, pagination via startTime
- Intervals: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 8h, 12h, 1d, 3d, 1w, 1M

## Files to Create

- `src/lib/hyperliquid/client.ts`
- `src/lib/hyperliquid/queries.ts`
- `src/lib/hyperliquid/types.ts`
- `src/app/api/prices/route.ts`
