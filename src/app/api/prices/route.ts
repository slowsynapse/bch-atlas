import { NextRequest, NextResponse } from 'next/server'
import { getCandleSnapshot, getBchPrice, getAvailableAssets } from '@/lib/hyperliquid/queries'
import type { CandleInterval } from '@/lib/hyperliquid/types'

const VALID_INTERVALS: CandleInterval[] = [
  '1m', '3m', '5m', '15m', '30m',
  '1h', '2h', '4h', '8h', '12h',
  '1d', '3d', '1w', '1M',
]

/**
 * GET /api/prices
 *
 * Query params:
 *   coin      - Asset symbol (default: "BCH")
 *   interval  - Candle interval (default: "1d")
 *   start     - Start time as epoch ms or ISO date
 *   end       - End time as epoch ms or ISO date (default: now)
 *   days      - Shorthand: fetch last N days (default: 30, ignored if start is set)
 *
 * Special modes:
 *   mode=price  - Returns only the latest price for the coin
 *   mode=assets - Returns list of available assets
 *
 * Examples:
 *   /api/prices                          → BCH daily candles, last 30 days
 *   /api/prices?interval=1h&days=7       → BCH hourly candles, last 7 days
 *   /api/prices?coin=ETH&interval=4h     → ETH 4h candles, last 30 days
 *   /api/prices?mode=price               → Latest BCH price
 *   /api/prices?mode=assets              → All available assets
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const mode = params.get('mode')

    if (mode === 'price') {
      const data = await getBchPrice()
      return NextResponse.json(data)
    }

    if (mode === 'assets') {
      const assets = await getAvailableAssets()
      return NextResponse.json({ assets })
    }

    const coin = params.get('coin') || 'BCH'
    const interval = (params.get('interval') || '1d') as CandleInterval

    if (!VALID_INTERVALS.includes(interval)) {
      return NextResponse.json(
        { error: `Invalid interval. Valid: ${VALID_INTERVALS.join(', ')}` },
        { status: 400 }
      )
    }

    const now = Date.now()
    let endTime = now
    let startTime: number

    const endParam = params.get('end')
    if (endParam) {
      endTime = isNaN(Number(endParam)) ? new Date(endParam).getTime() : Number(endParam)
    }

    const startParam = params.get('start')
    if (startParam) {
      startTime = isNaN(Number(startParam)) ? new Date(startParam).getTime() : Number(startParam)
    } else {
      const days = parseInt(params.get('days') || '30', 10)
      startTime = endTime - days * 86_400_000
    }

    if (isNaN(startTime) || isNaN(endTime)) {
      return NextResponse.json({ error: 'Invalid time parameters' }, { status: 400 })
    }

    const candles = await getCandleSnapshot(coin, interval, startTime, endTime)

    return NextResponse.json({
      coin,
      interval,
      startTime,
      endTime,
      count: candles.length,
      candles,
    })
  } catch (error) {
    console.error('Price API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price data' },
      { status: 500 }
    )
  }
}
