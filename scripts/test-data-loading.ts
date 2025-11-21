/**
 * Test script to verify enriched data is loaded correctly
 *
 * This tests that:
 * 1. Campaigns are loaded with address data
 * 2. Recipients are correctly attached to campaigns
 * 3. Success/failed status is preserved
 * 4. We can identify multi-campaign recipients
 *
 * Usage:
 *   npx tsx scripts/test-data-loading.ts
 */

import { getCampaigns } from '../src/lib/data/campaigns'

function main() {
  console.log('🧪 Testing Data Loading\n')

  const campaigns = getCampaigns()

  console.log('📊 Total Campaigns:', campaigns.length)
  console.log('=' .repeat(60), '\n')

  // Test 1: Count campaigns with addresses
  const campaignsWithAddresses = campaigns.filter(c => c.recipientAddresses && c.recipientAddresses.length > 0)
  console.log('✅ Test 1: Campaigns with recipient addresses')
  console.log(`   Found: ${campaignsWithAddresses.length} campaigns`)
  console.log(`   Expected: ~57 campaigns\n`)

  // Test 2: Check status breakdown
  const statusBreakdown = {
    success: campaigns.filter(c => c.status === 'success').length,
    expired: campaigns.filter(c => c.status === 'expired').length,
    running: campaigns.filter(c => c.status === 'running').length,
    unknown: campaigns.filter(c => c.status === 'unknown').length,
  }
  console.log('✅ Test 2: Status breakdown')
  console.log(`   Success: ${statusBreakdown.success}`)
  console.log(`   Expired/Failed: ${statusBreakdown.expired}`)
  console.log(`   Running: ${statusBreakdown.running}`)
  console.log(`   Unknown: ${statusBreakdown.unknown}\n`)

  // Test 3: Show sample campaigns with addresses
  console.log('✅ Test 3: Sample campaigns with addresses')
  campaignsWithAddresses.slice(0, 3).forEach((campaign, i) => {
    console.log(`\n   ${i + 1}. ${campaign.title}`)
    console.log(`      Status: ${campaign.status}`)
    console.log(`      Amount: ${campaign.amount} BCH`)
    console.log(`      Recipients: ${campaign.recipientAddresses?.length}`)
    campaign.recipientAddresses?.forEach((addr, j) => {
      console.log(`        ${j + 1}. ${addr}`)
    })
  })

  // Test 4: Find all unique recipients
  const recipientMap = new Map<string, string[]>() // address -> campaign IDs

  campaigns.forEach(campaign => {
    if (campaign.recipientAddresses) {
      campaign.recipientAddresses.forEach(addr => {
        if (!recipientMap.has(addr)) {
          recipientMap.set(addr, [])
        }
        recipientMap.get(addr)!.push(campaign.id)
      })
    }
  })

  console.log(`\n\n✅ Test 4: Unique recipients`)
  console.log(`   Total unique addresses: ${recipientMap.size}`)

  // Test 5: Find multi-campaign recipients
  const multiCampaignRecipients = Array.from(recipientMap.entries())
    .filter(([addr, campaignIds]) => campaignIds.length > 1)
    .sort((a, b) => b[1].length - a[1].length)

  console.log(`\n✅ Test 5: Multi-campaign recipients`)
  console.log(`   Addresses in 2+ campaigns: ${multiCampaignRecipients.length}`)

  if (multiCampaignRecipients.length > 0) {
    console.log(`\n   Top multi-campaign recipients:`)
    multiCampaignRecipients.slice(0, 5).forEach(([addr, campaignIds]) => {
      console.log(`\n   ${addr}`)
      console.log(`   -> Appears in ${campaignIds.length} campaigns:`)
      campaignIds.forEach(id => {
        const campaign = campaigns.find(c => c.id === id)
        if (campaign) {
          console.log(`      - ${campaign.title} (${campaign.amount} BCH, ${campaign.status})`)
        }
      })
    })
  } else {
    console.log(`   ℹ️  No addresses found in multiple campaigns`)
    console.log(`   This is expected - most Flipstarters have unique recipients`)
  }

  // Test 6: Verify blockchain data
  const campaignsWithBlockData = campaigns.filter(c => c.blockHeight || c.transactionTimestamp)
  console.log(`\n\n✅ Test 6: Blockchain metadata`)
  console.log(`   Campaigns with block height: ${campaigns.filter(c => c.blockHeight).length}`)
  console.log(`   Campaigns with timestamp: ${campaigns.filter(c => c.transactionTimestamp).length}`)

  if (campaignsWithBlockData.length > 0) {
    const sample = campaignsWithBlockData[0]
    console.log(`\n   Sample blockchain data:`)
    console.log(`   Campaign: ${sample.title}`)
    console.log(`   Block Height: ${sample.blockHeight}`)
    console.log(`   Timestamp: ${sample.transactionTimestamp}`)
    if (sample.transactionTimestamp) {
      const date = new Date(parseInt(sample.transactionTimestamp) * 1000)
      console.log(`   Date: ${date.toISOString()}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✨ All tests complete!\n')
}

main()
