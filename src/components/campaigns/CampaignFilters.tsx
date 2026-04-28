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
  projectStatus: Set<string>      // 'active' | 'dormant' | 'dead' | 'unknown' | 'unlinked'
  continent: Set<string>          // 'core' | 'middleware' | 'apps' | 'defi' | 'media' | 'charity' | 'ecosystem' | 'other'
}

interface FilterStats {
  total: number
  success: number
  failed: number
  running: number
  // by project status
  projectActive: number
  projectDormant: number
  projectDead: number
  projectUnknown: number
  projectUnlinked: number
  // by continent
  continentCounts: Record<string, number>
}

interface CampaignFiltersProps {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  stats: FilterStats
}

const CONTINENT_LABELS: Record<string, string> = {
  core: 'Core',
  middleware: 'Middleware',
  apps: 'Apps & Wallets',
  defi: 'DeFi',
  media: 'Media',
  charity: 'Charity',
  ecosystem: 'Ecosystem',
  other: 'Other',
}

const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: '#00FF88',
  dormant: '#E8A838',
  dead: '#FF4455',
  unknown: '#90A8A8',
  unlinked: '#FF8C00',
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

  const toggleProjectStatus = (s: string) => {
    const next = new Set(filters.projectStatus)
    if (next.has(s)) next.delete(s)
    else next.add(s)
    updateFilter('projectStatus', next)
  }

  const toggleContinent = (c: string) => {
    const next = new Set(filters.continent)
    if (next.has(c)) next.delete(c)
    else next.add(c)
    updateFilter('continent', next)
  }

  const clearFilters = () => {
    onFilterChange({
      search: '',
      status: new Set(),
      dateRange: { start: '', end: '' },
      amountRange: { min: '', max: '' },
      platform: new Set(),
      projectStatus: new Set(),
      continent: new Set(),
    })
  }

  const hasActiveFilters =
    filters.search ||
    filters.status.size > 0 ||
    filters.dateRange.start ||
    filters.dateRange.end ||
    filters.amountRange.min ||
    filters.amountRange.max ||
    filters.platform.size > 0 ||
    filters.projectStatus.size > 0 ||
    filters.continent.size > 0

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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Campaign status */}
        <div>
          <label className="ds-label block mb-2">Campaign</label>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#8A9AAB] hover:text-[#E0E4E8] transition-colors">
              <input type="checkbox" checked={filters.status.has('success')} onChange={() => toggleStatus('success')} className="w-3.5 h-3.5 accent-[#56E89C]" />
              <span>Funded <span className="text-[#5A8A7A]">({stats.success})</span></span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#8A9AAB] hover:text-[#E0E4E8] transition-colors">
              <input type="checkbox" checked={filters.status.has('expired')} onChange={() => toggleStatus('expired')} className="w-3.5 h-3.5 accent-[#E85454]" />
              <span>Expired <span className="text-[#5A8A7A]">({stats.failed})</span></span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#8A9AAB] hover:text-[#E0E4E8] transition-colors">
              <input type="checkbox" checked={filters.status.has('running')} onChange={() => toggleStatus('running')} className="w-3.5 h-3.5 accent-[#4ECDC4]" />
              <span>Active <span className="text-[#5A8A7A]">({stats.running})</span></span>
            </label>
          </div>
        </div>

        {/* Project status (the new project layer) */}
        <div>
          <label className="ds-label block mb-2">Project</label>
          <div className="space-y-1.5">
            {([
              ['active', 'Alive', stats.projectActive],
              ['dormant', 'Dormant', stats.projectDormant],
              ['dead', 'Dead', stats.projectDead],
              ['unknown', 'Unknown', stats.projectUnknown],
              ['unlinked', 'Unlinked', stats.projectUnlinked],
            ] as const).map(([key, label, count]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer text-xs text-[#8A9AAB] hover:text-[#E0E4E8] transition-colors">
                <input
                  type="checkbox"
                  checked={filters.projectStatus.has(key)}
                  onChange={() => toggleProjectStatus(key)}
                  className="w-3.5 h-3.5"
                  style={{ accentColor: PROJECT_STATUS_COLORS[key] }}
                />
                <span>{label} <span className="text-[#5A8A7A]">({count})</span></span>
              </label>
            ))}
          </div>
        </div>

        {/* Continent */}
        <div>
          <label className="ds-label block mb-2">Continent</label>
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {Object.keys(CONTINENT_LABELS).map(c => (
              <label key={c} className="flex items-center gap-2 cursor-pointer text-xs text-[#8A9AAB] hover:text-[#E0E4E8] transition-colors">
                <input
                  type="checkbox"
                  checked={filters.continent.has(c)}
                  onChange={() => toggleContinent(c)}
                  className="w-3.5 h-3.5 accent-[#4ECDC4]"
                />
                <span>{CONTINENT_LABELS[c]} <span className="text-[#5A8A7A]">({stats.continentCounts[c] || 0})</span></span>
              </label>
            ))}
          </div>
        </div>

        {/* Platform */}
        <div>
          <label className="ds-label block mb-2">Platform</label>
          <div className="space-y-1.5">
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
              className="w-full px-2 py-1.5 bg-[rgba(11,14,17,0.6)] border border-[rgba(78,205,196,0.1)] text-[#E0E4E8] text-xs focus:border-[rgba(78,205,196,0.3)] focus:outline-none transition-colors"
            />
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
              className="w-full px-2 py-1.5 bg-[rgba(11,14,17,0.6)] border border-[rgba(78,205,196,0.1)] text-[#E0E4E8] text-xs focus:border-[rgba(78,205,196,0.3)] focus:outline-none transition-colors"
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
              className="w-full px-2 py-1.5 bg-[rgba(11,14,17,0.6)] border border-[rgba(78,205,196,0.1)] text-[#E0E4E8] text-xs font-mono focus:border-[rgba(78,205,196,0.3)] focus:outline-none transition-colors"
              placeholder="Min"
              min="0"
              step="0.01"
            />
            <input
              type="number"
              value={filters.amountRange.max}
              onChange={(e) => updateFilter('amountRange', { ...filters.amountRange, max: e.target.value })}
              className="w-full px-2 py-1.5 bg-[rgba(11,14,17,0.6)] border border-[rgba(78,205,196,0.1)] text-[#E0E4E8] text-xs font-mono focus:border-[rgba(78,205,196,0.3)] focus:outline-none transition-colors"
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
