import flipstartersData from '../data/flipstarters-with-addresses.json'

async function main() {
  const byStatus: Record<string, { total: number; withTimestamp: number; withoutTimestamp: number }> = {}

  for (const raw of flipstartersData as any[]) {
    const status = (raw.status || 'unknown').toLowerCase()

    if (!byStatus[status]) {
      byStatus[status] = { total: 0, withTimestamp: 0, withoutTimestamp: 0 }
    }

    byStatus[status].total++

    if (raw.transactionTimestamp) {
      byStatus[status].withTimestamp++
    } else {
      byStatus[status].withoutTimestamp++
    }
  }

  console.log('\nTransactionTimestamp coverage by status:\n')
  Object.entries(byStatus).forEach(([status, stats]) => {
    console.log(`${status.toUpperCase()}:`)
    console.log(`  Total: ${stats.total}`)
    console.log(`  With timestamp: ${stats.withTimestamp}`)
    console.log(`  Without timestamp: ${stats.withoutTimestamp}`)
    console.log(`  Coverage: ${((stats.withTimestamp / stats.total) * 100).toFixed(1)}%\n`)
  })
}

main()
