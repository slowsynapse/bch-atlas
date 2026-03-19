import { getStats } from '@/lib/data/campaigns'
import Link from 'next/link'

export default function HomePage() {
  const stats = getStats()

  return (
    <div className="min-h-screen ds-fade-in">
      <div className="container mx-auto px-4 py-20">
        {/* Hero */}
        <div className="text-center mb-20">
          <h1
            className="text-5xl md:text-7xl font-light tracking-[0.2em] uppercase mb-4"
            style={{ color: 'var(--ds-cyan)', textShadow: '0 0 40px rgba(0, 212, 255, 0.3)' }}
          >
            BCH ATLAS
          </h1>
          <p className="ds-label text-sm tracking-[0.15em] mb-6">
            Archive & Tracking Ledger for Assurance Schemes
          </p>
          <p className="text-ds-text-secondary max-w-xl mx-auto text-sm font-light leading-relaxed">
            Preserving Bitcoin Cash crowdfunding history. Revealing ecosystem relationships through interactive graph visualization.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16 max-w-4xl mx-auto">
          <div className="ds-panel ds-glow p-6 text-center">
            <div className="font-mono text-3xl md:text-4xl font-medium mb-1 text-ds-cyan">
              {stats.totalCampaigns}
            </div>
            <div className="ds-label">Campaigns</div>
            <div className="text-xs text-ds-text-secondary mt-1 font-mono">
              {stats.platformBreakdown.flipstarter} Flipstarter
            </div>
          </div>

          <div className="ds-panel ds-glow p-6 text-center">
            <div className="font-mono text-3xl md:text-4xl font-medium mb-1 text-ds-green">
              {stats.totalBCH.toFixed(0)}
            </div>
            <div className="ds-label">BCH Raised</div>
            <div className="text-xs text-ds-text-secondary mt-1 font-mono">
              avg {stats.avgCampaignSize.toFixed(1)}
            </div>
          </div>

          <div className="ds-panel ds-glow p-6 text-center">
            <div className="font-mono text-3xl md:text-4xl font-medium mb-1 text-ds-cyan">
              {(stats.successRate * 100).toFixed(0)}%
            </div>
            <div className="ds-label">Success Rate</div>
            <div className="text-xs text-ds-text-secondary mt-1 font-mono">
              {Math.round(stats.totalCampaigns * stats.successRate)} funded
            </div>
          </div>

          <div className="ds-panel ds-glow p-6 text-center">
            <div className="font-mono text-3xl md:text-4xl font-medium mb-1 text-ds-amber">
              {stats.totalEntities}
            </div>
            <div className="ds-label">Entities</div>
            <div className="text-xs text-ds-text-secondary mt-1 font-mono">
              teams & creators
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
          <Link
            href="/graph"
            className="px-8 py-3 border border-ds-cyan text-ds-cyan text-center font-light tracking-[0.1em] uppercase text-sm transition-all duration-300 hover:shadow-[0_0_25px_rgba(0,212,255,0.25),inset_0_0_25px_rgba(0,212,255,0.05)] hover:bg-ds-cyan/8"
          >
            Explore Graph
          </Link>

          <Link
            href="/campaigns"
            className="px-8 py-3 border border-ds-cyan/20 text-ds-text-secondary text-center font-light tracking-[0.1em] uppercase text-sm transition-all duration-300 hover:border-ds-cyan/40 hover:text-ds-text"
          >
            Browse Campaigns
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-ds-text-secondary text-xs font-light tracking-wide">
          <p className="font-mono">{stats.totalCampaigns} campaigns archived</p>
          <p className="mt-1 opacity-50">Open source — Preserving BCH history</p>
        </div>
      </div>
    </div>
  )
}
