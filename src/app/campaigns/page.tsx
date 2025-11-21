'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { CampaignCard } from '@/components/campaigns/CampaignCard'
import { CampaignFilters, type FilterState } from '@/components/campaigns/CampaignFilters'
import type { Campaign } from '@/types/campaign'

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'title-asc'

async function fetchCampaigns(filters: FilterState): Promise<Campaign[]> {
  const params = new URLSearchParams()

  if (filters.search) params.set('search', filters.search)
  if (filters.status.size > 0) {
    filters.status.forEach(s => params.append('status', s))
  }
  if (filters.amountRange.min) params.set('minAmount', filters.amountRange.min)
  if (filters.amountRange.max) params.set('maxAmount', filters.amountRange.max)

  const response = await fetch(`/api/campaigns?${params.toString()}`)
  if (!response.ok) throw new Error('Failed to fetch campaigns')
  return response.json()
}

export default function CampaignsPage() {

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: new Set(),
    dateRange: { start: '', end: '' },
    amountRange: { min: '', max: '' },
    platform: new Set()
  })

  const [sortBy, setSortBy] = useState<SortOption>('date-desc')

  // Fetch campaigns from API with filters
  const { data: allCampaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns', filters],
    queryFn: () => fetchCampaigns(filters),
  })

  // Calculate stats from all campaigns (fetch without filters for stats)
  const { data: allCampaignsUnfiltered = [] } = useQuery({
    queryKey: ['campaigns-stats'],
    queryFn: () => fetchCampaigns({
      search: '',
      status: new Set(),
      dateRange: { start: '', end: '' },
      amountRange: { min: '', max: '' },
      platform: new Set()
    }),
  })

  const stats = useMemo(() => {
    const total = allCampaignsUnfiltered.length
    const success = allCampaignsUnfiltered.filter(c => c.status === 'success').length
    const failed = allCampaignsUnfiltered.filter(c => c.status === 'expired').length
    const running = allCampaignsUnfiltered.filter(c => c.status === 'running').length

    return { total, success, failed, running }
  }, [allCampaignsUnfiltered])

  // Campaigns are already filtered by API, just use them directly
  const filteredCampaigns = allCampaigns

  // Apply sorting
  const sortedCampaigns = useMemo(() => {
    const campaigns = [...filteredCampaigns]

    switch (sortBy) {
      case 'date-desc':
        return campaigns.sort((a, b) => {
          const dateA = a.time ? new Date(a.time).getTime() : 0
          const dateB = b.time ? new Date(b.time).getTime() : 0
          return dateB - dateA
        })

      case 'date-asc':
        return campaigns.sort((a, b) => {
          const dateA = a.time ? new Date(a.time).getTime() : 0
          const dateB = b.time ? new Date(b.time).getTime() : 0
          return dateA - dateB
        })

      case 'amount-desc':
        return campaigns.sort((a, b) => b.amount - a.amount)

      case 'amount-asc':
        return campaigns.sort((a, b) => a.amount - b.amount)

      case 'title-asc':
        return campaigns.sort((a, b) => a.title.localeCompare(b.title))

      default:
        return campaigns
    }
  }, [filteredCampaigns, sortBy])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
                BCH ATLAS
              </Link>
              <p className="text-sm text-gray-600">Browse All Campaigns</p>
            </div>
            <div className="flex gap-4">
              <Link
                href="/graph"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
              >
                Graph View
              </Link>
              <Link
                href="/"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <CampaignFilters filters={filters} onFilterChange={setFilters} stats={stats} />

        {/* Results Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {sortedCampaigns.length} Campaign{sortedCampaigns.length !== 1 ? 's' : ''}
            </h2>
            {sortedCampaigns.length !== allCampaigns.length && (
              <p className="text-sm text-gray-600">
                Filtered from {allCampaigns.length} total campaigns
              </p>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="amount-desc">Amount (Highest First)</option>
              <option value="amount-asc">Amount (Lowest First)</option>
              <option value="title-asc">Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Campaign List */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 text-lg mt-4">Loading campaigns...</p>
          </div>
        ) : sortedCampaigns.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No campaigns found matching your filters.</p>
            <button
              onClick={() =>
                setFilters({
                  search: '',
                  status: new Set(),
                  dateRange: { start: '', end: '' },
                  amountRange: { min: '', max: '' },
                  platform: new Set()
                })
              }
              className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedCampaigns.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
