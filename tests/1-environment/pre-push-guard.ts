/**
 * Pre-Push Guard
 *
 * Run this before pushing code or deploying to production.
 * Ensures critical checks pass before making changes.
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { resolve } from 'path'

const execAsync = promisify(exec)

interface TestResult {
  name: string
  passed: boolean
  message: string
  critical: boolean
}

async function runTest(name: string, command: string, critical: boolean = false): Promise<TestResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: resolve(__dirname, '../..'),
      timeout: 30000 // 30 second timeout
    })

    return {
      name,
      passed: true,
      message: 'Passed',
      critical
    }
  } catch (error: any) {
    return {
      name,
      passed: false,
      message: error.message || 'Test failed',
      critical
    }
  }
}

async function main() {
  console.log('=' .repeat(70))
  console.log('Pre-Push Guard - Running Critical Checks')
  console.log('=' .repeat(70))
  console.log()

  const tests: Promise<TestResult>[] = [
    // CRITICAL: Environment safety check
    runTest(
      'Environment Safety Check',
      'npx tsx tests/1-environment/env-safety-check.ts',
      true
    ),

    // CRITICAL: Database health check
    runTest(
      'Database Health Check',
      'npx tsx tests/2-health/db-health-check.ts',
      true
    ),

    // IMPORTANT: Record counts check
    runTest(
      'Database Record Counts',
      'npx tsx tests/2-health/db-record-counts.ts',
      false
    )
  ]

  console.log('Running tests...\n')

  const results = await Promise.all(tests)

  // Display results
  results.forEach(result => {
    const icon = result.passed ? '✓' : '✗'
    const criticality = result.critical ? '[CRITICAL]' : '[INFO]'
    console.log(`  ${icon} ${criticality} ${result.name}`)
    if (!result.passed) {
      console.log(`      ${result.message}`)
    }
  })

  console.log()
  console.log('=' .repeat(70))

  const criticalFailures = results.filter(r => r.critical && !r.passed)
  const nonCriticalFailures = results.filter(r => !r.critical && !r.passed)

  if (criticalFailures.length > 0) {
    console.log('✗ CRITICAL FAILURES DETECTED - PUSH BLOCKED')
    console.log('=' .repeat(70))
    console.log()
    console.log('The following critical checks failed:')
    criticalFailures.forEach(f => {
      console.log(`  - ${f.name}`)
    })
    console.log()
    console.log('You must fix these issues before pushing or deploying.')
    console.log()
    console.log('Actions:')
    console.log('  1. Review the test output above')
    console.log('  2. Fix the identified issues')
    console.log('  3. Re-run: npm run test:pre-push')
    console.log()
    process.exit(1)
  } else if (nonCriticalFailures.length > 0) {
    console.log('⚠  WARNING: Some non-critical checks failed')
    console.log('=' .repeat(70))
    console.log()
    console.log('Failed checks:')
    nonCriticalFailures.forEach(f => {
      console.log(`  - ${f.name}`)
    })
    console.log()
    console.log('These are not blocking, but should be investigated.')
    console.log('Proceeding with push is allowed but not recommended.')
    console.log()
    process.exit(0)
  } else {
    console.log('✓ ALL CHECKS PASSED')
    console.log('=' .repeat(70))
    console.log()
    console.log('Safe to push and deploy!')
    console.log()
    process.exit(0)
  }
}

main()
  .catch((error) => {
    console.error('\nUnexpected error during pre-push checks:', error)
    process.exit(1)
  })
