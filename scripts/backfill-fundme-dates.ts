/**
 * Backfill FundMe campaign dates from on-chain data via Chaingraph.
 *
 * The FundMe API does not expose campaign creation timestamps, so every
 * campaign defaults to the fetch date in fetch-fundme.ts. This script
 * queries Chaingraph for the earliest transaction sending BCH to each
 * campaign's recipient address (effectively the first pledge or claim
 * transaction) and uses that block's timestamp as the campaign date.
 *
 * Usage:
 *   npx tsx scripts/backfill-fundme-dates.ts
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
  [key: string]: unknown
}

const FUNDME_PATH = resolve(__dirname, '..', 'data', 'fundme.json')

/**
 * Convert a BCH cashaddr to its P2PKH locking bytecode hex.
 * P2PKH: OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG = 76 a9 14 <hash> 88 ac
 * P2SH:  OP_HASH160 <20 bytes> OP_EQUAL = a9 14 <hash> 87
 */
function addressToLockingBytecode(addr: string): string | null {
  try {
    const legacy = bchaddr.toLegacyAddress(addr)
    const decoded = bs58check.decode(legacy)
    const versionByte = decoded[0]
    const hash = Buffer.from(decoded.slice(1)).toString('hex')
    if (versionByte === 0x00) {
      // P2PKH (mainnet)
      return `76a914${hash}88ac`
    } else if (versionByte === 0x05) {
      // P2SH (mainnet)
      return `a914${hash}87`
    }
    return null
  } catch {
    return null
  }
}

const FIRST_TX_QUERY = `
  query FirstTxForBytecode($bytecode: _text!) {
    search_output(
      args: { locking_bytecode_hex: $bytecode },
      limit: 50
    ) {
      transaction {
        hash
        block_inclusions(limit: 1, order_by: { block: { height: asc } }) {
          block {
            height
            timestamp
          }
        }
      }
    }
  }
`

interface SearchOutputResult {
  search_output: Array<{
    transaction: {
      hash: string
      block_inclusions: Array<{
        block: { height: string; timestamp: string }
      }>
    }
  }>
}

/**
 * Find the earliest block timestamp among all outputs to this address.
 * Chaingraph's search_output doesn't sort by block height directly, so
 * we fetch up to 50 outputs and pick the minimum.
 */
async function getEarliestTxTimestamp(addr: string): Promise<{ timestamp: number; height: number } | null> {
  const bytecode = addressToLockingBytecode(addr)
  if (!bytecode) return null

  const arrayLiteral = `{${bytecode}}` // Postgres _text array literal

  try {
    const result = await queryChain<SearchOutputResult>(FIRST_TX_QUERY, { bytecode: arrayLiteral })
    if (!result.search_output || result.search_output.length === 0) return null

    let minTs: number | null = null
    let minHeight: number | null = null
    for (const o of result.search_output) {
      const inc = o.transaction.block_inclusions[0]
      if (!inc) continue
      const ts = parseInt(inc.block.timestamp, 10)
      const h = parseInt(inc.block.height, 10)
      if (isNaN(ts) || isNaN(h)) continue
      if (minTs === null || h < minHeight!) {
        minTs = ts
        minHeight = h
      }
    }

    if (minTs === null || minHeight === null) return null
    return { timestamp: minTs, height: minHeight }
  } catch (err: any) {
    console.error(`  GraphQL error for ${addr}: ${err.message}`)
    return null
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const raw = readFileSync(FUNDME_PATH, 'utf-8')
  const campaigns: FundMeCampaign[] = JSON.parse(raw)

  console.log(`Backfilling dates for ${campaigns.length} FundMe campaigns...`)
  console.log('Querying Chaingraph for each recipient address (~300ms between requests)\n')

  let updated = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < campaigns.length; i++) {
    const c = campaigns[i]
    const progress = `[${i + 1}/${campaigns.length}]`
    const recipient = c.recipientAddresses?.[0]

    if (!recipient) {
      console.log(`${progress} - ${c.title.slice(0, 50)} — skipped (no recipient)`)
      skipped++
      continue
    }

    const result = await getEarliestTxTimestamp(recipient)
    if (!result) {
      console.log(`${progress} ? ${c.title.slice(0, 50)} — no on-chain history`)
      failed++
      await sleep(300)
      continue
    }

    const date = new Date(result.timestamp * 1000)
    const dateStr = date.toISOString().split('T')[0]
    const oldDate = c.time

    c.time = dateStr
    ;(c as any).transactionTimestamp = String(result.timestamp)
    ;(c as any).blockHeight = result.height

    console.log(`${progress} + ${c.title.slice(0, 50)} — ${dateStr} (block ${result.height})${oldDate !== dateStr ? ` (was: ${oldDate})` : ''}`)
    updated++

    await sleep(300)
  }

  writeFileSync(FUNDME_PATH, JSON.stringify(campaigns, null, 2) + '\n')

  console.log('')
  console.log(`Done. Updated: ${updated}, skipped: ${skipped}, failed: ${failed}`)
  console.log(`Wrote ${FUNDME_PATH}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
