/**
 * Extract recipient addresses from failed/expired Flipstarter campaigns
 *
 * Strategy:
 * 1. Load failed/expired campaigns from flipstarters.json
 * 2. Try to fetch contract.json from campaign URLs
 * 3. For campaigns with archives, parse archived pages
 * 4. Extract recipient BCH addresses
 */

import * as fs from 'fs'
import flipstartersData from '../data/flipstarters.json'

interface Campaign {
  title: string
  url: string
  status: string
  archive?: string[]
  amount: number
  category?: string[]
  description?: string
}

interface Recipient {
  name?: string
  address: string
  amount?: number
}

async function fetchContractJson(url: string): Promise<Recipient[] | null> {
  try {
    // Try to fetch contract.json directly
    const contractUrl = url.endsWith('/') ? `${url}contract.json` : `${url}/contract.json`

    const response = await fetch(contractUrl, {
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) return null

    const data = await response.json()

    if (data.recipients && Array.isArray(data.recipients)) {
      return data.recipients.map((r: any) => ({
        name: r.name,
        address: r.address,
        amount: r.satoshis ? r.satoshis / 100000000 : r.amount
      }))
    }

    return null
  } catch (error) {
    return null
  }
}

async function parseArchiveForAddresses(archiveUrl: string): Promise<Recipient[] | null> {
  try {
    // For now, try to fetch the archive page and look for contract.json reference
    const response = await fetch(archiveUrl, {
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) return null

    const html = await response.text()

    // Look for Bitcoin Cash addresses in the HTML (bitcoincash:q... or bitcoincash:p...)
    const addressMatches = html.match(/bitcoincash:[qp][a-z0-9]{41}/gi)

    if (addressMatches && addressMatches.length > 0) {
      // Deduplicate addresses
      const uniqueAddresses = Array.from(new Set(addressMatches))

      return uniqueAddresses.map(address => ({
        address: address.toLowerCase()
      }))
    }

    return null
  } catch (error) {
    return null
  }
}

async function extractFailedCampaignAddresses() {
  console.log('📂 Loading flipstarters.json...\n')

  const campaigns = flipstartersData as Campaign[]

  // Filter failed and expired campaigns
  const failedCampaigns = campaigns.filter(c =>
    c.status === 'expired' || c.status === 'failed'
  )

  console.log(`✅ Found ${failedCampaigns.length} failed/expired campaigns`)
  console.log(`📊 ${failedCampaigns.filter(c => c.archive && c.archive.length > 0).length} have archive links\n`)

  const results: Array<{
    campaign: Campaign
    recipients: Recipient[]
    source: 'contract.json' | 'archive' | 'none'
  }> = []

  console.log('🔍 Extracting recipient addresses...\n')

  for (let i = 0; i < failedCampaigns.length; i++) {
    const campaign = failedCampaigns[i]
    const progress = `[${i + 1}/${failedCampaigns.length}]`

    console.log(`${progress} ${campaign.title.substring(0, 60)}...`)

    let recipients: Recipient[] | null = null
    let source: 'contract.json' | 'archive' | 'none' = 'none'

    // Try contract.json first
    if (campaign.url) {
      recipients = await fetchContractJson(campaign.url)
      if (recipients) {
        source = 'contract.json'
        console.log(`  ✓ Found ${recipients.length} recipients from contract.json`)
      }
    }

    // If no recipients found, try archives
    if (!recipients && campaign.archive && campaign.archive.length > 0) {
      for (const archiveUrl of campaign.archive) {
        // Skip screenshot archives, focus on web archives
        if (archiveUrl.includes('flipbackend.bitcoincash.network/media/screenshots')) {
          continue
        }

        recipients = await parseArchiveForAddresses(archiveUrl)
        if (recipients && recipients.length > 0) {
          source = 'archive'
          console.log(`  ✓ Found ${recipients.length} recipients from archive`)
          break
        }
      }
    }

    if (!recipients || recipients.length === 0) {
      console.log(`  ✗ No recipients found`)
    }

    results.push({
      campaign,
      recipients: recipients || [],
      source
    })

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Generate statistics
  const withRecipients = results.filter(r => r.recipients.length > 0)
  const fromContract = results.filter(r => r.source === 'contract.json')
  const fromArchive = results.filter(r => r.source === 'archive')

  console.log('\n📊 Extraction Statistics:')
  console.log(`  Total failed campaigns: ${failedCampaigns.length}`)
  console.log(`  With recipients: ${withRecipients.length} (${((withRecipients.length / failedCampaigns.length) * 100).toFixed(1)}%)`)
  console.log(`  From contract.json: ${fromContract.length}`)
  console.log(`  From archives: ${fromArchive.length}`)
  console.log(`  No recipients: ${results.length - withRecipients.length}`)

  // Count unique addresses
  const allAddresses = new Set<string>()
  results.forEach(r => {
    r.recipients.forEach(recipient => {
      allAddresses.add(recipient.address.toLowerCase())
    })
  })

  console.log(`\n  Unique recipient addresses: ${allAddresses.size}`)

  // Save results
  const outputPath = 'data/failed-campaigns-recipients.json'
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))

  console.log(`\n💾 Saved to: ${outputPath}`)
  console.log('\n✨ Extraction complete!')
}

// Run the extraction
extractFailedCampaignAddresses().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
