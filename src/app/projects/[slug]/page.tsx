import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCampaigns } from '@/lib/data/campaigns'
import { getResolvedProjectBySlug, getProjects } from '@/lib/data/project-resolver'

const STATUS_META: Record<string, { color: string; label: string; bg: string; icon: string }> = {
  active: { color: '#00FF88', label: 'Active', bg: 'rgba(0,255,136,0.08)', icon: '/iss-station.svg' },
  dormant: { color: '#E8A838', label: 'Dormant', bg: 'rgba(232,168,56,0.08)', icon: '/iss-station-dormant.svg' },
  unknown: { color: '#E8A838', label: 'Unknown', bg: 'rgba(232,168,56,0.08)', icon: '/iss-station-dormant.svg' },
  dead: { color: '#FF4455', label: 'Dead', bg: 'rgba(255,68,85,0.08)', icon: '/iss-station-dead.svg' },
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function timeSince(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000))
  if (days < 1) return 'today'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function generateStaticParams() {
  return getProjects().map(p => ({ slug: p.slug }))
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const campaigns = getCampaigns()
  const project = getResolvedProjectBySlug(slug, campaigns)
  if (!project) notFound()

  const status = STATUS_META[project.status] || STATUS_META.unknown
  const campaignMap = new Map(campaigns.map(c => [c.id, c]))
  // Newest campaigns first
  const timeline = [...project.timeline].sort((a, b) => {
    const ta = new Date(a.time).getTime() || 0
    const tb = new Date(b.time).getTime() || 0
    return tb - ta
  })

  return (
    <div className="min-h-screen ds-fade-in">
      <header className="border-0 border-b border-[rgba(0,224,160,0.1)]" style={{
        background: 'linear-gradient(180deg, rgba(0,180,140,0.06) 0%, rgba(7,10,13,0.95) 100%)',
      }}>
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <Link href="/" className="text-lg font-light tracking-[0.15em] uppercase text-[#00E0A0] hover:text-[#00FF88] transition-colors font-mono"
              style={{ textShadow: '0 0 10px rgba(0,224,160,0.3)' }}>
              BCH ATLAS
            </Link>
            <p className="text-[10px] uppercase tracking-[0.25em] mt-1" style={{ color: '#5A8A7A' }}>
              Project Station
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/projects"
              className="px-3 py-2 text-[11px] font-mono uppercase tracking-[0.12em]"
              style={{
                background: 'rgba(0,180,140,0.06)',
                border: '1px solid rgba(0,224,160,0.2)',
                color: '#00E0A0',
                borderRadius: '2px',
              }}
            >
              All Projects
            </Link>
            <Link
              href="/"
              className="px-3 py-2 text-[11px] font-mono uppercase tracking-[0.12em]"
              style={{
                background: 'rgba(0,180,140,0.06)',
                border: '1px solid rgba(0,224,160,0.2)',
                color: '#00E0A0',
                borderRadius: '2px',
              }}
            >
              Atlas
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Hero */}
        <div className="flex items-start gap-6 mb-8">
          <img src={status.icon} alt="" className="w-24 h-16 flex-shrink-0" style={{ filter: `drop-shadow(0 0 12px ${status.color}80)` }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-3xl font-light text-[#E8ECF0]" style={{ textShadow: '0 0 20px rgba(0,224,160,0.2)' }}>
                {project.name}
              </h1>
              <span
                className="text-[10px] font-mono uppercase px-2 py-0.5 tracking-wider"
                style={{
                  color: status.color,
                  background: status.bg,
                  border: `1px solid ${status.color}40`,
                  borderRadius: '2px',
                }}
              >
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono" style={{ color: '#7A8899' }}>
              <span className="capitalize">{project.continent}</span>
              {project.aliases.length > 0 && (
                <span>aliases: {project.aliases.slice(0, 3).join(', ')}</span>
              )}
            </div>
            {project.statusDetail && (
              <p className="text-[11px] text-[#5A8A7A] font-mono mt-2 leading-snug">
                {project.statusDetail}
                {project.statusCheckedAt && (
                  <span className="ml-2 text-[#3A6A5A]">· checked {timeSince(project.statusCheckedAt)}</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatTile label="campaigns" value={String(project.campaigns.length)} color="#00D4FF" />
          <StatTile label="bch raised" value={project.totalBCH.toFixed(1)} color="#00FF88" />
          <StatTile label="success rate" value={`${(project.successRate * 100).toFixed(0)}%`} color="#00E0A0" />
          <StatTile label="last commit" value={project.lastGithubCommit ? timeSince(project.lastGithubCommit) : '—'} color="#90A8A8" />
        </div>

        {/* Two-column: links + timeline */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Links column */}
          <aside className="md:col-span-1">
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-mono mb-3" style={{ color: '#5A8A7A' }}>External Links</h2>
            <div className="space-y-2">
              {project.website && (
                <ExtLink href={project.website} icon="↗" label="Website" />
              )}
              {project.github && (
                <ExtLink href={project.github} icon="⌥" label="Source" />
              )}
              {project.x && (
                <ExtLink href={project.x} icon="𝕏" label="X / Twitter" />
              )}
              {project.telegram && (
                <ExtLink href={project.telegram} icon="✈" label="Telegram" />
              )}
              {project.reddit && (
                <ExtLink href={project.reddit} icon="◴" label="Reddit" />
              )}
              {!project.website && !project.github && !project.x && !project.telegram && !project.reddit && (
                <p className="text-[11px] text-[#3A6A5A] font-mono">No external links recorded.</p>
              )}
            </div>

            {(project.lastGithubCommit !== null || project.websiteUp !== null) && (
              <>
                <h2 className="text-[10px] uppercase tracking-[0.2em] font-mono mb-3 mt-6" style={{ color: '#5A8A7A' }}>Liveness</h2>
                <div className="space-y-2 text-[11px] font-mono">
                  {project.lastGithubCommit && (
                    <div className="flex justify-between">
                      <span style={{ color: '#7A8899' }}>Last commit</span>
                      <span style={{ color: '#C0D0D0' }}>{formatDate(project.lastGithubCommit)}</span>
                    </div>
                  )}
                  {project.websiteUp !== null && (
                    <div className="flex justify-between">
                      <span style={{ color: '#7A8899' }}>Website</span>
                      <span style={{ color: project.websiteUp ? '#00FF88' : '#FF4455' }}>{project.websiteUp ? 'up' : 'down'}</span>
                    </div>
                  )}
                  {project.statusCheckedAt && (
                    <div className="flex justify-between">
                      <span style={{ color: '#7A8899' }}>Last checked</span>
                      <span style={{ color: '#C0D0D0' }}>{timeSince(project.statusCheckedAt)}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </aside>

          {/* Timeline column */}
          <section className="md:col-span-2">
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-mono mb-3" style={{ color: '#5A8A7A' }}>
              Funding Timeline ({timeline.length})
            </h2>
            {timeline.length === 0 ? (
              <p className="text-[11px] text-[#3A6A5A] font-mono py-6">
                No campaigns linked to this project yet. The Atlas tracks projects that ran Flipstarter or FundMe campaigns; projects without crowdfunding history won't have a timeline.
              </p>
            ) : (
              <div className="relative">
                {/* Timeline strand */}
                <div className="absolute left-[7px] top-0 bottom-0 w-px" style={{ background: 'linear-gradient(180deg, rgba(0,224,160,0.3), rgba(0,224,160,0.05))' }} />

                <ul className="space-y-3">
                  {timeline.map(entry => {
                    const c = campaignMap.get(entry.campaignId)
                    const sColor = entry.status === 'success' ? '#00FF88'
                      : entry.status === 'expired' || entry.status === 'failed' ? '#FF4455'
                      : entry.status === 'running' ? '#00E0A0'
                      : '#5A8A7A'
                    const goal = (c as any)?.goal as number | undefined
                    return (
                      <li key={entry.campaignId} className="relative pl-7">
                        <span
                          className="absolute left-[3px] top-2 w-[9px] h-[9px] rounded-full"
                          style={{ background: sColor, boxShadow: `0 0 8px ${sColor}` }}
                        />
                        <Link
                          href={`/campaigns/${entry.campaignId}`}
                          className="block p-3 transition-all hover:bg-[rgba(0,180,140,0.06)]"
                          style={{
                            background: 'rgba(0,180,140,0.03)',
                            border: '1px solid rgba(0,224,160,0.1)',
                            borderRadius: '2px',
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[13px] text-[#E8ECF0] leading-tight">{entry.title}</h3>
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono" style={{ color: '#7A8899' }}>
                                <span>{formatDate(entry.time)}</span>
                                <span style={{
                                  color: c?.platform === 'flipstarter' ? '#56E89C' : '#4ECDC4',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.1em',
                                  fontSize: '9px',
                                }}>
                                  {c?.platform || '—'}
                                </span>
                                <span style={{ color: sColor, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '9px' }}>
                                  {entry.status}
                                </span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="font-mono text-base" style={{ color: sColor }}>
                                {goal && goal !== entry.amount ? (
                                  <>
                                    {entry.amount.toFixed(1)}
                                    <span className="text-[#5A8A7A] mx-1">/</span>
                                    <span className="text-[#90A8A8] text-sm">{goal.toFixed(1)}</span>
                                  </>
                                ) : (
                                  entry.amount.toFixed(1)
                                )}
                                <span className="text-[10px] text-[#5A8A7A] ml-1">BCH</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

function StatTile({ label, value, color }: { label: string; value: string; color: string }) {
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

function ExtLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 transition-all hover:bg-[rgba(0,180,140,0.08)]"
      style={{
        background: 'rgba(0,180,140,0.03)',
        border: '1px solid rgba(0,224,160,0.12)',
        borderRadius: '2px',
      }}
    >
      <span className="font-mono w-4 text-center" style={{ color: '#00E0A0' }}>{icon}</span>
      <span className="text-[11px]" style={{ color: '#C0D0D0' }}>{label}</span>
      <span className="text-[10px] truncate ml-auto font-mono" style={{ color: '#5A8A7A' }}>
        {href.replace(/https?:\/\/(www\.)?/, '').slice(0, 30)}
      </span>
    </a>
  )
}
