/**
 * Extract recipient addresses from failed/expired Flipstarter campaigns using Puppeteer
 *
 * This version uses headless browser automation to:
 * 1. Navigate to archived campaign pages
 * 2. Parse the rendered HTML for recipient addresses
 * 3. Extract from contract.json or page content
 */

import * as fs from 'fs'
import puppeteer from 'puppeteer'
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

async function extractAddressesFromPage(page: puppeteer.Page): Promise<Recipient[]> {
  try {
    const recipients = await page.evaluate(() => {
      const addresses: Recipient[] = []

      // Look for Bitcoin Cash addresses in the page
      const bodyText = document.body.innerText
      const addressRegex = /bitcoincash:[qp][a-z0-9]{41}/gi
      const matches = bodyText.match(addressRegex)

      if (matches) {
        const uniqueAddresses = Array.from(new Set(matches.map(a => a.toLowerCase())))
        return uniqueAddresses.map(address => ({ address }))
      }

      return []
    })

    return recipients
  } catch (error) {
    return []
  }
}

async function processArchiveUrl(browser: puppeteer.Browser, archiveUrl: string, campaignTitle: string): Promise<Recipient[]> {
  const page = await browser.newPage()

  try {
    // Set a reasonable timeout
    await page.goto(archiveUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    })

    // Wait a bit for any JS to load
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Try to find contract.json link or extract addresses from page
    const recipients = await extractAddressesFromPage(page)

    await page.close()
    return recipients

  } catch (error) {
    console.log(`    ⚠ Error loading archive: ${error instanceof Error ? error.message : 'Unknown error'}`)
    await page.close()
    return []
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

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const results: Array<{
    campaign: Campaign
    recipients: Recipient[]
    source: 'archive' | 'none'
  }> = []

  console.log('🔍 Extracting recipient addresses using Puppeteer...\n')

  // Process only campaigns with archives
  const campaignsWithArchives = failedCampaigns.filter(c => c.archive && c.archive.length > 0)

  for (let i = 0; i < Math.min(campaignsWithArchives.length, 2); i++) {  // Limit to 2 for testing
    const campaign = campaignsWithArchives[i]
    const progress = `[${i + 1}/${Math.min(campaignsWithArchives.length, 10)}]`

    console.log(`${progress} ${campaign.title.substring(0, 60)}...`)

    let recipients: Recipient[] = []

    if (campaign.archive && campaign.archive.length > 0) {
      for (const archiveUrl of campaign.archive) {
        // Skip screenshot archives
        if (archiveUrl.includes('/media/screenshots/')) {
          continue
        }

        console.log(`  → Trying archive: ${archiveUrl.substring(0, 50)}...`)

        const foundRecipients = await processArchiveUrl(browser, archiveUrl, campaign.title)

        if (foundRecipients.length > 0) {
          recipients = foundRecipients
          console.log(`  ✓ Found ${recipients.length} recipient address(es)`)
          break
        } else {
          console.log(`  ✗ No addresses found`)
        }
      }
    }

    results.push({
      campaign,
      recipients,
      source: recipients.length > 0 ? 'archive' : 'none'
    })
  }

  await browser.close()

  // Generate statistics
  const withRecipients = results.filter(r => r.recipients.length > 0)

  console.log('\n📊 Extraction Statistics (first 10 campaigns):')
  console.log(`  Processed: ${results.length}`)
  console.log(`  With recipients: ${withRecipients.length}`)
  console.log(`  No recipients: ${results.length - withRecipients.length}`)

  // Count unique addresses
  const allAddresses = new Set<string>()
  results.forEach(r => {
    r.recipients.forEach(recipient => {
      allAddresses.add(recipient.address.toLowerCase())
    })
  })

  console.log(`  Unique recipient addresses: ${allAddresses.size}`)

  // Save results
  const outputPath = 'data/failed-campaigns-recipients-sample.json'
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))

  console.log(`\n💾 Saved to: ${outputPath}`)
  console.log('\n✨ Extraction complete!')

  if (withRecipients.length > 0) {
    console.log('\n🎉 Success! Found recipient addresses from archived pages.')
    console.log('   You can now run this on all campaigns by removing the limit.')
  } else {
    console.log('\n⚠️  No recipients found. Archive sites may be blocking automated access.')
    console.log('   Consider alternative approaches.')
  }
}

// Run the extraction
extractFailedCampaignAddresses().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
