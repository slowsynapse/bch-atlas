'use client'

export interface FilterState {
  search: string
  status: Set<string>
  dateRange: {
    start: string
    end: string
  }
  amountRange: {
    min: string
    max: string
  }
  platform: Set<string>
}

interface CampaignFiltersProps {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  stats: {
    total: number
    success: number
    failed: number
    running: number
  }
}

export function CampaignFilters({ filters, onFilterChange, stats }: CampaignFiltersProps) {
  const updateFilter = (key: keyof FilterState, value: any) => {
    onFilterChange({ ...filters, [key]: value })
  }

  const toggleStatus = (status: string) => {
    const newStatus = new Set(filters.status)
    if (newStatus.has(status)) {
      newStatus.delete(status)
    } else {
      newStatus.add(status)
    }
    updateFilter('status', newStatus)
  }

  const togglePlatform = (platform: string) => {
    const newPlatform = new Set(filters.platform)
    if (newPlatform.has(platform)) {
      newPlatform.delete(platform)
    } else {
      newPlatform.add(platform)
    }
    updateFilter('platform', newPlatform)
  }

  const clearFilters = () => {
    onFilterChange({
      search: '',
      status: new Set(),
      dateRange: { start: '', end: '' },
      amountRange: { min: '', max: '' },
      platform: new Set()
    })
  }

  const hasActiveFilters =
    filters.search ||
    filters.status.size > 0 ||
    filters.dateRange.start ||
    filters.dateRange.end ||
    filters.amountRange.min ||
    filters.amountRange.max ||
    filters.platform.size > 0

  return (
    <div className="ds-holographic p-5 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="ds-label">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-ds-cyan hover:text-ds-cyan/80 transition-colors tracking-[0.08em] uppercase"
          >
            Clear
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search campaigns..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="w-full px-4 py-2.5 bg-[rgba(11,14,17,0.6)] border border-[rgba(78,205,196,0.1)] text-[#E0E4E8] text-sm placeholder-[#5A6A7A] focus:border-[rgba(78,205,196,0.3)] focus:outline-none focus:shadow-[0_0_20px_rgba(78,205,196,0.05)] transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status */}
        <div>
          <label className="ds-label block mb-2">Status</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#8A9AAB] hover:text-[#E0E4E8] transition-colors">
              <input type="checkbox" checked={filters.status.has('success')} onChange={() => toggleStatus('success')} className="w-3.5 h-3.5 accent-[#56E89C]" />
              <span>Success ({stats.success})</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#8A9AAB] hover:text-[#E0E4E8] transition-colors">
              <input type="checkbox" checked={filters.status.has('expired')} onChange={() => toggleStatus('expired')} className="w-3.5 h-3.5 accent-[#E85454]" />
              <span>Failed ({stats.failed})</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#8A9AAB] hover:text-[#E0E4E8] transition-colors">
              <input type="checkbox" checked={filters.status.has('running')} onChange={() => toggleStatus('running')} className="w-3.5 h-3.5 accent-[#4ECDC4]" />
              <span>Running ({stats.running})</span>
            </label>
          </div>
        </div>

        {/* Platform */}
        <div>
          <label className="ds-label block mb-2">Platform</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#8A9AAB] hover:text-[#E0E4E8] transition-colors">
              <input type="checkbox" checked={filters.platform.has('flipstarter')} onChange={() => togglePlatform('flipstarter')} className="w-3.5 h-3.5 accent-[#4ECDC4]" />
              <span>Flipstarter</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#8A9AAB] hover:text-[#E0E4E8] transition-colors">
              <input type="checkbox" checked={filters.platform.has('fundme')} onChange={() => togglePlatform('fundme')} className="w-3.5 h-3.5 accent-[#4ECDC4]" />
              <span>FundMe.cash</span>
            </label>
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label className="ds-label block mb-2">Date Range</label>
          <div className="space-y-2">
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })}
              className="w-full px-3 py-1.5 bg-[rgba(11,14,17,0.6)] border border-[rgba(78,205,196,0.1)] text-[#E0E4E8] text-xs focus:border-[rgba(78,205,196,0.3)] focus:outline-none transition-colors"
            />
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
              className="w-full px-3 py-1.5 bg-[rgba(11,14,17,0.6)] border border-[rgba(78,205,196,0.1)] text-[#E0E4E8] text-xs focus:border-[rgba(78,205,196,0.3)] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Amount Range */}
        <div>
          <label className="ds-label block mb-2">Amount (BCH)</label>
          <div className="space-y-2">
            <input
              type="number"
              value={filters.amountRange.min}
              onChange={(e) => updateFilter('amountRange', { ...filters.amountRange, min: e.target.value })}
              className="w-full px-3 py-1.5 bg-[rgba(11,14,17,0.6)] border border-[rgba(78,205,196,0.1)] text-[#E0E4E8] text-xs font-mono focus:border-[rgba(78,205,196,0.3)] focus:outline-none transition-colors"
              placeholder="Min"
              min="0"
              step="0.01"
            />
            <input
              type="number"
              value={filters.amountRange.max}
              onChange={(e) => updateFilter('amountRange', { ...filters.amountRange, max: e.target.value })}
              className="w-full px-3 py-1.5 bg-[rgba(11,14,17,0.6)] border border-[rgba(78,205,196,0.1)] text-[#E0E4E8] text-xs font-mono focus:border-[rgba(78,205,196,0.3)] focus:outline-none transition-colors"
              placeholder="Max"
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
