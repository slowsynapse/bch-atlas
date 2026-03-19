import { getStats } from '@/lib/data/campaigns'
import Link from 'next/link'

export default function HomePage() {
  const stats = getStats()

  return (
    <div className="min-h-screen ds-fade-in relative">
      <div className="container mx-auto px-4 py-20 relative z-[1]">
        {/* Hero */}
        <div className="text-center mb-20">
          <h1
            className="text-5xl md:text-7xl font-extralight tracking-[0.25em] uppercase mb-4"
            style={{
              color: '#00E0A0',
              textShadow: '0 0 60px rgba(0, 224, 160, 0.25), 0 0 120px rgba(0, 224, 160, 0.1)',
            }}
          >
            BCH ATLAS
          </h1>
          <p className="ds-label text-sm tracking-[0.2em] mb-6" style={{ color: '#5A8A7A' }}>
            Archive & Tracking Ledger for Assurance Schemes
          </p>
          <p className="text-[#7A9090] max-w-xl mx-auto text-sm font-light leading-relaxed">
            Preserving Bitcoin Cash crowdfunding history. Revealing ecosystem connections.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16 max-w-4xl mx-auto">
          <div className="ds-holographic ds-glow p-6 text-center">
            <div
              className="font-mono text-3xl md:text-4xl font-medium mb-1"
              style={{ color: '#00E0A0', textShadow: '0 0 25px rgba(0, 224, 160, 0.35)' }}
            >
              {stats.totalCampaigns}
            </div>
            <div className="ds-label">Campaigns</div>
            <div className="text-xs text-[#5A7A6A] mt-1 font-mono">
              {stats.platformBreakdown.flipstarter} flipstarter
            </div>
          </div>

          <div className="ds-holographic ds-glow p-6 text-center">
            <div
              className="font-mono text-3xl md:text-4xl font-medium mb-1"
              style={{ color: '#00FF88', textShadow: '0 0 25px rgba(0, 255, 136, 0.3)' }}
            >
              {stats.totalBCH.toFixed(0)}
            </div>
            <div className="ds-label">BCH Raised</div>
            <div className="text-xs text-[#5A7A6A] mt-1 font-mono">
              avg {stats.avgCampaignSize.toFixed(1)}
            </div>
          </div>

          <div className="ds-holographic ds-glow p-6 text-center">
            <div
              className="font-mono text-3xl md:text-4xl font-medium mb-1"
              style={{ color: '#00E0A0', textShadow: '0 0 25px rgba(0, 224, 160, 0.35)' }}
            >
              {(stats.successRate * 100).toFixed(0)}%
            </div>
            <div className="ds-label">Funded</div>
            <div className="text-xs text-[#5A7A6A] mt-1 font-mono">
              {Math.round(stats.totalCampaigns * stats.successRate)} of {stats.totalCampaigns}
            </div>
          </div>

          <div className="ds-holographic ds-glow p-6 text-center">
            <div
              className="font-mono text-3xl md:text-4xl font-medium mb-1"
              style={{ color: '#E8A838', textShadow: '0 0 25px rgba(232, 168, 56, 0.3)' }}
            >
              {stats.totalEntities}
            </div>
            <div className="ds-label">Entities</div>
            <div className="text-xs text-[#5A7A6A] mt-1 font-mono">
              teams & creators
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
          <Link
            href="/graph"
            className="px-8 py-3 text-center font-light tracking-[0.12em] uppercase text-sm transition-all duration-300"
            style={{
              border: '1px solid rgba(0, 224, 160, 0.4)',
              color: '#00E0A0',
              boxShadow: '0 0 15px rgba(0, 224, 160, 0.06), inset 0 0 15px rgba(0, 224, 160, 0.03)',
            }}
          >
            Explore Graph
          </Link>

          <Link
            href="/campaigns"
            className="px-8 py-3 text-center font-light tracking-[0.12em] uppercase text-sm transition-all duration-300"
            style={{
              border: '1px solid rgba(0, 224, 160, 0.15)',
              color: '#7A9090',
            }}
          >
            Browse Campaigns
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-[#4A6A5A] text-xs font-light tracking-wider">
          <p className="font-mono">{stats.totalCampaigns} campaigns archived</p>
          <p className="mt-1 opacity-60">preserving bch history</p>
        </div>
      </div>
    </div>
  )
}
