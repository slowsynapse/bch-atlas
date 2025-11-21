import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    // Parse filters from query params
    const platform = searchParams.get('platform')
    const status = searchParams.getAll('status')
    const search = searchParams.get('search')
    const minAmount = searchParams.get('minAmount')
    const maxAmount = searchParams.get('maxAmount')

    // Build where clause
    const where: any = {}

    if (platform) {
      where.platform = platform
    }

    if (status.length > 0) {
      where.status = { in: status }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (minAmount || maxAmount) {
      where.amount = {}
      if (minAmount) where.amount.gte = parseFloat(minAmount)
      if (maxAmount) where.amount.lte = parseFloat(maxAmount)
    }

    // Fetch campaigns with recipients
    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        recipients: true,
      },
      orderBy: {
        time: 'desc',
      },
    })

    // Transform to match frontend format
    const transformed = campaigns.map((campaign) => ({
      id: campaign.id,
      platform: campaign.platform,
      title: campaign.title,
      description: campaign.description,
      category: campaign.category,
      amount: campaign.amount,
      raised: campaign.raised || null,
      status: campaign.status,
      time: campaign.time?.toISOString() || null,
      transactionTimestamp: campaign.transactionTimestamp,
      url: campaign.url,
      archive: campaign.archive,
      announcement: campaign.announcement,
      tx: campaign.tx,
      blockHeight: campaign.blockHeight,
      recipientAddresses: campaign.recipients.map((r) => r.address),
    }))

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}
