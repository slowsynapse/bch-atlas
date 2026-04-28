/**
 * Backfill `time` for Flipstarter campaigns missing it.
 *
 * Source data (data/flipstarters-with-addresses.json) has zero campaigns
 * with a `time` field. This script tries three sources in priority order:
 *
 *   1. On-chain (best, ~145 campaigns): if a campaign has `tx`, query
 *      Chaingraph for the transaction's block timestamp. The `tx` is the
 *      Flipstarter assurance-claim transaction — when the campaign
 *      reached its goal and funds were released to the recipient.
 *
 *   2. Archive URL date extraction (~14 campaigns): some `archive` URLs
 *      from flipbackend.bitcoincash.network embed an ISO date in the
 *      filename (e.g. `..._expired_2021-04-13T103438...png`). Use that
 *      as the campaign's end date.
 *
 *   3. Wayback CDX earliest snapshot (last resort): for Flipstarters
 *      with neither tx nor parseable archive date, query the Wayback
 *      Machine's CDX index for the campaign's `url` field and take the
 *      earliest snapshot timestamp as the date.
 *
 * The script writes back to data/flipstarters-with-addresses.json in
 * place. IDs are now stable (independent of `time`), so adding `time`
 * does not change any campaign ID.
 *
 * Usage:
 *   npx tsx scripts/backfill-flipstarter-dates.ts
 *   npx tsx scripts/backfill-flipstarter-dates.ts --dry-run
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { queryChain } from '../src/lib/chaingraph/client'

interface Flipstarter {
  amount: number
  title: string
  description?: string
  category?: string[]
  status: string
  tx?: string
  url: string
  time?: string
  announcement?: string[]
  archive?: string[]
  recipientAddresses?: string[]
  [key: string]: unknown
}

const PATH = resolve(__dirname, '..', 'data', 'flipstarters-with-addresses.json')
const DRY_RUN = process.argv.includes('--dry-run')

// ────────────────────────── Source 1: on-chain tx ──────────────────────────

const TX_TIMESTAMP_QUERY = `
  query GetTxTimestamp($txHash: bytea!) {
    transaction(where: { hash: { _eq: $txHash } }) {
      block_inclusions(limit: 1, order_by: { block: { height: asc } }) {
        block { height timestamp }
      }
    }
  }
`

async function fetchTxDate(txHex: string): Promise<{ date: string; height: number; ts: number } | null> {
  try {
    const result = await queryChain<{
      transaction: Array<{
        block_inclusions: Array<{ block: { height: string; timestamp: string } }>
      }>
    }>(TX_TIMESTAMP_QUERY, { txHash: `\\x${txHex}` })

    const inc = result.transaction[0]?.block_inclusions[0]
    if (!inc) return null
    const ts = parseInt(inc.block.timestamp, 10)
    const h = parseInt(inc.block.height, 10)
    if (isNaN(ts)) return null
    return {
      date: new Date(ts * 1000).toISOString().split('T')[0],
      height: h,
      ts,
    }
  } catch (err) {
    console.warn(`  ! Chaingraph error for tx ${txHex.slice(0, 12)}…:`, err instanceof Error ? err.message : err)
    return null
  }
}

// ────────────────────── Source 2: archive URL date ──────────────────────

// flipbackend.bitcoincash.network/media/screenshots/<slug>_<status>_<YYYY-MM-DD>T<HHMMSS>...png
// Status tokens we've seen: running, expired, active, completed, ended, stopped.
// Captures the YYYY-MM-DD; the optional T-separated time portion is ignored.
const ARCHIVE_DATE_RE = /flipbackend\.bitcoincash\.network\/[^"\s]*?_(?:running|expired|active|completed|ended|stopped)_(\d{4}-\d{2}-\d{2})/i

function dateFromArchive(archive: string[] | undefined): string | null {
  if (!archive) return null
  for (const a of archive) {
    const m = a.match(ARCHIVE_DATE_RE)
    if (m) return m[1]
  }
  return null
}

// ────────────────────── Source 3: Wayback CDX ──────────────────────

interface WaybackSnapshot {
  timestamp: string
  url: string
}

async function fetchWaybackEarliest(targetUrl: string): Promise<string | null> {
  // CDX query. Output is JSON lines: [["timestamp","url"], ...]
  // ?limit=1 with default sort returns earliest. fl=timestamp,original.
  // We filter to >=2020 because Flipstarter launched in 2020 — Wayback
  // can return earlier snapshots when the host (e.g. a personal domain
  // or shared IP) was archived for unrelated content years before the
  // campaign existed.
  const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(targetUrl)}&output=json&fl=timestamp,original&from=20200101&limit=1`
  try {
    const res = await fetch(cdxUrl, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const rows = await res.json() as string[][]
    if (rows.length < 2) return null
    const [ts] = rows[1]
    if (!ts || ts.length < 8) return null
    return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`
  } catch {
    return null
  }
}

// ────────────────────────────────── main ──────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  const raw = readFileSync(PATH, 'utf-8')
  const campaigns: Flipstarter[] = JSON.parse(raw)

  const total = campaigns.length
  const needs = campaigns.filter(c => !c.time)
  console.log(`Total Flipstarters: ${total}`)
  console.log(`Already dated:      ${total - needs.length}`)
  console.log(`Needs backfill:     ${needs.length}`)
  console.log(DRY_RUN ? '\n[DRY RUN — no file writes]\n' : '')

  let updatedFromTx = 0
  let updatedFromArchive = 0
  let updatedFromWayback = 0
  let stillMissing = 0

  for (let i = 0; i < needs.length; i++) {
    const c = needs[i]
    const label = `[${i + 1}/${needs.length}] ${c.title.slice(0, 55)}`

    // Source 1: tx timestamp
    if (c.tx) {
      const r = await fetchTxDate(c.tx)
      if (r) {
        c.time = r.date
        ;(c as Flipstarter).transactionTimestamp = String(r.ts)
        ;(c as Flipstarter).blockHeight = r.height
        console.log(`✓ tx       ${r.date}  ${label}`)
        updatedFromTx++
        await sleep(150)
        continue
      }
      // Fall through to other sources if tx lookup failed
    }

    // Source 2: archive URL date
    const archDate = dateFromArchive(c.archive)
    if (archDate) {
      c.time = archDate
      console.log(`✓ archive  ${archDate}  ${label}`)
      updatedFromArchive++
      continue
    }

    // Source 3: Wayback CDX
    const wbDate = await fetchWaybackEarliest(c.url)
    if (wbDate) {
      c.time = wbDate
      console.log(`✓ wayback  ${wbDate}  ${label}`)
      updatedFromWayback++
      await sleep(300)
      continue
    }

    console.log(`✗ NO DATE  ${label}  url=${c.url}`)
    stillMissing++
  }

  if (!DRY_RUN) {
    writeFileSync(PATH, JSON.stringify(campaigns, null, 2) + '\n')
    console.log(`\nWrote ${PATH}`)
  }

  console.log('')
  console.log('Summary:')
  console.log(`  on-chain tx:     ${updatedFromTx}`)
  console.log(`  archive URL:     ${updatedFromArchive}`)
  console.log(`  wayback CDX:     ${updatedFromWayback}`)
  console.log(`  still missing:   ${stillMissing}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
