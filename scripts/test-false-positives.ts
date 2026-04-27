/**
 * Check for suspicious campaign-to-project matches that might be false positives.
 * Flags matches where the matcher is very short or generic.
 *
 * Run: npx tsx scripts/test-false-positives.ts
 */

import { getCampaigns } from '../src/lib/data/campaigns'
import { getResolvedProjects } from '../src/lib/data/project-resolver'

const campaigns = getCampaigns()
const resolved = getResolvedProjects(campaigns)
const campaignMap = new Map(campaigns.map(c => [c.id, c]))

console.log('=== Checking for false positive matches ===\n')

// Show projects with suspiciously many matches
const highMatchers = resolved.filter(p => p.campaigns.length > 5)
  .sort((a, b) => b.campaigns.length - a.campaigns.length)

console.log(`Projects with 5+ campaign matches (check for false positives):\n`)
for (const p of highMatchers) {
  console.log(`${p.name} (${p.slug}) — ${p.campaigns.length} campaigns:`)
  for (const cid of p.campaigns.slice(0, 5)) {
    const c = campaignMap.get(cid)
    console.log(`  - "${c?.title}" [${c?.platform}]`)
  }
  if (p.campaigns.length > 5) console.log(`  ... and ${p.campaigns.length - 5} more`)
  console.log()
}

// Check for very short matchers
console.log('\n=== Short matchers (3 chars, high false positive risk) ===\n')
for (const p of resolved) {
  const shortMatchers = p.campaignMatchers.filter(m => m.length <= 3)
  if (shortMatchers.length > 0 && p.campaigns.length > 0) {
    console.log(`${p.name}: matchers ${JSON.stringify(shortMatchers)} → ${p.campaigns.length} matches`)
  }
}
