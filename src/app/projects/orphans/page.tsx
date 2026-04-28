import Link from 'next/link'
import { getCampaigns } from '@/lib/data/campaigns'
import { getResolvedProjects } from '@/lib/data/project-resolver'

/**
 * Triage page for campaigns whose project linkage looks suspect.
 *
 * Two cohorts:
 *   - "Orphan funded" — funded campaigns with no project linked. Either the
 *     project is missing from the registry, or the matchers don't catch it.
 *   - "Lone success" — campaigns currently rendering as green planets that
 *     are likely linked to a dead/dormant project but the linkage failed.
 *
 * Use this page to spot candidates for data/campaign-overrides.json entries.
 */

function formatDate(s: string | undefined | null): string {
  if (!s) return '—'
  return s.split('T')[0]
}

export default function OrphanTriagePage() {
  const campaigns = getCampaigns()
  const projects = getResolvedProjects(campaigns)
  const linkedIds = new Set<string>()
  for (const p of projects) for (const id of p.campaigns) linkedIds.add(id)

  // Orphan funded campaigns — funded but unlinked. Includes campaigns marked
  // `delivered: 'no'` since they have no project linkage; show them with a
  // badge so they're not re-curated. Excludes campaigns with `projectSlug`
  // overrides (those are linked via the resolver and aren't orphans).
  const orphanFunded = campaigns
    .filter(c => c.status === 'success' && !linkedIds.has(c.id))
    .sort((a, b) => b.amount - a.amount)

  const orphanUncurated = orphanFunded.filter(c => c.delivered == null)
  const orphanCurated = orphanFunded.filter(c => c.delivered != null)

  // Top funded uncurated orphans: most likely to need a registry entry
  const topOrphans = orphanUncurated.slice(0, 50)

  // All overrides (linked + delivered) — already-curated set, shown at bottom
  const overridden = campaigns.filter(c => c.delivered != null || c.overrideProjectSlug != null)

  // Per-platform breakdown
  const byPlatform = {
    flipstarter: orphanFunded.filter(c => c.platform === 'flipstarter').length,
    fundme: orphanFunded.filter(c => c.platform === 'fundme').length,
  }
  const totalBchOrphan = orphanUncurated.reduce((s, c) => s + c.amount, 0)

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
                Triage — Orphan Campaigns & Override Suggestions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/projects" className="px-3 py-2 text-[11px] font-mono uppercase tracking-[0.12em]" style={{ background: 'rgba(0,180,140,0.06)', border: '1px solid rgba(0,224,160,0.2)', color: '#00E0A0', borderRadius: '2px' }}>
                Browse Projects
              </Link>
              <Link href="/" className="px-3 py-2 text-[11px] font-mono uppercase tracking-[0.12em]" style={{ background: 'rgba(0,180,140,0.06)', border: '1px solid rgba(0,224,160,0.2)', color: '#00E0A0', borderRadius: '2px' }}>
                Atlas
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatTile label="uncurated" value={orphanUncurated.length} color="#FF8C00" />
          <StatTile label="curated (delivered:no)" value={orphanCurated.length} color="#FF4455" />
          <StatTile label="overrides total" value={overridden.length} color="#00E0A0" />
          <StatTile label="uncurated bch" value={Math.round(totalBchOrphan)} color="#00FF88" />
        </div>

        <div className="text-[10px] font-mono uppercase tracking-[0.15em] mb-6" style={{ color: '#5A8A7A' }}>
          {orphanUncurated.length} uncurated funded campaigns ({totalBchOrphan.toFixed(0)} BCH) need attention.
          {orphanCurated.length > 0 && ` ${orphanCurated.length} already flagged delivered:no (hidden from this list).`}
          {' '}Showing top {topOrphans.length} by amount.
        </div>

        <p className="text-[11px] mb-4" style={{ color: '#90A8A8' }}>
          To link a campaign to a project, add an entry to <code className="font-mono text-[10px]" style={{ color: '#00E0A0' }}>data/campaign-overrides.json</code> using the campaign ID below:
        </p>
        <pre className="text-[10px] font-mono p-3 mb-6 overflow-x-auto" style={{ background: 'rgba(0,20,15,0.5)', border: '1px solid rgba(0,224,160,0.12)', color: '#90A8A8', borderRadius: '2px' }}>
{`"overrides": {
  "<campaign-id>": { "projectSlug": "<slug>", "note": "why" },
  "<campaign-id>": { "delivered": "no", "note": "took the BCH, never shipped" }
}`}
        </pre>

        <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[#00E0A0] mb-3" style={{ textShadow: '0 0 10px rgba(0,224,160,0.3)' }}>
          Top Orphan Campaigns ({topOrphans.length})
        </h2>
        <div className="space-y-1.5 mb-8">
          {topOrphans.map(c => (
            <div
              key={c.id}
              className="grid items-center gap-3 px-3 py-2"
              style={{
                gridTemplateColumns: '8rem 2fr 1fr 5rem 5rem auto',
                background: 'rgba(0,180,140,0.03)',
                border: '1px solid rgba(0,224,160,0.1)',
                borderRadius: '2px',
              }}
            >
              <code className="text-[10px] font-mono" style={{ color: '#00E0A0' }}>{c.id}</code>
              <Link href={`/campaigns/${c.id}`} className="text-[12px] text-[#E8ECF0] hover:text-[#00FF88] truncate">
                {c.title}
              </Link>
              <span className="text-[10px] font-mono truncate" style={{ color: '#5A8A7A' }}>
                {(c.entities || []).join(', ') || '(no entities extracted)'}
              </span>
              <span className="text-[10px] font-mono" style={{ color: '#90A8A8' }}>{formatDate(c.time)}</span>
              <span className="text-[10px] font-mono uppercase" style={{ color: '#3A6A5A' }}>{c.platform}</span>
              <span className="font-mono text-[11px]" style={{ color: '#00FF88' }}>{c.amount.toFixed(1)} BCH</span>
            </div>
          ))}
        </div>

        {overridden.length > 0 && (
          <>
            <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-[#00E0A0] mb-3" style={{ textShadow: '0 0 10px rgba(0,224,160,0.3)' }}>
              Active Overrides ({overridden.length})
            </h2>
            <div className="text-[10px] font-mono uppercase tracking-[0.15em] mb-3" style={{ color: '#5A8A7A' }}>
              Already-curated campaigns from data/campaign-overrides.json. Skip these when triaging.
            </div>
            <div className="space-y-1.5">
              {overridden.map(c => {
                const isFailed = c.delivered === 'no'
                const accentColor = isFailed ? '#FF4455' : '#00FF88'
                const tag = isFailed ? 'NOT DELIVERED' : `→ ${c.overrideProjectSlug}`
                return (
                  <div key={c.id} className="grid items-center gap-3 px-3 py-2" style={{
                    gridTemplateColumns: '8rem 2fr 9rem 5rem 5rem 1fr',
                    background: isFailed ? 'rgba(255,68,85,0.04)' : 'rgba(0,255,136,0.04)',
                    border: `1px solid ${isFailed ? 'rgba(255,68,85,0.25)' : 'rgba(0,255,136,0.2)'}`,
                    borderRadius: '2px',
                  }}>
                    <code className="text-[10px] font-mono" style={{ color: '#00E0A0' }}>{c.id}</code>
                    <Link href={`/campaigns/${c.id}`} className="text-[12px] text-[#E8ECF0] hover:text-[#00FF88] truncate">
                      {c.title}
                    </Link>
                    <span className="text-[10px] font-mono uppercase tracking-[0.1em]" style={{ color: accentColor }}>
                      {tag}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: '#90A8A8' }}>{formatDate(c.time)}</span>
                    <span className="font-mono text-[11px]" style={{ color: accentColor }}>{c.amount.toFixed(1)} BCH</span>
                    <span className="text-[10px] truncate" style={{ color: '#90A8A8' }}>{c.overrideNote || ''}</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
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
