/**
 * Test Archive Date Extraction
 *
 * Tests fetching dates from archive.is and archive.org pages
 * to see if we can extract snapshot dates.
 */

import * as cheerio from 'cheerio'

// Test URLs from the analysis
const testUrls = [
  'http://archive.is/8iwdf',  // member.cash flipstarter
  'https://archive.is/wjWRb',  // member.cash flipstarter
  'https://web.archive.org/web/20200817074951/https://flipstarter.getstamp.io/',  // Stamp Wallet
  'http://archive.is/BsFbk',  // Stamp Wallet
  'http://archive.is/dj4bi',  // Electro CashX
]

async function extractDateFromArchiveIs(url: string): Promise<Date | null> {
  try {
    console.log(`  Fetching: ${url}`)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BCH-Atlas/1.0)'
      }
    })

    if (!response.ok) {
      console.log(`  ✗ Failed to fetch (${response.status})`)
      return null
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // archive.is stores the snapshot date in multiple places:
    // 1. In the page header/footer
    // 2. In meta tags
    // 3. In the page content

    // Try meta tags first
    const metaDate = $('meta[name="DCTERMS.created"]').attr('content') ||
                     $('meta[property="og:updated_time"]').attr('content')

    if (metaDate) {
      const date = new Date(metaDate)
      if (!isNaN(date.getTime())) {
        console.log(`  ✓ Found date in meta: ${date.toISOString()}`)
        return date
      }
    }

    // Try looking for date in the page content
    // archive.is typically shows "Saved from url on MM Month YYYY HH:MM:SS"
    const text = $('body').text()
    const dateMatch = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/)

    if (dateMatch) {
      const months: { [key: string]: number } = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
      }
      const date = new Date(
        parseInt(dateMatch[3]),  // year
        months[dateMatch[2]],    // month
        parseInt(dateMatch[1]),  // day
        parseInt(dateMatch[4]),  // hour
        parseInt(dateMatch[5]),  // minute
        parseInt(dateMatch[6])   // second
      )
      console.log(`  ✓ Found date in content: ${date.toISOString()}`)
      return date
    }

    console.log(`  ✗ No date found in page`)
    return null
  } catch (error) {
    console.log(`  ✗ Error: ${error}`)
    return null
  }
}

async function extractDateFromArchiveOrg(url: string): Promise<Date | null> {
  try {
    console.log(`  Fetching: ${url}`)

    // archive.org URLs have the date in the URL itself!
    // Format: https://web.archive.org/web/YYYYMMDDHHMMSS/original-url
    const dateMatch = url.match(/\/web\/(\d{14})\//)

    if (dateMatch) {
      const timestamp = dateMatch[1]
      const year = parseInt(timestamp.substring(0, 4))
      const month = parseInt(timestamp.substring(4, 6)) - 1  // JS months are 0-indexed
      const day = parseInt(timestamp.substring(6, 8))
      const hour = parseInt(timestamp.substring(8, 10))
      const minute = parseInt(timestamp.substring(10, 12))
      const second = parseInt(timestamp.substring(12, 14))

      const date = new Date(year, month, day, hour, minute, second)
      console.log(`  ✓ Extracted date from URL: ${date.toISOString()}`)
      return date
    }

    console.log(`  ✗ Could not parse date from URL`)
    return null
  } catch (error) {
    console.log(`  ✗ Error: ${error}`)
    return null
  }
}

async function main() {
  console.log('=' .repeat(70))
  console.log('Testing Archive Date Extraction')
  console.log('=' .repeat(70))
  console.log()

  let successCount = 0
  let failureCount = 0

  for (const url of testUrls) {
    console.log(`\nTesting: ${url}`)

    let date: Date | null = null

    if (url.includes('archive.org') || url.includes('web.archive.org')) {
      date = await extractDateFromArchiveOrg(url)
    } else if (url.includes('archive.is')) {
      date = await extractDateFromArchiveIs(url)
    } else {
      console.log('  ✗ Unknown archive type')
    }

    if (date) {
      successCount++
      console.log(`  → Result: ${date.toISOString().split('T')[0]}`)
    } else {
      failureCount++
      console.log(`  → Result: No date extracted`)
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log()
  console.log('=' .repeat(70))
  console.log('Summary:')
  console.log(`  Successful: ${successCount}/${testUrls.length}`)
  console.log(`  Failed: ${failureCount}/${testUrls.length}`)
  console.log('=' .repeat(70))

  if (successCount > 0) {
    console.log()
    console.log('✓ Date extraction from archive sites is viable!')
    console.log('  We can proceed with implementing this in the seed script.')
  } else {
    console.log()
    console.log('✗ Date extraction failed for all test cases.')
    console.log('  May need alternative approach or manual date entry.')
  }
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
