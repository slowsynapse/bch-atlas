/**
 * Database Health Check
 *
 * Verifies database connectivity and basic schema integrity.
 * Run this test to diagnose database connection issues.
 */

import { config } from 'dotenv'
import { prisma } from '../../src/lib/prisma'

config({ path: '.env.local' })

async function main() {
  console.log('=' .repeat(70))
  console.log('Database Health Check')
  console.log('=' .repeat(70))
  console.log()

  let connectionOk = false
  let schemaOk = false
  let errors: string[] = []

  // Test 1: Database Connection
  try {
    console.log('1. Testing database connection...')
    await prisma.$connect()
    console.log('   ✓ Database connection successful')
    connectionOk = true
  } catch (error) {
    console.log('   ✗ Database connection failed')
    errors.push(`Connection error: ${error}`)
  }

  // Test 2: Schema Integrity
  if (connectionOk) {
    try {
      console.log('\n2. Checking schema integrity...')

      // Check if all required tables exist
      const tables = ['Campaign', 'Recipient', 'Entity']

      for (const table of tables) {
        try {
          // Try to query each table
          const model = (prisma as any)[table.toLowerCase()]
          if (!model) {
            throw new Error(`Model ${table} not found in Prisma client`)
          }

          await model.count()
          console.log(`   ✓ Table "${table}" exists and is accessible`)
        } catch (error: any) {
          console.log(`   ✗ Table "${table}" check failed`)
          errors.push(`Schema error for ${table}: ${error.message}`)
        }
      }

      if (errors.length === 0 || errors.every(e => !e.includes('Schema error'))) {
        schemaOk = true
      }
    } catch (error) {
      console.log('   ✗ Schema check failed')
      errors.push(`Schema error: ${error}`)
    }
  }

  // Test 3: Basic Query Test
  if (connectionOk && schemaOk) {
    try {
      console.log('\n3. Testing basic queries...')

      const campaignCount = await prisma.campaign.count()
      const recipientCount = await prisma.recipient.count()
      const entityCount = await prisma.entity.count()

      console.log(`   ✓ Campaign count: ${campaignCount}`)
      console.log(`   ✓ Recipient count: ${recipientCount}`)
      console.log(`   ✓ Entity count: ${entityCount}`)
    } catch (error) {
      console.log('   ✗ Query test failed')
      errors.push(`Query error: ${error}`)
    }
  }

  // Summary
  console.log()
  console.log('=' .repeat(70))

  if (errors.length === 0) {
    console.log('✓ ALL HEALTH CHECKS PASSED')
    console.log('=' .repeat(70))
    console.log()
    console.log('Database is healthy and ready for operations.')
    process.exit(0)
  } else {
    console.log('✗ HEALTH CHECK FAILED')
    console.log('=' .repeat(70))
    console.log()
    console.log('Errors detected:')
    errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`)
    })
    console.log()

    if (!connectionOk) {
      console.log('Troubleshooting steps:')
      console.log('  1. Check your .env.local file has correct DATABASE_URL')
      console.log('  2. Verify the database server is running')
      console.log('  3. Check network connectivity')
      console.log('  4. Verify database credentials')
    } else if (!schemaOk) {
      console.log('Troubleshooting steps:')
      console.log('  1. Run: npx prisma db push')
      console.log('  2. Or run: npx prisma migrate deploy')
      console.log('  3. Check prisma/schema.prisma is correct')
    }

    process.exit(1)
  }
}

main()
  .catch((error) => {
    console.error('\nUnexpected error during health check:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
