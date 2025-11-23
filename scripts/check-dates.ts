import { config } from 'dotenv'
import { prisma } from '../src/lib/prisma'

config({ path: '.env.local' })

async function main() {
  // Count campaigns with and without time
  const total = await prisma.campaign.count()
  const withTime = await prisma.campaign.count({
    where: { time: { not: null } }
  })
  const withoutTime = total - withTime

  console.log('\nDate field statistics:')
  console.log(`  Total campaigns: ${total}`)
  console.log(`  With time field: ${withTime}`)
  console.log(`  Without time field (null): ${withoutTime}`)

  // Sample some campaigns to see the time values
  const samples = await prisma.campaign.findMany({
    take: 5,
    orderBy: { time: 'desc' },
    select: {
      title: true,
      time: true,
      status: true
    }
  })

  console.log('\nSample campaigns (newest first by time):')
  samples.forEach(c => {
    console.log(`  - ${c.title.substring(0, 50)}...`)
    console.log(`    time: ${c.time ? c.time.toISOString() : 'null'}`)
    console.log(`    status: ${c.status}`)
  })

  await prisma.$disconnect()
}

main()
