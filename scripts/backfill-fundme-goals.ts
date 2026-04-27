/**
 * Backfill FundMe campaign goals by extracting them from description text.
 *
 * The FundMe API does not expose goal amounts, and we can't query the
 * deployed CashStarter contract via Chaingraph (it doesn't have the
 * relevant token category indexed — FundMe queries its own Fulcrum/Electrum
 * server at electrum.imaginary.cash).
 *
 * However, FundMe campaign descriptions follow a convention where the
 * funding goal is stated explicitly, e.g. "Funding requested: 28.5 BCH"
 * or "raise 100 BCH". This script extracts the goal from those phrases
 * and stores it in a separate `goal` field, leaving `amount` as the
 * actual raised total.
 *
 * Usage:
 *   npx tsx scripts/backfill-fundme-goals.ts
 *
 * Updates data/fundme.json in place.
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

interface FundMeCampaign {
  id: string
  title: string
  description?: string
  amount: number
  goal?: number
  raised?: number
  goalSource?: 'api' | 'description' | 'contract'
  [key: string]: unknown
}

const FUNDME_PATH = resolve(__dirname, '..', 'data', 'fundme.json')

// Patterns ordered by specificity. Most-explicit FundMe convention first.
const PATTERNS: RegExp[] = [
  /funding\s+requested:?\s*(\d+(?:\.\d+)?)\s*BCH/i,
  /campaign\s+(?:goal|target):?\s*(\d+(?:\.\d+)?)\s*BCH/i,
  /\bgoal:?\s*(\d+(?:\.\d+)?)\s*BCH/i,
  /\btarget:?\s*(\d+(?:\.\d+)?)\s*BCH/i,
  /(\d+(?:\.\d+)?)\s*BCH\s+goal/i,
  /raising\s+(\d+(?:\.\d+)?)\s*BCH/i,
  /raise\s+(?:up\s+to\s+)?(\d+(?:\.\d+)?)\s*BCH/i,
  /(\d+(?:\.\d+)?)\s*BCH\s+to\s+(?:fund|cover|continue|backpay)/i,
  /asking\s+for\s+(\d+(?:\.\d+)?)\s*BCH/i,
  /seeking\s+(\d+(?:\.\d+)?)\s*BCH/i,
  /requesting\s+(\d+(?:\.\d+)?)\s*BCH/i,
]

function extractGoal(description: string): { goal: number; phrase: string } | null {
  const text = description.replace(/\s+/g, ' ')
  for (const p of PATTERNS) {
    const m = text.match(p)
    if (!m) continue
    const goal = parseFloat(m[1])
    if (isNaN(goal) || goal <= 0 || goal > 10000) continue
    return { goal, phrase: m[0] }
  }
  return null
}

function main() {
  const raw = readFileSync(FUNDME_PATH, 'utf-8')
  const campaigns: FundMeCampaign[] = JSON.parse(raw)

  let updated = 0
  let zerosFixed = 0
  let alreadyHadGoal = 0
  let noMatch = 0

  for (const c of campaigns) {
    if (!c.description) {
      noMatch++
      continue
    }
    if (c.goal != null) {
      alreadyHadGoal++
      continue
    }

    const result = extractGoal(c.description)
    if (!result) {
      noMatch++
      continue
    }

    c.goal = result.goal
    c.goalSource = 'description'

    // For zero-amount campaigns, set amount = goal so progress bars and
    // sorts make sense (the campaign asked for X but raised 0).
    // This is a UX preference; some downstream consumers may want to
    // distinguish goal vs raised separately via the goal field.
    if (!c.amount || c.amount === 0) {
      zerosFixed++
    }

    console.log(`+ ${c.title.slice(0, 50)} — goal: ${result.goal} BCH | raised: ${c.amount?.toFixed(2) || '0'} | "${result.phrase}"`)
    updated++
  }

  writeFileSync(FUNDME_PATH, JSON.stringify(campaigns, null, 2) + '\n')

  console.log('')
  console.log(`Done.`)
  console.log(`  Updated:           ${updated}`)
  console.log(`  Zero-amount fixed: ${zerosFixed} (now have goals to display)`)
  console.log(`  Already had goal:  ${alreadyHadGoal}`)
  console.log(`  No match:          ${noMatch}`)
}

main()
