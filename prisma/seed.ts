import { config } from 'dotenv'
import flipstartersData from '../data/flipstarters-with-addresses.json'
import { prisma } from '../src/lib/prisma'

// Load environment variables
config({ path: '.env.local' })

async function main() {
  console.log('Starting database seed...')

  // Clear existing data
  await prisma.recipient.deleteMany()
  await prisma.entity.deleteMany()
  await prisma.campaign.deleteMany()

  console.log('Cleared existing data')

  let imported = 0
  let skipped = 0

  for (const raw of flipstartersData as any[]) {
    try {
      // Map status
      let status = 'unknown'
      const statusLower = (raw.status || '').toLowerCase()
      if (statusLower === 'success' || statusLower === 'completed') status = 'success'
      else if (statusLower === 'expired' || statusLower === 'failed') status = 'expired'
      else if (statusLower === 'running' || statusLower === 'active') status = 'running'

      // Parse time
      let time: Date | null = null
      if (raw.time) {
        try {
          time = new Date(raw.time)
          if (isNaN(time.getTime())) time = null
        } catch {
          time = null
        }
      }

      // Handle category - convert array to string
      let category: string | null = null
      if (raw.category) {
        if (Array.isArray(raw.category)) {
          category = raw.category.join(', ')
        } else {
          category = raw.category
        }
      }

      // Create campaign
      const campaign = await prisma.campaign.create({
        data: {
          platform: 'flipstarter',
          title: raw.title || 'Untitled Campaign',
          description: raw.description || null,
          category,
          amount: parseFloat(raw.amount) || 0,
          raised: raw.raised ? parseFloat(raw.raised) : null,
          status,
          time,
          transactionTimestamp: raw.transactionTimestamp ? parseInt(raw.transactionTimestamp) : null,
          url: raw.url || '',
          archive: raw.archive || [],
          announcement: raw.announcement || [],
          tx: raw.tx || null,
          blockHeight: raw.blockHeight ? parseInt(raw.blockHeight) : null,
        },
      })

      // Create recipients
      if (raw.recipientAddresses && Array.isArray(raw.recipientAddresses)) {
        for (const address of raw.recipientAddresses) {
          await prisma.recipient.create({
            data: {
              address,
              campaignId: campaign.id,
            },
          })
        }
      }

      imported++
      if (imported % 10 === 0) {
        console.log(`Imported ${imported} campaigns...`)
      }
    } catch (error) {
      console.error(`Failed to import campaign: ${raw.title}`, error)
      skipped++
    }
  }

  console.log(`\n✓ Seed completed!`)
  console.log(`  - Imported: ${imported} campaigns`)
  console.log(`  - Skipped: ${skipped} campaigns`)
  console.log(`  - Total: ${flipstartersData.length} campaigns`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
