import { NextRequest, NextResponse } from 'next/server'
import { getCampaignsWithPricing } from '@/lib/data/campaigns-with-pricing'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const platform = searchParams.getAll('platform')
    const status = searchParams.getAll('status')
    const search = searchParams.get('search')
    const minAmount = searchParams.get('minAmount')
    const maxAmount = searchParams.get('maxAmount')

    let campaigns = await getCampaignsWithPricing()

    if (platform.length > 0) {
      campaigns = campaigns.filter(c => platform.includes(c.platform))
    }

    if (status.length > 0) {
      campaigns = campaigns.filter(c => status.includes(c.status))
    }

    if (search) {
      const searchLower = search.toLowerCase()
      campaigns = campaigns.filter(c =>
        c.title.toLowerCase().includes(searchLower) ||
        (c.description && c.description.toLowerCase().includes(searchLower))
      )
    }

    if (minAmount) {
      const min = parseFloat(minAmount)
      campaigns = campaigns.filter(c => c.amount >= min)
    }

    if (maxAmount) {
      const max = parseFloat(maxAmount)
      campaigns = campaigns.filter(c => c.amount <= max)
    }

    // Sort by date descending (newest first)
    campaigns.sort((a, b) => {
      if (!a.time && !b.time) return 0
      if (!a.time) return 1
      if (!b.time) return -1
      return new Date(b.time).getTime() - new Date(a.time).getTime()
    })

    return NextResponse.json(campaigns)
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}
