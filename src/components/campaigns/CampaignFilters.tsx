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
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search campaigns by title or description..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.status.has('success')}
                onChange={() => toggleStatus('success')}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Success ({stats.success})</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.status.has('expired')}
                onChange={() => toggleStatus('expired')}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Failed ({stats.failed})</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.status.has('running')}
                onChange={() => toggleStatus('running')}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Running ({stats.running})</span>
            </label>
          </div>
        </div>

        {/* Platform Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Platform
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.platform.has('flipstarter')}
                onChange={() => togglePlatform('flipstarter')}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Flipstarter</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.platform.has('fundme')}
                onChange={() => togglePlatform('fundme')}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">FundMe.cash</span>
            </label>
          </div>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Range
          </label>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">From</label>
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) =>
                  updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">To</label>
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) =>
                  updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Amount Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (BCH)
          </label>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Minimum</label>
              <input
                type="number"
                value={filters.amountRange.min}
                onChange={(e) =>
                  updateFilter('amountRange', { ...filters.amountRange, min: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Maximum</label>
              <input
                type="number"
                value={filters.amountRange.max}
                onChange={(e) =>
                  updateFilter('amountRange', { ...filters.amountRange, max: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1000.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
