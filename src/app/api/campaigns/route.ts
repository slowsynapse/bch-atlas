import { NextRequest, NextResponse } from 'next/server'
import { getCampaignsWithPricing } from '@/lib/data/campaigns-with-pricing'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const platform = searchParams.getAll('platform')
    const status = searchParams.getAll('status')
    const projectStatus = searchParams.getAll('projectStatus')
    const continent = searchParams.getAll('continent')
    const search = searchParams.get('search')
    const minAmount = searchParams.get('minAmount')
    const maxAmount = searchParams.get('maxAmount')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let campaigns = await getCampaignsWithPricing()

    if (platform.length > 0) {
      campaigns = campaigns.filter(c => platform.includes(c.platform))
    }

    if (status.length > 0) {
      campaigns = campaigns.filter(c => status.includes(c.status))
    }

    if (projectStatus.length > 0) {
      // 'unlinked' = funded campaign with no project linkage; otherwise match
      // the campaign's inherited projectStatus
      campaigns = campaigns.filter(c => {
        if (!c.projectSlug) return projectStatus.includes('unlinked')
        return c.projectStatus ? projectStatus.includes(c.projectStatus) : false
      })
    }

    if (continent.length > 0) {
      campaigns = campaigns.filter(c => c.continent && continent.includes(c.continent))
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

    if (startDate) {
      campaigns = campaigns.filter(c => c.time && c.time >= startDate)
    }

    if (endDate) {
      campaigns = campaigns.filter(c => c.time && c.time <= endDate)
    }

    // Sort by date descending (newest first), undated last
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
