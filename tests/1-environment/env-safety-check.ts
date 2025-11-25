/**
 * CRITICAL TEST: Environment Safety Check
 *
 * This test prevents the catastrophic error of using the same database
 * for both local development and production environments.
 *
 * Run this BEFORE any destructive database operations!
 */

import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { resolve } from 'path'

interface EnvConfig {
  name: string
  path: string
  DATABASE_URL?: string
  POSTGRES_PRISMA_URL?: string
  POSTGRES_URL?: string
}

function extractDatabaseHost(url: string | undefined): string | null {
  if (!url) return null

  // Extract host from PostgreSQL connection string
  // Format: postgresql://user:pass@HOST/dbname?params
  const match = url.match(/@([^/]+)\//)
  return match ? match[1] : null
}

function loadEnvFile(filePath: string): Record<string, string> {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const env: Record<string, string> = {}

    content.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()
        // Remove quotes if present
        value = value.replace(/^["']|["']$/g, '')
        env[key] = value
      }
    })

    return env
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}`)
    return {}
  }
}

async function main() {
  console.log('=' .repeat(70))
  console.log('CRITICAL: Environment Safety Check')
  console.log('=' .repeat(70))
  console.log()

  const rootDir = resolve(__dirname, '../..')

  const envConfigs: EnvConfig[] = [
    {
      name: 'Local Development',
      path: resolve(rootDir, '.env.local'),
      ...loadEnvFile(resolve(rootDir, '.env.local'))
    },
    {
      name: 'Production',
      path: resolve(rootDir, '.env.production.local'),
      ...loadEnvFile(resolve(rootDir, '.env.production.local'))
    }
  ]

  // Check if both files exist and have database URLs
  const validConfigs = envConfigs.filter(cfg =>
    cfg.DATABASE_URL || cfg.POSTGRES_PRISMA_URL || cfg.POSTGRES_URL
  )

  if (validConfigs.length < 2) {
    console.log('⚠️  WARNING: Less than 2 environment files found with database URLs')
    console.log()
    envConfigs.forEach(cfg => {
      const hasUrl = !!(cfg.DATABASE_URL || cfg.POSTGRES_PRISMA_URL || cfg.POSTGRES_URL)
      console.log(`  ${cfg.name}: ${hasUrl ? '✓ Found' : '✗ Not found or no DB URL'}`)
    })
    console.log()
    console.log('This is OK if you are using a single environment for testing.')
    process.exit(0)
  }

  // Extract hosts for comparison
  console.log('Checking database configurations...\n')

  const hosts = new Map<string, string[]>()

  validConfigs.forEach(cfg => {
    const url = cfg.POSTGRES_PRISMA_URL || cfg.POSTGRES_URL || cfg.DATABASE_URL
    const host = extractDatabaseHost(url)

    console.log(`${cfg.name}:`)
    console.log(`  File: ${cfg.path}`)
    console.log(`  Host: ${host || 'Could not extract'}`)
    console.log()

    if (host) {
      if (!hosts.has(host)) {
        hosts.set(host, [])
      }
      hosts.get(host)!.push(cfg.name)
    }
  })

  // Check for conflicts
  let hasConflict = false

  hosts.forEach((envs, host) => {
    if (envs.length > 1) {
      hasConflict = true
      console.log('❌ CRITICAL ERROR: SAME DATABASE HOST DETECTED!')
      console.log(`   Host: ${host}`)
      console.log(`   Used by: ${envs.join(' AND ')}`)
      console.log()
    }
  })

  if (hasConflict) {
    console.log('=' .repeat(70))
    console.log('❌ SAFETY CHECK FAILED!')
    console.log('=' .repeat(70))
    console.log()
    console.log('Your local and production environments are using the SAME database!')
    console.log('This is EXTREMELY DANGEROUS and will cause data loss.')
    console.log()
    console.log('What happened:')
    console.log('  - Running destructive operations locally will affect production')
    console.log('  - prisma db push --accept-data-loss will drop production tables')
    console.log('  - Database migrations will affect production data')
    console.log()
    console.log('Required action:')
    console.log('  1. Create a separate local development database')
    console.log('  2. Update .env.local with the new local database URL')
    console.log('  3. Re-run this test to verify separation')
    console.log()
    console.log('DO NOT proceed with any database operations until this is fixed!')
    console.log('=' .repeat(70))
    process.exit(1)
  }

  console.log('=' .repeat(70))
  console.log('✓ SAFETY CHECK PASSED!')
  console.log('=' .repeat(70))
  console.log()
  console.log('All environment files use different database hosts.')
  console.log('It is safe to proceed with database operations.')
  console.log()
}

main()
  .catch((error) => {
    console.error('Error running safety check:', error)
    process.exit(1)
  })
