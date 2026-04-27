import Link from 'next/link'
import { getProjects } from '@/lib/data/project-resolver'

const STATUS_META: Record<string, { color: string; label: string }> = {
  active: { color: '#00FF88', label: 'Active' },
  dormant: { color: '#E8A838', label: 'Dormant' },
  unknown: { color: '#E8A838', label: 'Unknown' },
  dead: { color: '#FF4455', label: 'Dead' },
}

function commitAgeBucket(iso: string | null): { days: number | null; bucket: string; color: string } {
  if (!iso) return { days: null, bucket: 'no data', color: '#3A6A5A' }
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000))
  if (days < 30) return { days, bucket: '< 1mo', color: '#00FF88' }
  if (days < 180) return { days, bucket: '< 6mo', color: '#00E0A0' }
  if (days < 365) return { days, bucket: '< 1yr', color: '#E8A838' }
  if (days < 730) return { days, bucket: '< 2yr', color: '#E8A838' }
  return { days, bucket: '2yr+', color: '#FF4455' }
}

function parseHostRepo(url: string): { host: string; owner: string; repo: string } | null {
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    return { host: u.hostname, owner: parts[0], repo: parts[1] }
  } catch {
    return null
  }
}

export default function GitHubBrowsePage() {
  const all = getProjects()
  const withGit = all.filter(p => !!p.github)

  // Sort by commit recency: known commits first (newest first), then no-data, dead last
  const sorted = [...withGit].sort((a, b) => {
    const aDate = a.lastGithubCommit ? new Date(a.lastGithubCommit).getTime() : 0
    const bDate = b.lastGithubCommit ? new Date(b.lastGithubCommit).getTime() : 0
    return bDate - aDate
  })

  // Bucket counts
  const buckets = { '< 1mo': 0, '< 6mo': 0, '< 1yr': 0, '< 2yr': 0, '2yr+': 0, 'no data': 0 }
  for (const p of withGit) {
    const b = commitAgeBucket(p.lastGithubCommit).bucket
    buckets[b as keyof typeof buckets]++
  }

  // Host breakdown
  const hostCounts: Record<string, number> = {}
  for (const p of withGit) {
    const r = parseHostRepo(p.github!)
    if (r) hostCounts[r.host] = (hostCounts[r.host] || 0) + 1
  }

  return (
    <div className="min-h-screen ds-fade-in">
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
                GitHub Registry — Repositories Tracked Across BCH
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
                href="/projects"
                className="px-3 py-2 text-[11px] font-mono uppercase tracking-[0.12em] transition-all"
                style={{
                  background: 'rgba(0,180,140,0.06)',
                  border: '1px solid rgba(0,224,160,0.2)',
                  color: '#00E0A0',
                  borderRadius: '2px',
                }}
              >
                Browse Projects
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        {/* Activity buckets */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {(['< 1mo', '< 6mo', '< 1yr', '< 2yr', '2yr+', 'no data'] as const).map(b => {
            const sample = b === '< 1mo' ? '#00FF88' : b === '< 6mo' ? '#00E0A0' : b === '< 1yr' || b === '< 2yr' ? '#E8A838' : b === '2yr+' ? '#FF4455' : '#5A8A7A'
            return (
              <div key={b} className="p-3" style={{
                background: 'rgba(0,180,140,0.04)',
                border: '1px solid rgba(0,224,160,0.1)',
                borderRadius: '2px',
              }}>
                <div className="font-mono text-2xl font-medium" style={{ color: sample, textShadow: `0 0 10px ${sample}50` }}>
                  {buckets[b]}
                </div>
                <div className="text-[9px] uppercase tracking-[0.15em] mt-0.5" style={{ color: '#5A8A7A' }}>
                  {b}
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-[10px] font-mono uppercase tracking-[0.15em] mb-6" style={{ color: '#5A8A7A' }}>
          {withGit.length} repositories tracked ·{' '}
          {Object.entries(hostCounts).map(([h, c]) => `${c} ${h}`).join(' · ')}
        </div>

        {/* Repo list */}
        <div className="space-y-1.5">
          {sorted.map(p => {
            const status = STATUS_META[p.status] || STATUS_META.unknown
            const age = commitAgeBucket(p.lastGithubCommit)
            const repo = parseHostRepo(p.github!)
            return (
              <div
                key={p.slug}
                className="grid items-center gap-3 px-3 py-2 transition-all hover:bg-[rgba(0,180,140,0.06)]"
                style={{
                  gridTemplateColumns: '1.4fr 2.2fr 0.8fr 0.6fr auto',
                  background: 'rgba(0,180,140,0.03)',
                  border: '1px solid rgba(0,224,160,0.1)',
                  borderRadius: '2px',
                }}
              >
                <Link href={`/projects/${p.slug}`} className="text-[12px] font-medium text-[#E8ECF0] hover:text-[#00FF88] truncate">
                  {p.name}
                </Link>
                <a href={p.github!} target="_blank" rel="noopener noreferrer" className="text-[11px] font-mono text-[#90A8A8] hover:text-[#00E0A0] truncate">
                  {repo ? `${repo.owner}/${repo.repo}` : p.github}
                  <span className="ml-2 text-[9px]" style={{ color: '#3A6A5A' }}>{repo?.host || ''}</span>
                </a>
                <span className="font-mono text-[10px]" style={{ color: age.color }}>
                  {age.days !== null ? `${age.days}d ago` : 'no data'}
                </span>
                <span
                  className="text-[9px] font-mono uppercase px-1.5 py-px tracking-wider text-center"
                  style={{
                    color: age.color,
                    border: `1px solid ${age.color}40`,
                    borderRadius: '1px',
                    background: `${age.color}10`,
                  }}
                >
                  {age.bucket}
                </span>
                <span
                  className="text-[9px] font-mono uppercase px-1.5 py-px tracking-wider"
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
            )
          })}
        </div>
      </main>
    </div>
  )
}
