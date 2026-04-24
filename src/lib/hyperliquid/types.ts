/**
 * Hyperliquid API Types
 *
 * Type definitions for the Hyperliquid info endpoint responses.
 * Docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
 */

export type CandleInterval =
  | '1m' | '3m' | '5m' | '15m' | '30m'
  | '1h' | '2h' | '4h' | '8h' | '12h'
  | '1d' | '3d' | '1w' | '1M'

export interface CandleSnapshot {
  /** Open time (epoch ms) */
  t: number
  /** Close time (epoch ms) */
  T: number
  /** Symbol */
  s: string
  /** Interval */
  i: string
  /** Open price */
  o: string
  /** Close price */
  c: string
  /** High price */
  h: string
  /** Low price */
  l: string
  /** Volume (base asset units) */
  v: string
  /** Number of trades */
  n: number
}

export interface Candle {
  openTime: number
  closeTime: number
  open: number
  close: number
  high: number
  low: number
  volume: number
  trades: number
}

export interface AssetMeta {
  name: string
  szDecimals: number
  maxLeverage: number
  onlyIsolated: boolean
}

export interface Meta {
  universe: AssetMeta[]
}
