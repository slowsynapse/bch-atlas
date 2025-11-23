import { config } from 'dotenv'
import { prisma } from '../src/lib/prisma'

config({ path: '.env.local' })

async function main() {
  const platforms = await prisma.campaign.groupBy({
    by: ['platform'],
    _count: { platform: true }
  })

  console.log('Platform distribution:')
  platforms.forEach(p => {
    console.log(`  ${p.platform}: ${p._count.platform} campaigns`)
  })

  await prisma.$disconnect()
}

main()
