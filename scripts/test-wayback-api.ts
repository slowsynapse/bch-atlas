/**
 * Test Wayback Machine CDX API
 *
 * Tests using the Wayback Machine's CDX API to get snapshot dates
 * for URLs that don't have dates (primarily failed campaigns).
 */

import flipstartersData from '../data/flipstarters-with-addresses.json'

interface CDXResponse {
  url: string
  timestamp: string
  statuscode: string
  mimetype: string
}

async function getWaybackSnapshot(url: string): Promise<Date | null> {
  try {
    // Clean the URL - remove protocol if present
    const cleanUrl = url.replace(/^https?:\/\//, '')

    console.log(`  Querying Wayback CDX API for: ${cleanUrl}`)

    // Use CDX API to get the first snapshot
    const apiUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(cleanUrl)}&output=json&limit=1&fl=timestamp`

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BCH-Atlas/1.0)'
      }
    })

    if (!response.ok) {
      console.log(`  ✗ API request failed: ${response.status}`)
      return null
    }

    const data = await response.json()

    // CDX returns array of arrays: [["timestamp"], ["20200817074951"], ...]
    // First row is headers, second row is data
    if (data.length < 2) {
      console.log(`  ✗ No snapshots found`)
      return null
    }

    const timestamp = data[1][0]

    // Parse timestamp: YYYYMMDDHHMMSS
    const year = parseInt(timestamp.substring(0, 4))
    const month = parseInt(timestamp.substring(4, 6)) - 1
    const day = parseInt(timestamp.substring(6, 8))
    const hour = parseInt(timestamp.substring(8, 10))
    const minute = parseInt(timestamp.substring(10, 12))
    const second = parseInt(timestamp.substring(12, 14))

    const date = new Date(year, month, day, hour, minute, second)

    if (isNaN(date.getTime())) {
      console.log(`  ✗ Invalid date parsed`)
      return null
    }

    console.log(`  ✓ Found snapshot: ${date.toISOString()}`)
    return date

  } catch (error) {
    console.log(`  ✗ Error: ${error}`)
    return null
  }
}

async function main() {
  console.log('='.repeat(70))
  console.log('Testing Wayback Machine CDX API')
  console.log('='.repeat(70))
  console.log()

  // Find campaigns without dates
  const campaignsWithoutDates = []

  for (const campaign of flipstartersData as any[]) {
    const hasTimestamp = !!campaign.transactionTimestamp

    // Check if campaign would have a date after current extraction logic
    let wouldHaveDate = hasTimestamp

    if (!wouldHaveDate && campaign.archive && Array.isArray(campaign.archive)) {
      // Check screenshot dates
      for (const archiveUrl of campaign.archive) {
        if (archiveUrl.match(/\d{4}-\d{2}-\d{2}/)) {
          wouldHaveDate = true
          break
        }
      }

      // Check archive.org URLs
      if (!wouldHaveDate) {
        for (const archiveUrl of campaign.archive) {
          if ((archiveUrl.includes('archive.org') || archiveUrl.includes('web.archive.org'))
              && archiveUrl.match(/\/web\/\d{14}\//)) {
            wouldHaveDate = true
            break
          }
        }
      }
    }

    if (!wouldHaveDate && campaign.url) {
      campaignsWithoutDates.push(campaign)
    }
  }

  console.log(`Found ${campaignsWithoutDates.length} campaigns without dates`)
  console.log()

  // Test first 10 campaigns
  const testCampaigns = campaignsWithoutDates.slice(0, 10)
  let successCount = 0
  let failureCount = 0

  for (const campaign of testCampaigns) {
    console.log(`\nTesting: ${campaign.title}`)
    console.log(`  URL: ${campaign.url}`)
    console.log(`  Status: ${campaign.status}`)

    const date = await getWaybackSnapshot(campaign.url)

    if (date) {
      successCount++
      console.log(`  → Result: ${date.toISOString().split('T')[0]}`)
    } else {
      failureCount++
      console.log(`  → Result: No date found`)
    }

    // Rate limit - be nice to the API
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  console.log()
  console.log('='.repeat(70))
  console.log('Summary:')
  console.log(`  Tested: ${testCampaigns.length} campaigns`)
  console.log(`  Successful: ${successCount}`)
  console.log(`  Failed: ${failureCount}`)
  console.log(`  Success rate: ${((successCount / testCampaigns.length) * 100).toFixed(1)}%`)
  console.log('='.repeat(70))

  if (successCount > 0) {
    console.log()
    console.log('✓ Wayback Machine CDX API is viable!')
    console.log(`  Potential to improve date coverage for ${campaignsWithoutDates.length} campaigns`)

    // Estimate improvement
    const potentialImprovement = Math.round((successCount / testCampaigns.length) * campaignsWithoutDates.length)
    const currentWithDates = flipstartersData.length - campaignsWithoutDates.length
    const newTotal = currentWithDates + potentialImprovement

    console.log()
    console.log('Estimated Impact:')
    console.log(`  Current date coverage: ${currentWithDates}/${flipstartersData.length} (${((currentWithDates / flipstartersData.length) * 100).toFixed(1)}%)`)
    console.log(`  Potential new coverage: ${newTotal}/${flipstartersData.length} (${((newTotal / flipstartersData.length) * 100).toFixed(1)}%)`)
  } else {
    console.log()
    console.log('✗ Wayback Machine CDX API not successful')
    console.log('  May need alternative approach')
  }
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
