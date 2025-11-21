/**
 * Test script to verify Chaingraph integration
 *
 * This script fetches a sample Flipstarter transaction and extracts addresses.
 *
 * Usage:
 *   npx tsx scripts/test-chaingraph.ts
 */

import { getTransactionAddresses } from '../src/lib/chaingraph/queries'

async function main() {
  // Test with the first campaign from flipstarters.json
  // Badger Android localization campaign
  const testTxHash = '0be6b91f27bd19d81281c96f7bf64bfcc4c0cf4b44ae344e6401963485fd880f'

  console.log('🔍 Testing Chaingraph Integration\n')
  console.log(`Transaction: ${testTxHash}`)
  console.log('Querying Chaingraph...\n')

  try {
    const result = await getTransactionAddresses(testTxHash)

    if (!result) {
      console.error('❌ Failed to fetch transaction data')
      process.exit(1)
    }

    console.log('✅ Successfully fetched transaction data!\n')
    console.log('📊 Results:')
    console.log(`  Block Height: ${result.blockHeight || 'N/A'}`)
    console.log(`  Timestamp: ${result.timestamp || 'N/A'}`)
    console.log(`  Contributors: ${result.contributors.length}`)
    console.log(`  Recipients: ${result.recipients.length}\n`)

    console.log('👥 Contributors (first 5):')
    result.contributors.slice(0, 5).forEach((contrib, i) => {
      const bch = (parseInt(contrib.valueSatoshis) / 100000000).toFixed(8)
      console.log(`  ${i + 1}. ${contrib.address} - ${bch} BCH`)
    })

    console.log('\n💰 Recipients:')
    result.recipients.forEach((recipient, i) => {
      const bch = (parseInt(recipient.valueSatoshis) / 100000000).toFixed(8)
      console.log(`  ${i + 1}. ${recipient.address} - ${bch} BCH`)
    })

    console.log('\n✨ Chaingraph integration is working!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
