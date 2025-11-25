/**
 * Analyze Archive URLs
 *
 * Investigates what types of archive URLs exist and which campaigns
 * could benefit from archive website date extraction.
 */

import flipstartersData from '../data/flipstarters-with-addresses.json'

async function main() {
  console.log('=' .repeat(70))
  console.log('Archive URL Analysis')
  console.log('=' .repeat(70))
  console.log()

  const stats = {
    total: flipstartersData.length,
    withDates: 0,
    withoutDates: 0,
    withArchives: 0,
    withoutArchives: 0,
    archiveTypes: {
      archiveIs: 0,
      archiveOrg: 0,
      screenshot: 0,
      other: 0
    },
    candidatesForExtraction: [] as any[]
  }

  for (const campaign of flipstartersData as any[]) {
    const hasTimestamp = !!campaign.transactionTimestamp
    const hasArchive = campaign.archive && Array.isArray(campaign.archive) && campaign.archive.length > 0

    if (hasTimestamp) {
      stats.withDates++
    }

    // Check if campaign would have a date after current extraction logic
    let wouldHaveDate = hasTimestamp

    if (!wouldHaveDate && hasArchive) {
      // Check if any archive URL has a date in screenshot filename
      for (const archiveUrl of campaign.archive) {
        if (archiveUrl.match(/\d{4}-\d{2}-\d{2}/)) {
          wouldHaveDate = true
          break
        }
      }
    }

    if (!wouldHaveDate) {
      stats.withoutDates++
    }

    if (hasArchive) {
      stats.withArchives++

      // Categorize archive URLs
      for (const archiveUrl of campaign.archive) {
        if (archiveUrl.includes('archive.is')) {
          stats.archiveTypes.archiveIs++
        } else if (archiveUrl.includes('archive.org') || archiveUrl.includes('web.archive.org')) {
          stats.archiveTypes.archiveOrg++
        } else if (archiveUrl.includes('screenshot')) {
          stats.archiveTypes.screenshot++
        } else {
          stats.archiveTypes.other++
        }
      }

      // If campaign has no date but has archives, it's a candidate
      if (!wouldHaveDate) {
        stats.candidatesForExtraction.push({
          title: campaign.title,
          status: campaign.status,
          archives: campaign.archive
        })
      }
    } else {
      stats.withoutArchives++
    }
  }

  console.log('Overall Statistics:')
  console.log(`  Total campaigns: ${stats.total}`)
  console.log(`  Currently have dates: ${stats.withDates} (from transactionTimestamp)`)
  console.log(`  Would have dates after current extraction: ${stats.total - stats.withoutDates}`)
  console.log(`  Still missing dates: ${stats.withoutDates}`)
  console.log()

  console.log('Archive URL Statistics:')
  console.log(`  Campaigns with archives: ${stats.withArchives}`)
  console.log(`  Campaigns without archives: ${stats.withoutArchives}`)
  console.log()

  console.log('Archive URL Types:')
  console.log(`  archive.is URLs: ${stats.archiveTypes.archiveIs}`)
  console.log(`  archive.org URLs: ${stats.archiveTypes.archiveOrg}`)
  console.log(`  Screenshot URLs (with dates): ${stats.archiveTypes.screenshot}`)
  console.log(`  Other archive URLs: ${stats.archiveTypes.other}`)
  console.log()

  console.log('Candidates for Archive Website Date Extraction:')
  console.log(`  Total: ${stats.candidatesForExtraction.length} campaigns`)
  console.log()

  if (stats.candidatesForExtraction.length > 0) {
    console.log('Sample candidates (first 10):')
    stats.candidatesForExtraction.slice(0, 10).forEach((candidate, i) => {
      console.log(`\n  ${i + 1}. ${candidate.title}`)
      console.log(`     Status: ${candidate.status}`)
      console.log(`     Archives:`)
      candidate.archives.forEach((url: string) => {
        const type = url.includes('archive.is') ? '[archive.is]' :
                     url.includes('archive.org') ? '[archive.org]' :
                     url.includes('screenshot') ? '[screenshot]' : '[other]'
        console.log(`       ${type} ${url}`)
      })
    })
  }

  console.log()
  console.log('=' .repeat(70))
  console.log('Potential Improvement:')
  console.log(`  Current date coverage: ${stats.total - stats.withoutDates}/${stats.total} (${((1 - stats.withoutDates / stats.total) * 100).toFixed(1)}%)`)

  const potentialImprovement = stats.candidatesForExtraction.filter((c: any) =>
    c.archives.some((url: string) => url.includes('archive.is') || url.includes('archive.org'))
  ).length

  console.log(`  Candidates with archive.is/archive.org: ${potentialImprovement}`)
  console.log(`  Potential new coverage: ${stats.total - stats.withoutDates + potentialImprovement}/${stats.total} (${((1 - (stats.withoutDates - potentialImprovement) / stats.total) * 100).toFixed(1)}%)`)
  console.log('=' .repeat(70))
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
