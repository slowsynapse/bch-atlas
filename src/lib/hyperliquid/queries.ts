/**
 * Hyperliquid Queries
 *
 * Domain-specific functions for fetching price data from Hyperliquid.
 *
 * Usage:
 *   import { getBchCandles, getBchPrice, getAvailableAssets } from '@/lib/hyperliquid/queries'
 *
 *   // Get daily BCH candles for the last 30 days
 *   const candles = await getBchCandles('1d', 30)
 *
 *   // Get BCH candles with explicit time range
 *   const candles = await getCandleSnapshot('BCH', '1h', startMs, endMs)
 *
 *   // Get all candles with automatic pagination (up to 5000)
 *   const allCandles = await getAllCandles('BCH', '1h', startMs, endMs)
 *
 *   // Get latest BCH price
 *   const price = await getBchPrice()
 *
 *   // List all available perp assets
 *   const assets = await getAvailableAssets()
 */

import { queryInfo } from './client'
import type { Candle, CandleInterval, CandleSnapshot, Meta } from './types'

/**
 * Parse a raw candle snapshot into a typed Candle object with numeric values
 */
function parseCandle(raw: CandleSnapshot): Candle {
  return {
    openTime: raw.t,
    closeTime: raw.T,
    open: parseFloat(raw.o),
    close: parseFloat(raw.c),
    high: parseFloat(raw.h),
    low: parseFloat(raw.l),
    volume: parseFloat(raw.v),
    trades: raw.n,
  }
}

/**
 * Fetch OHLCV candle data for a coin
 *
 * Returns up to ~500 candles per request.
 * All perps are quoted in USD — no "/USD" suffix needed.
 */
export async function getCandleSnapshot(
  coin: string,
  interval: CandleInterval,
  startTime: number,
  endTime: number
): Promise<Candle[]> {
  const raw = await queryInfo<CandleSnapshot[]>({
    type: 'candleSnapshot',
    req: { coin, interval, startTime, endTime },
  })

  return raw.map(parseCandle)
}

/**
 * Fetch all candles in a time range with automatic pagination
 *
 * The API returns ~500 candles per request. This function paginates
 * by using the last candle's close time as the next startTime.
 * Hyperliquid stores up to 5000 historical candles per interval.
 */
export async function getAllCandles(
  coin: string,
  interval: CandleInterval,
  startTime: number,
  endTime: number
): Promise<Candle[]> {
  const allCandles: Candle[] = []
  let cursor = startTime

  while (cursor < endTime) {
    const batch = await getCandleSnapshot(coin, interval, cursor, endTime)

    if (batch.length === 0) break

    allCandles.push(...batch)

    // Move cursor past the last candle's close time
    const lastCandle = batch[batch.length - 1]
    cursor = lastCandle.closeTime + 1

    // Rate limit: small delay between paginated requests
    if (cursor < endTime) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  return allCandles
}

/**
 * Convenience: get BCH candles for the last N periods
 */
export async function getBchCandles(
  interval: CandleInterval = '1d',
  periods: number = 30
): Promise<Candle[]> {
  const endTime = Date.now()
  const intervalMs = intervalToMs(interval)
  const startTime = endTime - intervalMs * periods

  return getAllCandles('BCH', interval, startTime, endTime)
}

/**
 * Get the latest BCH/USD price from the most recent 1m candle
 */
export async function getBchPrice(): Promise<{
  price: number
  timestamp: number
}> {
  const now = Date.now()
  const candles = await getCandleSnapshot('BCH', '1m', now - 120_000, now)

  if (candles.length === 0) {
    throw new Error('No recent BCH candle data available')
  }

  const latest = candles[candles.length - 1]
  return {
    price: latest.close,
    timestamp: latest.closeTime,
  }
}

/**
 * List all available perpetual assets on Hyperliquid
 */
export async function getAvailableAssets(): Promise<string[]> {
  const meta = await queryInfo<Meta>({ type: 'meta' })
  return meta.universe.map((asset) => asset.name)
}

/**
 * Convert interval string to approximate milliseconds
 */
function intervalToMs(interval: CandleInterval): number {
  const map: Record<CandleInterval, number> = {
    '1m': 60_000,
    '3m': 180_000,
    '5m': 300_000,
    '15m': 900_000,
    '30m': 1_800_000,
    '1h': 3_600_000,
    '2h': 7_200_000,
    '4h': 14_400_000,
    '8h': 28_800_000,
    '12h': 43_200_000,
    '1d': 86_400_000,
    '3d': 259_200_000,
    '1w': 604_800_000,
    '1M': 2_592_000_000,
  }
  return map[interval]
}
