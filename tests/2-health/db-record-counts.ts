/**
 * Database Record Counts Check
 *
 * Verifies expected data is present in the database.
 * Useful for detecting data loss or incomplete seeding.
 */

import { config } from 'dotenv'
import { prisma } from '../../src/lib/prisma'

config({ path: '.env.local' })

// Expected counts (adjust these based on your production data)
const EXPECTED_COUNTS = {
  campaigns: { min: 220, expected: 225, max: 230 },
  recipients: { min: 140, expected: 149, max: 200 },
  entities: { min: 0, expected: 0, max: 100 }
}

async function main() {
  console.log('=' .repeat(70))
  console.log('Database Record Counts Check')
  console.log('=' .repeat(70))
  console.log()

  const results: { table: string; count: number; status: string; message: string }[] = []

  // Count campaigns
  const campaignCount = await prisma.campaign.count()
  const campaignWithDates = await prisma.campaign.count({ where: { time: { not: null } } })
  const campaignStatus = await prisma.campaign.groupBy({
    by: ['status'],
    _count: true
  })

  console.log('Campaigns:')
  console.log(`  Total: ${campaignCount}`)
  console.log(`  With dates: ${campaignWithDates} (${((campaignWithDates / campaignCount) * 100).toFixed(1)}%)`)
  console.log('  By status:')
  campaignStatus.forEach(s => {
    console.log(`    ${s.status}: ${s._count}`)
  })

  if (campaignCount < EXPECTED_COUNTS.campaigns.min) {
    results.push({
      table: 'Campaign',
      count: campaignCount,
      status: 'CRITICAL',
      message: `Expected at least ${EXPECTED_COUNTS.campaigns.min}, found ${campaignCount}`
    })
  } else if (campaignCount < EXPECTED_COUNTS.campaigns.expected) {
    results.push({
      table: 'Campaign',
      count: campaignCount,
      status: 'WARNING',
      message: `Expected ${EXPECTED_COUNTS.campaigns.expected}, found ${campaignCount}`
    })
  } else {
    results.push({
      table: 'Campaign',
      count: campaignCount,
      status: 'OK',
      message: 'Count within expected range'
    })
  }

  // Count recipients
  console.log('\nRecipients:')
  const recipientCount = await prisma.recipient.count()
  console.log(`  Total: ${recipientCount}`)

  if (recipientCount < EXPECTED_COUNTS.recipients.min) {
    results.push({
      table: 'Recipient',
      count: recipientCount,
      status: 'CRITICAL',
      message: `Expected at least ${EXPECTED_COUNTS.recipients.min}, found ${recipientCount}`
    })
  } else if (recipientCount < EXPECTED_COUNTS.recipients.expected) {
    results.push({
      table: 'Recipient',
      count: recipientCount,
      status: 'WARNING',
      message: `Expected ${EXPECTED_COUNTS.recipients.expected}, found ${recipientCount}`
    })
  } else {
    results.push({
      table: 'Recipient',
      count: recipientCount,
      status: 'OK',
      message: 'Count within expected range'
    })
  }

  // Count entities
  console.log('\nEntities:')
  const entityCount = await prisma.entity.count()
  console.log(`  Total: ${entityCount}`)

  results.push({
    table: 'Entity',
    count: entityCount,
    status: 'OK',
    message: `Count: ${entityCount}`
  })

  // Summary
  console.log()
  console.log('=' .repeat(70))
  console.log('Summary:')
  console.log('=' .repeat(70))

  const hasCritical = results.some(r => r.status === 'CRITICAL')
  const hasWarning = results.some(r => r.status === 'WARNING')

  results.forEach(r => {
    const icon = r.status === 'OK' ? '✓' : r.status === 'WARNING' ? '⚠' : '✗'
    console.log(`  ${icon} ${r.table}: ${r.count} records - ${r.message}`)
  })

  console.log()

  if (hasCritical) {
    console.log('✗ CRITICAL: Data loss detected!')
    console.log()
    console.log('Action required:')
    console.log('  1. Check if database seeding completed successfully')
    console.log('  2. Run: npm run db:seed')
    console.log('  3. Verify expected data is in source files')
    console.log()
    process.exit(1)
  } else if (hasWarning) {
    console.log('⚠  WARNING: Record counts below expected')
    console.log()
    console.log('Recommended actions:')
    console.log('  1. Verify database seeding completed without errors')
    console.log('  2. Check seed script logs for skipped records')
    console.log('  3. Consider re-running: npm run db:seed')
    console.log()
    process.exit(0)
  } else {
    console.log('✓ All record counts are within expected ranges')
    console.log()
    process.exit(0)
  }
}

main()
  .catch((error) => {
    console.error('\nError during record count check:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
