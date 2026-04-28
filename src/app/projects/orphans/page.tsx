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

  // Orphan funded campaigns — funded but unlinked
  const orphanFunded = campaigns
    .filter(c => c.status === 'success' && !linkedIds.has(c.id))
    .sort((a, b) => b.amount - a.amount)

  // Top funded unlinked: most likely to need a registry entry
  const topOrphans = orphanFunded.slice(0, 50)

  // Funded campaigns already explicitly overridden — already-curated set
  const overridden = campaigns.filter(c => c.delivered != null || c.overrideProjectSlug != null)

  // Per-platform breakdown
  const byPlatform = {
    flipstarter: orphanFunded.filter(c => c.platform === 'flipstarter').length,
    fundme: orphanFunded.filter(c => c.platform === 'fundme').length,
  }
  const totalBchOrphan = orphanFunded.reduce((s, c) => s + c.amount, 0)

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
          <StatTile label="orphan funded" value={orphanFunded.length} color="#00FF88" />
          <StatTile label="orphan flipstarter" value={byPlatform.flipstarter} color="#00D4FF" />
          <StatTile label="orphan fundme" value={byPlatform.fundme} color="#E8A838" />
          <StatTile label="overrides set" value={overridden.length} color="#90A8A8" />
        </div>

        <div className="text-[10px] font-mono uppercase tracking-[0.15em] mb-6" style={{ color: '#5A8A7A' }}>
          {orphanFunded.length} funded campaigns ({totalBchOrphan.toFixed(0)} BCH) are not linked to any project.
          Showing top {topOrphans.length} by amount.
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
            <div className="space-y-1.5">
              {overridden.map(c => (
                <div key={c.id} className="grid items-center gap-3 px-3 py-2" style={{ gridTemplateColumns: '8rem 2fr 1fr 1fr', background: 'rgba(0,180,140,0.03)', border: '1px solid rgba(232,168,56,0.2)', borderRadius: '2px' }}>
                  <code className="text-[10px] font-mono" style={{ color: '#00E0A0' }}>{c.id}</code>
                  <Link href={`/campaigns/${c.id}`} className="text-[12px] text-[#E8ECF0] hover:text-[#00FF88] truncate">
                    {c.title}
                  </Link>
                  <span className="text-[10px] font-mono" style={{ color: c.delivered === 'no' ? '#FF4455' : c.delivered === 'yes' ? '#00FF88' : '#90A8A8' }}>
                    {c.delivered != null ? `delivered: ${c.delivered}` : ''}
                    {c.overrideProjectSlug ? `→ ${c.overrideProjectSlug}` : ''}
                  </span>
                  <span className="text-[10px]" style={{ color: '#90A8A8' }}>{c.overrideNote || ''}</span>
                </div>
              ))}
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
