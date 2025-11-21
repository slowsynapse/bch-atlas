/**
 * Chaingraph GraphQL Queries
 *
 * These queries extract address information from Flipstarter assurance contract transactions.
 *
 * Flipstarter transactions have a specific structure:
 * - INPUTS: Contains contributor addresses (people who pledged BCH)
 * - OUTPUTS: Contains recipient addresses (the campaign beneficiaries)
 */

import { queryChain, hexToBase64 } from './client'

// Simple base32 encoding for CashAddr (subset we need)
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'

function polymod(values: number[]): number {
  let c = 1
  for (const v of values) {
    const c0 = c >>> 35
    c = ((c & 0x07ffffffff) << 5) ^ v
    if (c0 & 1) c ^= 0x98f2bc8e61
    if (c0 & 2) c ^= 0x79b76d99e2
    if (c0 & 4) c ^= 0xf33e5fb3c4
    if (c0 & 8) c ^= 0xae2eabe2a8
    if (c0 & 16) c ^= 0x1e4f43e470
  }
  return c ^ 1
}

function encodeCashAddress(prefix: string, type: 'P2PKH' | 'P2SH', hash: Buffer): string {
  const versionByte = type === 'P2PKH' ? 0 : 8
  const payload = Buffer.concat([Buffer.from([versionByte]), hash])

  // Convert 8-bit to 5-bit
  const data: number[] = []
  let acc = 0
  let bits = 0
  for (const byte of payload) {
    acc = (acc << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      data.push((acc >>> bits) & 31)
    }
  }
  if (bits > 0) {
    data.push((acc << (5 - bits)) & 31)
  }

  // Calculate checksum
  const prefixData = []
  for (let i = 0; i < prefix.length; i++) {
    prefixData.push(prefix.charCodeAt(i) & 31)
  }
  prefixData.push(0)
  const checksumInput = prefixData.concat(data).concat([0, 0, 0, 0, 0, 0, 0, 0])
  const checksum = polymod(checksumInput)
  const checksumBytes = []
  for (let i = 0; i < 8; i++) {
    checksumBytes.push((checksum >>> (5 * (7 - i))) & 31)
  }

  const combined = data.concat(checksumBytes)
  let result = ''
  for (const d of combined) {
    result += CHARSET[d]
  }

  return `${prefix}:${result}`
}

/**
 * GraphQL query to get transaction details with inputs and outputs
 */
const GET_TRANSACTION_QUERY = `
  query GetTransaction($txHash: bytea!) {
    transaction(where: { hash: { _eq: $txHash } }) {
      hash
      block_inclusions {
        block {
          height
          timestamp
        }
      }
      inputs {
        input_index
        outpoint_transaction_hash
        outpoint_index
        unlocking_bytecode
        value_satoshis
      }
      outputs {
        output_index
        locking_bytecode
        value_satoshis
      }
    }
  }
`

/**
 * Extract CashAddress from locking bytecode
 *
 * BCH uses CashAddr format: bitcoincash:qr... or bitcoincash:pp...
 * Locking bytecode contains the address in different formats:
 * - P2PKH: OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
 * - P2SH: OP_HASH160 <20 bytes> OP_EQUAL
 */
export function extractAddressFromBytecode(bytecode: string): string | null {
  try {
    // Chaingraph returns bytecode with \x prefix - remove it
    let hex = bytecode.startsWith('\\x') ? bytecode.substring(2) : bytecode

    // P2PKH pattern: 76a914<20 bytes>88ac
    const p2pkhMatch = hex.match(/^76a914([0-9a-f]{40})88ac$/)
    if (p2pkhMatch) {
      const hash160 = p2pkhMatch[1]
      return encodeCashAddress('bitcoincash', 'P2PKH', Buffer.from(hash160, 'hex'))
    }

    // P2SH pattern: a914<20 bytes>87
    const p2shMatch = hex.match(/^a914([0-9a-f]{40})87$/)
    if (p2shMatch) {
      const hash160 = p2shMatch[1]
      return encodeCashAddress('bitcoincash', 'P2SH', Buffer.from(hash160, 'hex'))
    }

    return null
  } catch (error) {
    console.error('Error extracting address from bytecode:', error)
    return null
  }
}

export interface TransactionAddress {
  address: string
  type: 'contributor' | 'recipient'
  valueSatoshis: string
}

export interface TransactionAddresses {
  txHash: string
  blockHeight?: number
  timestamp?: string
  contributors: TransactionAddress[]
  recipients: TransactionAddress[]
}

/**
 * Get all addresses (contributors and recipients) from a transaction
 */
export async function getTransactionAddresses(
  txHashHex: string
): Promise<TransactionAddresses | null> {
  try {
    // Chaingraph uses bytea format with \x prefix
    // Hash is used as-is (not reversed)
    const data = await queryChain<{
      transaction: Array<{
        hash: string
        block_inclusions: Array<{
          block: {
            height: number
            timestamp: string
          }
        }>
        inputs: Array<{
          input_index: number
          outpoint_transaction_hash: string
          outpoint_index: number
          unlocking_bytecode: string
          value_satoshis: string
        }>
        outputs: Array<{
          output_index: number
          locking_bytecode: string
          value_satoshis: string
        }>
      }>
    }>(GET_TRANSACTION_QUERY, {
      txHash: `\\x${txHashHex}`
    })

    if (!data.transaction || data.transaction.length === 0) {
      console.warn(`Transaction not found: ${txHashHex}`)
      return null
    }

    const tx = data.transaction[0]

    // For Flipstarter transactions, contributors are harder to extract
    // We'd need to look up each input's outpoint transaction
    // For now, we'll just extract recipients from outputs
    const contributors: TransactionAddress[] = []

    // Extract recipient addresses from outputs
    const recipients: TransactionAddress[] = tx.outputs
      .map((output) => {
        const address = extractAddressFromBytecode(output.locking_bytecode)
        if (!address) return null
        return {
          address,
          type: 'recipient' as const,
          valueSatoshis: output.value_satoshis,
        }
      })
      .filter((addr): addr is TransactionAddress => addr !== null)

    return {
      txHash: txHashHex,
      blockHeight: tx.block_inclusions[0]?.block.height,
      timestamp: tx.block_inclusions[0]?.block.timestamp,
      contributors,
      recipients,
    }
  } catch (error) {
    console.error(`Error fetching transaction ${txHashHex}:`, error)
    return null
  }
}

/**
 * Batch fetch addresses for multiple transactions
 */
export async function batchGetTransactionAddresses(
  txHashes: string[]
): Promise<Map<string, TransactionAddresses>> {
  const results = new Map<string, TransactionAddresses>()

  // Process in batches to avoid overwhelming the API
  const batchSize = 5
  for (let i = 0; i < txHashes.length; i += batchSize) {
    const batch = txHashes.slice(i, i + batchSize)

    const promises = batch.map(async (txHash) => {
      const addresses = await getTransactionAddresses(txHash)
      if (addresses) {
        results.set(txHash, addresses)
      }
    })

    await Promise.all(promises)

    // Small delay between batches to be respectful to the API
    if (i + batchSize < txHashes.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return results
}
