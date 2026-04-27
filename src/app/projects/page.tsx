import Link from 'next/link'
import { getCampaigns } from '@/lib/data/campaigns'
import { getResolvedProjects } from '@/lib/data/project-resolver'
import type { Continent } from '@/types/project'

const STATUS_META: Record<string, { color: string; label: string; icon: string }> = {
  active: { color: '#00FF88', label: 'Active', icon: '/iss-station.svg' },
  dormant: { color: '#E8A838', label: 'Dormant', icon: '/iss-station-dormant.svg' },
  unknown: { color: '#E8A838', label: 'Unknown', icon: '/iss-station-dormant.svg' },
  dead: { color: '#FF4455', label: 'Dead', icon: '/iss-station-dead.svg' },
}

const CONTINENTS: { key: Continent; label: string }[] = [
  { key: 'core', label: 'Core Infrastructure' },
  { key: 'middleware', label: 'Middleware & Libraries' },
  { key: 'apps', label: 'Apps & Wallets' },
  { key: 'defi', label: 'DeFi & Contracts' },
  { key: 'media', label: 'Media & Education' },
  { key: 'charity', label: 'Charity & Adoption' },
  { key: 'ecosystem', label: 'Ecosystem Initiatives' },
  { key: 'other', label: 'Other' },
]

export default function ProjectsBrowsePage() {
  const campaigns = getCampaigns()
  const projects = getResolvedProjects(campaigns)

  // Group by continent
  const byContinent = new Map<string, typeof projects>()
  for (const p of projects) {
    if (!byContinent.has(p.continent)) byContinent.set(p.continent, [])
    byContinent.get(p.continent)!.push(p)
  }

  // Sort each group: active first, then by total BCH desc
  const statusRank: Record<string, number> = { active: 0, dormant: 1, unknown: 2, dead: 3 }
  for (const list of byContinent.values()) {
    list.sort((a, b) => {
      const sa = statusRank[a.status] ?? 4
      const sb = statusRank[b.status] ?? 4
      if (sa !== sb) return sa - sb
      return b.totalBCH - a.totalBCH
    })
  }

  // Counts
  const totalActive = projects.filter(p => p.status === 'active').length
  const totalDormant = projects.filter(p => p.status === 'dormant').length
  const totalUnknown = projects.filter(p => p.status === 'unknown').length
  const totalDead = projects.filter(p => p.status === 'dead').length
  const totalLinked = projects.filter(p => p.campaigns.length > 0).length
  const totalBCHAcrossAll = projects.reduce((s, p) => s + p.totalBCH, 0)
  const totalGitHub = projects.filter(p => !!p.github).length

  return (
    <div className="min-h-screen ds-fade-in">
      {/* Header */}
      <header className="border-0 border-b border-[rgba(0,224,160,0.1)]" style={{
        background: 'linear-gradient(180deg, rgba(0,180,140,0.06) 0%, rgba(7,10,13,0.95) 100%)',
      }}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <Link href="/" className="text-lg font-light tracking-[0.15em] uppercase text-[#00E0A0] hover:text-[#00FF88] transition-colors font-mono"
                style={{ textShadow: '0 0 10px rgba(0,224,160,0.3)' }}>
                BCH ATLAS
              </Link>
              <p className="text-[10px] uppercase tracking-[0.25em] mt-1" style={{ color: '#5A8A7A' }}>
                Project Registry — All Roads Lead to Bitcoin Cash
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="px-3 py-2 text-[11px] font-mono uppercase tracking-[0.12em] transition-all"
                style={{
                  background: 'rgba(0,180,140,0.06)',
                  border: '1px solid rgba(0,224,160,0.2)',
                  color: '#00E0A0',
                  borderRadius: '2px',
                }}
              >
                Back to Atlas
              </Link>
              <Link
                href="/projects/github"
                className="px-3 py-2 text-[11px] font-mono uppercase tracking-[0.12em] transition-all"
                style={{
                  background: 'rgba(0,180,140,0.06)',
                  border: '1px solid rgba(0,224,160,0.2)',
                  color: '#00E0A0',
                  borderRadius: '2px',
                }}
              >
                Browse GitHub
              </Link>
              <Link
                href="/campaigns"
                className="px-3 py-2 text-[11px] font-mono uppercase tracking-[0.12em] transition-all"
                style={{
                  background: 'rgba(0,180,140,0.06)',
                  border: '1px solid rgba(0,224,160,0.2)',
                  color: '#00E0A0',
                  borderRadius: '2px',
                }}
              >
                Campaigns
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {/* Stats summary */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <StatTile label="active" value={totalActive} color="#00FF88" />
          <StatTile label="tracked" value={projects.length} color="#00D4FF" />
          <StatTile label="dormant" value={totalDormant} color="#E8A838" />
          <StatTile label="dead" value={totalDead} color="#FF4455" />
          <StatTile label="unknown" value={totalUnknown} color="#5A8A7A" />
          <StatTile label="with github" value={totalGitHub} color="#90A8A8" />
        </div>

        <div className="text-[10px] font-mono uppercase tracking-[0.15em] mb-6" style={{ color: '#5A8A7A' }}>
          {totalLinked} of {projects.length} have linked campaigns ·{' '}
          {projects.reduce((s, p) => s + p.campaigns.length, 0)} campaigns total ·{' '}
          {totalBCHAcrossAll.toFixed(0)} BCH raised
        </div>

        {/* Per-continent sections */}
        {CONTINENTS.map(cont => {
          const list = byContinent.get(cont.key) || []
          if (list.length === 0) return null
          return (
            <section key={cont.key} className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[#00E0A0]" style={{ textShadow: '0 0 10px rgba(0,224,160,0.3)' }}>
                  {cont.label}
                </h2>
                <span className="text-[10px] font-mono" style={{ color: '#3A6A5A' }}>{list.length}</span>
                <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(0,224,160,0.2), rgba(0,224,160,0.02))' }} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map(p => {
                  const status = STATUS_META[p.status] || STATUS_META.unknown
                  return (
                    <Link
                      key={p.slug}
                      href={`/projects/${p.slug}`}
                      className="block p-3 transition-all hover:bg-[rgba(0,180,140,0.06)]"
                      style={{
                        background: 'rgba(0,180,140,0.03)',
                        border: '1px solid rgba(0,224,160,0.12)',
                        borderRadius: '2px',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <img src={status.icon} alt="" className="w-10 h-7 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="text-sm font-medium text-[#E8ECF0] truncate">{p.name}</h3>
                            <span
                              className="text-[9px] font-mono uppercase px-1.5 py-px tracking-wider flex-shrink-0"
                              style={{
                                color: status.color,
                                border: `1px solid ${status.color}40`,
                                borderRadius: '1px',
                                background: `${status.color}10`,
                              }}
                            >
                              {status.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: '#5A8A7A' }}>
                            {p.campaigns.length > 0 ? (
                              <>
                                <span><span style={{ color: '#00FF88' }}>{p.totalBCH.toFixed(0)}</span> BCH</span>
                                <span>{p.campaigns.length} campaign{p.campaigns.length !== 1 ? 's' : ''}</span>
                                <span>{(p.successRate * 100).toFixed(0)}% success</span>
                              </>
                            ) : (
                              <span style={{ color: '#3A6A5A' }}>no campaigns linked</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 text-[9px] font-mono">
                            {p.github && (
                              <span className="truncate" style={{ color: '#90A8A8' }}>⌥ github</span>
                            )}
                            {p.website && (
                              <span className="truncate" style={{ color: '#90A8A8' }}>↗ website</span>
                            )}
                            {p.x && (
                              <span style={{ color: '#90A8A8' }}>𝕏</span>
                            )}
                            {p.telegram && (
                              <span style={{ color: '#90A8A8' }}>✈</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </main>
    </div>
  )
}

function StatTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-3" style={{
      background: 'rgba(0,180,140,0.04)',
      border: '1px solid rgba(0,224,160,0.1)',
      borderRadius: '2px',
    }}>
      <div className="font-mono text-2xl font-medium" style={{ color, textShadow: `0 0 10px ${color}50` }}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-[0.15em] mt-0.5" style={{ color: '#5A8A7A' }}>
        {label}
      </div>
    </div>
  )
}
