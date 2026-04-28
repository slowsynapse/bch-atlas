/**
 * Proper FundMe campaign dating for shared recipient addresses.
 *
 * Problem: 23 addresses are reused across 60 campaigns. The existing
 * backfill (`backfill-fundme-dates.ts`) uses "earliest tx after FundMe
 * launch" per address, which gives every campaign the same date as the
 * first one ever sent to that address.
 *
 * Approach:
 *   1. Group campaigns by recipient address.
 *   2. For each address with >1 campaign:
 *      - Sort campaigns chronologically by FundMe numeric ID (monotonic).
 *      - Fetch each campaign's pledge count from the FundMe API.
 *      - Query Chaingraph for all incoming transactions to the address
 *        in block order.
 *      - Walk the tx stream, assigning the first tx of each campaign's
 *        pledge window as that campaign's date.
 *
 * Single-campaign addresses are left alone — their dates from the
 * existing backfill are correct.
 *
 * Usage:
 *   GITHUB_TOKEN unused — only Chaingraph + FundMe public APIs.
 *   npx tsx scripts/fix-fundme-dating.ts
 *
 * Updates data/fundme.json in place.
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import bchaddr from 'bchaddrjs'
import bs58check from 'bs58check'
import { queryChain } from '../src/lib/chaingraph/client'

interface FundMeCampaign {
  id: string
  url: string
  title: string
  recipientAddresses?: string[]
  time: string
  transactionTimestamp?: string
  blockHeight?: string | number
  [key: string]: unknown
}

const FUNDME_PATH = resolve(__dirname, '..', 'data', 'fundme.json')
const FUNDME_LAUNCH_TS = Math.floor(new Date('2024-05-01T00:00:00Z').getTime() / 1000)

function addressToLockingBytecode(addr: string): string | null {
  try {
    const legacy = bchaddr.toLegacyAddress(addr)
    const decoded = bs58check.decode(legacy)
    const versionByte = decoded[0]
    const hash = Buffer.from(decoded.slice(1)).toString('hex')
    if (versionByte === 0x00) return `76a914${hash}88ac`
    if (versionByte === 0x05) return `a914${hash}87`
    return null
  } catch {
    return null
  }
}

const ALL_TXS_QUERY = `
  query AllTxsForAddr($bytecode: _text!) {
    search_output(
      args: { locking_bytecode_hex: $bytecode },
      where: {
        transaction: {
          block_inclusions: {
            block: { timestamp: { _gte: "${FUNDME_LAUNCH_TS}" } }
          }
        }
      },
      limit: 5000
    ) {
      value_satoshis
      transaction {
        hash
        block_inclusions(limit: 1, order_by: { block: { height: asc } }) {
          block { height timestamp }
        }
      }
    }
  }
`

interface ChainTx {
  hash: string
  height: number
  timestamp: number
  satoshis: number
}

async function fetchAllTxs(addr: string): Promise<ChainTx[]> {
  const bytecode = addressToLockingBytecode(addr)
  if (!bytecode) return []
  const arrayLit = `{${bytecode}}`

  const result = await queryChain<{
    search_output: Array<{
      value_satoshis: string
      transaction: {
        hash: string
        block_inclusions: Array<{ block: { height: string; timestamp: string } }>
      }
    }>
  }>(ALL_TXS_QUERY, { bytecode: arrayLit })

  // Dedupe by tx hash. Chaingraph indexes mainnet AND chipnet/testnet, so
  // block heights are unreliable across networks (a chipnet block 281000
  // may have a 2025 timestamp). Sort by timestamp instead — that's the
  // single chronology we care about for campaign dating.
  // Per-tx, take the EARLIEST block inclusion (smallest timestamp).
  const byHash = new Map<string, ChainTx>()
  for (const o of result.search_output) {
    const inc = o.transaction.block_inclusions[0]
    if (!inc) continue
    const ts = parseInt(inc.block.timestamp, 10)
    const h = parseInt(inc.block.height, 10)
    const sats = parseInt(o.value_satoshis, 10)
    if (isNaN(ts)) continue
    const existing = byHash.get(o.transaction.hash)
    if (!existing || ts < existing.timestamp) {
      byHash.set(o.transaction.hash, { hash: o.transaction.hash, height: h, timestamp: ts, satoshis: sats })
    }
  }

  return [...byHash.values()].sort((a, b) => a.timestamp - b.timestamp)
}

interface FundMeApiCampaign {
  id: string
  name: string
  pledges?: Array<{ pledgeID: number; amount: string }>
  ownersAddress?: string
  status?: string
}

async function fetchFundMeApi(id: string): Promise<FundMeApiCampaign | null> {
  try {
    const r = await fetch(`https://fundme.cash/get-campaign/${id}`, {
      signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) return null
    return await r.json() as FundMeApiCampaign
  } catch {
    return null
  }
}

function fundMeIdFromUrl(url: string): number | null {
  const m = url.match(/[?&]id=(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const raw = readFileSync(FUNDME_PATH, 'utf-8')
  const campaigns: FundMeCampaign[] = JSON.parse(raw)

  // Group by recipient address
  const byAddr = new Map<string, FundMeCampaign[]>()
  for (const c of campaigns) {
    const a = c.recipientAddresses?.[0]
    if (!a) continue
    if (!byAddr.has(a)) byAddr.set(a, [])
    byAddr.get(a)!.push(c)
  }

  const reused = [...byAddr.entries()].filter(([, cs]) => cs.length > 1)
  console.log(`Found ${reused.length} reused addresses covering ${reused.reduce((s, [, cs]) => s + cs.length, 0)} campaigns.`)
  console.log('')

  let updatedCampaigns = 0
  let failedCampaigns = 0

  for (const [addr, addrCampaigns] of reused) {
    // Sort by FundMe numeric ID (monotonic by creation order)
    const sorted = [...addrCampaigns].sort((a, b) => {
      const ai = fundMeIdFromUrl(a.url) ?? 0
      const bi = fundMeIdFromUrl(b.url) ?? 0
      return ai - bi
    })

    console.log(`\n=== ${addr.slice(0, 30)}... (${sorted.length} campaigns) ===`)

    // Fetch pledge counts for each campaign
    const pledgeCounts: number[] = []
    for (const c of sorted) {
      const fId = fundMeIdFromUrl(c.url)
      if (fId === null) {
        pledgeCounts.push(0)
        continue
      }
      const api = await fetchFundMeApi(String(fId))
      const count = api?.pledges?.length ?? 0
      pledgeCounts.push(count)
      console.log(`  fundme#${fId} "${c.title.slice(0, 40)}" — ${count} pledges`)
      await sleep(250)
    }

    // Fetch all on-chain txs for this address
    const txs = await fetchAllTxs(addr)
    console.log(`  on-chain incoming txs: ${txs.length}`)
    await sleep(500)

    if (txs.length === 0) {
      console.log('  ! no on-chain history — skipping')
      failedCampaigns += sorted.length
      continue
    }

    // Walk: assign txs[0..N1] to campaign 0, txs[N1..N1+N2] to campaign 1, etc.
    // Edge case: total pledges < total txs (some donations or claim tx pollute the stream).
    // We'll trust the FundMe pledge counts as the partition.
    let cursor = 0
    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i]
      const n = pledgeCounts[i]
      if (n === 0 || cursor >= txs.length) {
        console.log(`  ${c.id}: no pledges → leaving date as ${c.time}`)
        continue
      }
      const firstTx = txs[cursor]
      const lastTx = txs[Math.min(cursor + n - 1, txs.length - 1)]
      cursor += n

      const newDate = new Date(firstTx.timestamp * 1000).toISOString().split('T')[0]
      const lastDate = new Date(lastTx.timestamp * 1000).toISOString().split('T')[0]
      const oldDate = c.time

      c.time = newDate
      c.transactionTimestamp = String(firstTx.timestamp)
      c.blockHeight = String(firstTx.height)

      if (oldDate !== newDate) {
        console.log(`  ${c.id}: ${oldDate} → ${newDate}  (${n} pledges spanning to ${lastDate})`)
        updatedCampaigns++
      } else {
        console.log(`  ${c.id}: kept ${newDate}`)
      }
    }
  }

  writeFileSync(FUNDME_PATH, JSON.stringify(campaigns, null, 2) + '\n')

  console.log('')
  console.log(`Done. Updated ${updatedCampaigns} campaigns. Failed: ${failedCampaigns}.`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
