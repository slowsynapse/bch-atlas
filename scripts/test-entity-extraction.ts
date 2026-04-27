/**
 * Smoke test: verify entity extraction still works correctly after
 * refactoring from hardcoded KNOWN_ENTITIES to projects.json.
 *
 * Run: npx tsx scripts/test-entity-extraction.ts
 */

import { extractEntities, matchEntities, getCanonicalName } from '../src/lib/parsers/entity-extractor'
import { getCampaigns } from '../src/lib/data/campaigns'
import { getResolvedProjects } from '../src/lib/data/project-resolver'

let failures = 0

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  FAIL: ${msg}`)
    failures++
  } else {
    console.log(`  PASS: ${msg}`)
  }
}

console.log('=== Entity Extraction Tests ===\n')

// Test 1: Known entities still extracted from campaign text
console.log('1. extractEntities — known matches')
{
  const result = extractEntities({ title: 'BCHN 2024 Node Development', description: '', url: '' })
  assert(result.includes('Bitcoin Cash Node'), `"BCHN 2024 Node Development" → includes Bitcoin Cash Node (got: ${JSON.stringify(result)})`)
}
{
  const result = extractEntities({ title: 'Electron Cash Development Fund', description: '', url: '' })
  assert(result.includes('Electron Cash'), `"Electron Cash Development Fund" → includes Electron Cash (got: ${JSON.stringify(result)})`)
}
{
  const result = extractEntities({ title: 'Something unrelated', description: '', url: '' })
  assert(result.length === 0 || !result.includes('Bitcoin Cash Node'), `"Something unrelated" → no false BCHN match`)
}

// Test 2: matchEntities still works
console.log('\n2. matchEntities')
{
  assert(matchEntities('BCHN', 'Bitcoin Cash Node'), 'BCHN matches Bitcoin Cash Node')
  assert(matchEntities('Electron Cash', 'electron cash'), 'Case-insensitive match')
  assert(!matchEntities('BCHN', 'Electron Cash'), 'BCHN does not match Electron Cash')
}

// Test 3: getCanonicalName still works
console.log('\n3. getCanonicalName')
{
  const name = getCanonicalName('bchn')
  assert(name === 'Bitcoin Cash Node', `bchn → Bitcoin Cash Node (got: ${name})`)
}
{
  const name = getCanonicalName('electron cash')
  assert(name === 'Electron Cash', `electron cash → Electron Cash (got: ${name})`)
}
{
  const name = getCanonicalName('totally unknown')
  assert(name === 'totally unknown', `unknown → passed through (got: ${name})`)
}

// Test 4: getCampaigns still loads without error
console.log('\n4. getCampaigns loads')
{
  const campaigns = getCampaigns()
  assert(campaigns.length > 0, `Loaded ${campaigns.length} campaigns`)

  // Check some campaigns have entities extracted
  const withEntities = campaigns.filter(c => c.entities.length > 0)
  assert(withEntities.length > 0, `${withEntities.length} campaigns have entities extracted`)

  // Sanity: no campaign has undefined/null in entities array
  const badEntities = campaigns.filter(c => c.entities.some(e => !e))
  assert(badEntities.length === 0, `No campaigns with null/undefined entities`)
}

// Test 5: project resolver works
console.log('\n5. Project resolver')
{
  const campaigns = getCampaigns()
  const resolved = getResolvedProjects(campaigns)
  assert(resolved.length > 0, `Resolved ${resolved.length} projects`)

  const withCampaigns = resolved.filter(p => p.campaigns.length > 0)
  assert(withCampaigns.length > 0, `${withCampaigns.length} projects matched to campaigns`)

  // Check a known project has campaigns
  const bchn = resolved.find(p => p.slug === 'bchn')
  if (bchn) {
    assert(bchn.campaigns.length > 0, `BCHN matched ${bchn.campaigns.length} campaigns`)
    assert(bchn.timeline.length > 0, `BCHN has ${bchn.timeline.length} timeline entries`)
  } else {
    assert(false, 'BCHN project not found in resolved projects')
  }
}

console.log('\n' + '='.repeat(40))
if (failures === 0) {
  console.log('ALL TESTS PASSED')
  process.exit(0)
} else {
  console.log(`${failures} TEST(S) FAILED`)
  process.exit(1)
}
