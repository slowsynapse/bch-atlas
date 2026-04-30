/**
 * Historical BCH/USD Price Lookup
 *
 * Two sources:
 * - Hyperliquid: Oct 2020 onwards (perp market data, fetched at request time).
 * - Static JSON: Mar 2020 – Sept 2020 (pre-Hyperliquid; baked into the repo
 *   from Binance once and never changes — Binance geoblocks Vercel egress).
 *
 * Prices are cached by date key (YYYY-MM-DD) in a module-level Map.
 * Server-side only — never import from client components.
 */

import { getAllCandles } from '@/lib/hyperliquid/queries'
import staticPrices2020 from './static-bch-prices-2020.json'

// Module-level cache: dateKey → USD price
const priceCache = new Map<string, number>()
let cachePopulated = false
let cachePromise: Promise<void> | null = null

// Hyperliquid BCH perp data starts Oct 4, 2020 — earlier than the previous
// Dec 2020 assumption. Anything before Oct comes from the static file.
const HYPERLIQUID_START = new Date('2020-10-01')

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Load the bundled pre-Oct-2020 daily prices into the cache. Synchronous —
 * no network call, no failure modes, no Binance dependency at runtime.
 */
function loadStaticPrices(): void {
  const entries = Object.entries(staticPrices2020 as Record<string, number>)
  for (const [dateKey, price] of entries) {
    if (!priceCache.has(dateKey)) priceCache.set(dateKey, price)
  }
  console.log(`[pricing] Static: loaded ${entries.length} daily prices (Mar–Sept 2020)`)
}

/**
 * Fetch BCH prices from Hyperliquid for Oct 2020 onwards.
 * Uses daily candles with automatic pagination.
 */
async function fetchHyperliquidPrices(): Promise<void> {
  const startTime = HYPERLIQUID_START.getTime()
  const endTime = Date.now()

  try {
    const candles = await getAllCandles('BCH', '1d', startTime, endTime)

    for (const candle of candles) {
      const dateKey = toDateKey(new Date(candle.openTime))
      // Use the close price as the daily price
      priceCache.set(dateKey, candle.close)
    }

    console.log(`[pricing] Hyperliquid: cached ${candles.length} daily prices (Oct 2020–now)`)
  } catch (error) {
    console.warn('[pricing] Hyperliquid fetch failed:', error)
  }
}

/**
 * Populate the price cache from both sources.
 * Safe to call multiple times — only fetches once.
 */
export async function ensurePriceCache(): Promise<void> {
  if (cachePopulated) return
  if (cachePromise) return cachePromise

  cachePromise = (async () => {
    loadStaticPrices()
    await fetchHyperliquidPrices()
    cachePopulated = true
    console.log(`[pricing] Total cached prices: ${priceCache.size} unique dates`)
  })()

  return cachePromise
}

export interface HistoricalPrice {
  price: number
  source: 'hyperliquid' | 'static'
  dateKey: string
}

/**
 * Look up the BCH/USD price for a given date.
 *
 * If an exact date match isn't found, searches nearby dates (±3 days).
 * Returns null for dates with no available price data.
 */
export function getPriceForDate(date: Date): HistoricalPrice | null {
  const dateKey = toDateKey(date)
  const isEarly = date < HYPERLIQUID_START
  const source: HistoricalPrice['source'] = isEarly ? 'static' : 'hyperliquid'

  // Exact match
  const exact = priceCache.get(dateKey)
  if (exact !== undefined) {
    return { price: exact, source, dateKey }
  }

  // Search nearby dates (±1 to ±3 days)
  for (let offset = 1; offset <= 3; offset++) {
    for (const dir of [1, -1]) {
      const nearby = new Date(date.getTime() + dir * offset * 86_400_000)
      const nearbyKey = toDateKey(nearby)
      const price = priceCache.get(nearbyKey)
      if (price !== undefined) {
        return { price, source, dateKey: nearbyKey }
      }
    }
  }

  return null
}

/**
 * Get the historical BCH/USD price for a campaign date.
 *
 * Resolves the campaign date from transactionTimestamp or time field,
 * then looks up the price. Returns null if no date or no price data.
 */
export async function getHistoricalBchPrice(
  transactionTimestamp?: string,
  timeField?: string
): Promise<HistoricalPrice | null> {
  await ensurePriceCache()

  let date: Date | null = null

  if (transactionTimestamp) {
    const ts = Number(transactionTimestamp)
    if (!isNaN(ts) && ts > 0) {
      date = new Date(ts * 1000)
    }
  }

  if (!date && timeField) {
    const parsed = new Date(timeField)
    if (!isNaN(parsed.getTime())) {
      date = parsed
    }
  }

  if (!date) return null

  return getPriceForDate(date)
}
