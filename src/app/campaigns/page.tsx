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
  if (filters.platform.size > 0) {
    filters.platform.forEach(p => params.append('platform', p))
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

  const queryKey = [
    'campaigns',
    filters.search,
    Array.from(filters.status),
    Array.from(filters.platform),
    filters.amountRange.min,
    filters.amountRange.max,
  ]

  const { data: allCampaigns = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchCampaigns(filters),
  })

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

  const sortedCampaigns = useMemo(() => {
    const campaigns = [...allCampaigns]
    switch (sortBy) {
      case 'date-desc':
        return campaigns.sort((a, b) => {
          if (!a.time && !b.time) return 0
          if (!a.time) return 1
          if (!b.time) return -1
          return new Date(b.time).getTime() - new Date(a.time).getTime()
        })
      case 'date-asc':
        return campaigns.sort((a, b) => {
          if (!a.time && !b.time) return 0
          if (!a.time) return 1
          if (!b.time) return -1
          return new Date(a.time).getTime() - new Date(b.time).getTime()
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
  }, [allCampaigns, sortBy])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="ds-holographic border-0 border-b border-[rgba(78,205,196,0.08)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/" className="text-lg font-light tracking-[0.15em] uppercase text-ds-cyan hover:opacity-80 transition-opacity">
                BCH ATLAS
              </Link>
              <p className="ds-label mt-0.5">Campaign Archive</p>
            </div>
            <div className="flex gap-3">
              <Link href="/graph" className="px-4 py-1.5 border border-[rgba(78,205,196,0.12)] text-[#7A8899] text-xs tracking-[0.08em] uppercase hover:border-[rgba(78,205,196,0.25)] hover:text-[#E0E4E8] transition-all">
                Graph
              </Link>
              <Link href="/" className="px-4 py-1.5 border border-[rgba(78,205,196,0.12)] text-[#7A8899] text-xs tracking-[0.08em] uppercase hover:border-[rgba(78,205,196,0.25)] hover:text-[#E0E4E8] transition-all">
                Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-8 ds-fade-in">
        <CampaignFilters filters={filters} onFilterChange={setFilters} stats={stats} />

        {/* Results Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-light text-ds-text">
              <span className="font-mono text-ds-cyan">{sortedCampaigns.length}</span> Campaign{sortedCampaigns.length !== 1 ? 's' : ''}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <label className="ds-label">Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 bg-[rgba(11,14,17,0.6)] border border-[rgba(78,205,196,0.1)] text-[#E0E4E8] text-xs focus:border-[rgba(78,205,196,0.3)] focus:outline-none transition-colors"
            >
              <option value="date-desc">Newest</option>
              <option value="date-asc">Oldest</option>
              <option value="amount-desc">Highest</option>
              <option value="amount-asc">Lowest</option>
              <option value="title-asc">A-Z</option>
            </select>
          </div>
        </div>

        {/* Campaign List */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block w-6 h-6 border-2 border-ds-cyan border-t-transparent rounded-full animate-spin"></div>
            <p className="text-ds-text-secondary text-sm mt-4">Loading...</p>
          </div>
        ) : sortedCampaigns.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-ds-text-secondary text-sm">No campaigns match filters.</p>
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
              className="mt-4 px-6 py-2 border border-ds-cyan text-ds-cyan text-xs tracking-[0.08em] uppercase hover:bg-ds-cyan/10 transition-all"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedCampaigns.map(campaign => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
