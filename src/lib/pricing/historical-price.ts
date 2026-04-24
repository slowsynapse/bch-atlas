/**
 * Historical BCH/USD Price Lookup
 *
 * Fetches and caches historical daily BCH prices from two sources:
 * - Hyperliquid: Dec 2020 onwards (perp market data)
 * - Binance: Mar 2020 – Nov 2020 (free public API, pre-Hyperliquid)
 *
 * Note: CoinGecko and CoinPaprika free APIs now limit historical
 * data to 365 days, so we use Binance for older campaigns.
 *
 * Prices are cached by date key (YYYY-MM-DD) in a module-level Map.
 * Server-side only — never import from client components.
 */

import { getAllCandles } from '@/lib/hyperliquid/queries'

// Module-level cache: dateKey → USD price
const priceCache = new Map<string, number>()
let cachePopulated = false
let cachePromise: Promise<void> | null = null

// Hyperliquid BCH perp data starts around Dec 2020
const HYPERLIQUID_START = new Date('2020-12-01')

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Fetch BCH prices from Binance for the pre-Hyperliquid period.
 * Uses the public klines API — no API key needed.
 * Max 1000 candles per request; we fetch Mar 2020 – Nov 2020.
 */
async function fetchBinancePrices(): Promise<void> {
  const from = new Date('2020-03-01').getTime()
  const to = HYPERLIQUID_START.getTime() - 1

  try {
    const url =
      `https://api.binance.com/api/v3/klines` +
      `?symbol=BCHUSDT&interval=1d&startTime=${from}&endTime=${to}&limit=1000`

    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`Binance API returned ${response.status}, skipping early prices`)
      return
    }

    const data = await response.json()
    // Binance klines: [openTime, open, high, low, close, volume, ...]
    const count = Array.isArray(data) ? data.length : 0

    for (const kline of data) {
      const [openTime, , , , close] = kline
      const dateKey = toDateKey(new Date(Number(openTime)))
      const price = parseFloat(close)
      if (!isNaN(price) && !priceCache.has(dateKey)) {
        priceCache.set(dateKey, price)
      }
    }

    console.log(`[pricing] Binance: cached ${count} daily prices (Mar–Nov 2020)`)
  } catch (error) {
    console.warn('[pricing] Binance fetch failed, early campaigns will lack USD:', error)
  }
}

/**
 * Fetch BCH prices from Hyperliquid for Dec 2020 onwards.
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

    console.log(`[pricing] Hyperliquid: cached ${candles.length} daily prices (Dec 2020–now)`)
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
    // Fetch from both sources in parallel
    await Promise.all([fetchBinancePrices(), fetchHyperliquidPrices()])
    cachePopulated = true
    console.log(`[pricing] Total cached prices: ${priceCache.size} unique dates`)
  })()

  return cachePromise
}

export interface HistoricalPrice {
  price: number
  source: 'hyperliquid' | 'binance'
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

  // Exact match
  const exact = priceCache.get(dateKey)
  if (exact !== undefined) {
    return { price: exact, source: isEarly ? 'binance' : 'hyperliquid', dateKey }
  }

  // Search nearby dates (±1 to ±3 days)
  for (let offset = 1; offset <= 3; offset++) {
    for (const dir of [1, -1]) {
      const nearby = new Date(date.getTime() + dir * offset * 86_400_000)
      const nearbyKey = toDateKey(nearby)
      const price = priceCache.get(nearbyKey)
      if (price !== undefined) {
        return { price, source: isEarly ? 'binance' : 'hyperliquid', dateKey: nearbyKey }
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
