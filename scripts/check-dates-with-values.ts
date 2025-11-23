import { config } from 'dotenv'
import { prisma } from '../src/lib/prisma'

config({ path: '.env.local' })

async function main() {
  // Sample campaigns WITH time values
  const withTime = await prisma.campaign.findMany({
    where: { time: { not: null } },
    take: 5,
    orderBy: { time: 'desc' },
    select: {
      title: true,
      time: true,
      status: true,
      transactionTimestamp: true
    }
  })

  console.log('\nSample campaigns WITH time (newest first):')
  withTime.forEach(c => {
    console.log(`  - ${c.title.substring(0, 50)}...`)
    console.log(`    time: ${c.time ? c.time.toISOString() : 'null'}`)
    console.log(`    transactionTimestamp: ${c.transactionTimestamp}`)
    console.log(`    status: ${c.status}`)
  })

  await prisma.$disconnect()
}

main()
