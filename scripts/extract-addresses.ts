/**
 * Extract addresses from all Flipstarter campaigns with transaction hashes
 *
 * This script:
 * 1. Reads flipstarters.json
 * 2. Filters campaigns with tx field (61 campaigns)
 * 3. Queries Chaingraph for each transaction
 * 4. Extracts recipient addresses
 * 5. Saves enriched data to flipstarters-with-addresses.json
 *
 * Usage:
 *   npx tsx scripts/extract-addresses.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { batchGetTransactionAddresses } from '../src/lib/chaingraph/queries'

interface Campaign {
  amount: number
  title: string
  status: string
  time: string
  url: string
  tx?: string
  [key: string]: any
}

interface EnrichedCampaign extends Campaign {
  recipientAddresses?: string[]
  blockHeight?: number | string
  transactionTimestamp?: string
}

async function main() {
  console.log('📂 Reading flipstarters.json...\n')

  const dataPath = path.join(process.cwd(), 'data', 'flipstarters.json')
  const campaigns: Campaign[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))

  console.log(`✅ Loaded ${campaigns.length} total campaigns`)

  // Filter campaigns with tx field
  const campaignsWithTx = campaigns.filter(c => c.tx)
  console.log(`🔍 Found ${campaignsWithTx.length} campaigns with transaction hashes\n`)

  // Extract transaction hashes
  const txHashes = campaignsWithTx.map(c => c.tx!)

  console.log('🌐 Querying Chaingraph for transaction data...')
  console.log('⏱️  This may take a few minutes (processing in batches of 5)...\n')

  const startTime = Date.now()
  const addressData = await batchGetTransactionAddresses(txHashes)
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log(`\n✅ Successfully fetched ${addressData.size} transactions in ${elapsed}s\n`)

  // Enrich campaigns with address data
  const enrichedCampaigns: EnrichedCampaign[] = campaigns.map(campaign => {
    if (!campaign.tx) {
      return campaign
    }

    const txData = addressData.get(campaign.tx)
    if (!txData) {
      console.warn(`⚠️  No data for tx: ${campaign.tx} (${campaign.title})`)
      return campaign
    }

    return {
      ...campaign,
      recipientAddresses: txData.recipients.map(r => r.address),
      blockHeight: txData.blockHeight,
      transactionTimestamp: txData.timestamp,
    }
  })

  // Calculate statistics
  const campaignsWithAddresses = enrichedCampaigns.filter(c => c.recipientAddresses && c.recipientAddresses.length > 0)
  const totalRecipients = campaignsWithAddresses.reduce((sum, c) => sum + (c.recipientAddresses?.length || 0), 0)
  const avgRecipientsPerCampaign = (totalRecipients / campaignsWithAddresses.length).toFixed(2)

  console.log('📊 Statistics:')
  console.log(`  Campaigns with addresses: ${campaignsWithAddresses.length}`)
  console.log(`  Total unique outputs: ${totalRecipients}`)
  console.log(`  Avg outputs per campaign: ${avgRecipientsPerCampaign}`)

  // Count unique recipient addresses
  const allRecipients = new Set<string>()
  campaignsWithAddresses.forEach(c => {
    c.recipientAddresses?.forEach(addr => allRecipients.add(addr))
  })
  console.log(`  Unique recipient addresses: ${allRecipients.size}\n`)

  // Save enriched data
  const outputPath = path.join(process.cwd(), 'data', 'flipstarters-with-addresses.json')
  fs.writeFileSync(outputPath, JSON.stringify(enrichedCampaigns, null, 2))

  console.log(`💾 Saved enriched data to: ${outputPath}`)
  console.log('\n✨ Address extraction complete!')
}

main().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})
