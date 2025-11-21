import { getStats } from '@/lib/data/campaigns'
import Link from 'next/link'

export default function HomePage() {
  const stats = getStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            BCH ATLAS
          </h1>
          <p className="text-2xl text-gray-700 mb-2 font-semibold">
            Archive & Tracking Ledger for Assurance Schemes
          </p>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Preserving Bitcoin Cash crowdfunding history and revealing ecosystem relationships through interactive graph visualization
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center transform hover:scale-105 transition-transform">
            <div className="text-5xl font-bold text-blue-600 mb-2">
              {stats.totalCampaigns}
            </div>
            <div className="text-gray-600 font-medium">Campaigns Archived</div>
            <div className="text-xs text-gray-400 mt-1">
              {stats.platformBreakdown.flipstarter} Flipstarter
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 text-center transform hover:scale-105 transition-transform">
            <div className="text-5xl font-bold text-green-600 mb-2">
              {stats.totalBCH.toFixed(0)}
            </div>
            <div className="text-gray-600 font-medium">BCH Raised</div>
            <div className="text-xs text-gray-400 mt-1">
              Avg: {stats.avgCampaignSize.toFixed(1)} BCH
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 text-center transform hover:scale-105 transition-transform">
            <div className="text-5xl font-bold text-purple-600 mb-2">
              {(stats.successRate * 100).toFixed(0)}%
            </div>
            <div className="text-gray-600 font-medium">Success Rate</div>
            <div className="text-xs text-gray-400 mt-1">
              {Math.round(stats.totalCampaigns * stats.successRate)} successful
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 text-center transform hover:scale-105 transition-transform">
            <div className="text-5xl font-bold text-orange-600 mb-2">
              {stats.totalEntities}
            </div>
            <div className="text-gray-600 font-medium">Entities Identified</div>
            <div className="text-xs text-gray-400 mt-1">
              Teams & creators
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
          <Link
            href="/graph"
            className="group relative px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-bold hover:bg-blue-700 transition shadow-lg hover:shadow-xl text-center"
          >
            <span className="relative z-10">🌐 Explore Interactive Graph</span>
          </Link>

          <Link
            href="/campaigns"
            className="px-8 py-4 bg-white text-blue-600 border-2 border-blue-600 rounded-lg text-lg font-bold hover:bg-blue-50 transition shadow-lg hover:shadow-xl text-center"
          >
            📚 Browse All Campaigns
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-bold mb-2">Discover Lost Campaigns</h3>
            <p className="text-gray-600">
              Recover campaigns from expired domains using Archive.org snapshots and on-chain verification.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-4xl mb-4">🕸️</div>
            <h3 className="text-xl font-bold mb-2">Visualize Relationships</h3>
            <p className="text-gray-600">
              See who runs multiple campaigns, identify ecosystem contributors, and explore funding patterns.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-bold mb-2">Research & Analysis</h3>
            <p className="text-gray-600">
              Export data, track trends over time, and gain insights into the BCH ecosystem's crowdfunding history.
            </p>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-center">Why BCH ATLAS?</h2>
          <div className="space-y-4 text-gray-700">
            <p>
              Bitcoin Cash crowdfunding campaigns hosted on Flipstarter subdomains and FundMe.cash are disappearing as domains expire,
              resulting in permanent loss of BCH ecosystem history.
            </p>
            <p>
              BCH ATLAS preserves this history and goes beyond simple archival by revealing the hidden relationships and patterns
              in the BCH ecosystem through intelligent entity matching and interactive graph visualization.
            </p>
            <p className="font-semibold text-blue-600">
              This is the first unified view of both Flipstarter and FundMe.cash campaigns, showing who runs multiple projects
              and how the ecosystem is interconnected.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>Built with Next.js, Cytoscape.js, and data from {stats.totalCampaigns} campaigns</p>
          <p className="mt-2">Open source • Community-driven • Preserving BCH history</p>
        </div>
      </div>
    </div>
  )
}
