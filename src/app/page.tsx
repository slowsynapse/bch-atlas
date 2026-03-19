'use client'

import { useState } from 'react'
import { GraphVisualization, type NodeFilters } from '@/components/graph/GraphVisualization'
import { getCampaigns, getEntities, getStats } from '@/lib/data/campaigns'
import { buildGraph } from '@/lib/graph/builder'
import Link from 'next/link'

function getTimeSinceDate(dateString?: string, timestamp?: number): string {
  if (!dateString && !timestamp) return 'Unknown'
  const date = timestamp ? new Date(timestamp * 1000) : new Date(dateString!)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)
  if (diffYears > 0) return `${diffYears}y ago`
  if (diffMonths > 0) return `${diffMonths}mo ago`
  return `${diffDays}d ago`
}

function formatDate(dateString?: string, timestamp?: number): string {
  if (!dateString && !timestamp) return 'Unknown'
  const date = timestamp ? new Date(timestamp * 1000) : new Date(dateString!)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AtlasPage() {
  const campaigns = getCampaigns()
  const entities = getEntities()
  const stats = getStats()
  const { nodes, edges } = buildGraph(campaigns, entities)

  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [filters, setFilters] = useState<NodeFilters>({
    showSuccessful: true,
    showFailed: true,
    showRunning: true,
    showRecipients: true
  })

  const toggleFilter = (key: keyof NodeFilters) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleNodeClick = (nodeId: string, nodeData: any) => {
    setSelectedNode({ id: nodeId, ...nodeData })
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Full-screen graph as the atlas */}
      <div className="flex-1 relative">
        <GraphVisualization
          nodes={nodes}
          edges={edges}
          onNodeClick={handleNodeClick}
          filters={filters}
        />

        {/* Title + Stats overlay — top center */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none">
          <h1
            className="text-2xl md:text-3xl font-extralight tracking-[0.3em] uppercase mb-2"
            style={{
              color: '#00E0A0',
              textShadow: '0 0 40px rgba(0, 224, 160, 0.3), 0 0 80px rgba(0, 224, 160, 0.1)',
            }}
          >
            BCH ATLAS
          </h1>
          <div className="flex gap-6 justify-center text-center">
            <div>
              <div className="font-mono text-lg font-medium" style={{ color: '#00E0A0', textShadow: '0 0 15px rgba(0, 224, 160, 0.4)' }}>
                {stats.totalCampaigns}
              </div>
              <div className="text-[9px] uppercase tracking-[0.15em] text-[#5A8A7A]">campaigns</div>
            </div>
            <div>
              <div className="font-mono text-lg font-medium" style={{ color: '#00FF88', textShadow: '0 0 15px rgba(0, 255, 136, 0.3)' }}>
                {stats.totalBCH.toFixed(0)}
              </div>
              <div className="text-[9px] uppercase tracking-[0.15em] text-[#5A8A7A]">bch raised</div>
            </div>
            <div>
              <div className="font-mono text-lg font-medium" style={{ color: '#00E0A0', textShadow: '0 0 15px rgba(0, 224, 160, 0.4)' }}>
                {(stats.successRate * 100).toFixed(0)}%
              </div>
              <div className="text-[9px] uppercase tracking-[0.15em] text-[#5A8A7A]">funded</div>
            </div>
            <div>
              <div className="font-mono text-lg font-medium" style={{ color: '#E8A838', textShadow: '0 0 15px rgba(232, 168, 56, 0.3)' }}>
                {stats.totalEntities}
              </div>
              <div className="text-[9px] uppercase tracking-[0.15em] text-[#5A8A7A]">entities</div>
            </div>
          </div>
        </div>

        {/* Controls — bottom left */}
        <div className="absolute bottom-4 left-4 z-10 ds-holographic p-3 max-w-[200px] ds-fade-in">
          <div className="space-y-1.5 text-sm mb-3">
            <label className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-0.5 rounded transition-colors">
              <input type="checkbox" checked={filters.showSuccessful} onChange={() => toggleFilter('showSuccessful')} className="w-3 h-3 accent-[#00FF88]" />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#00FF88', boxShadow: '0 0 6px rgba(0,255,136,0.5)' }}></span>
              <span className="text-[#8A9AAB] text-[11px]">Funded</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-0.5 rounded transition-colors">
              <input type="checkbox" checked={filters.showFailed} onChange={() => toggleFilter('showFailed')} className="w-3 h-3 accent-[#FF4455]" />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF4455', boxShadow: '0 0 6px rgba(255,68,85,0.5)' }}></span>
              <span className="text-[#8A9AAB] text-[11px]">Expired</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-0.5 rounded transition-colors">
              <input type="checkbox" checked={filters.showRunning} onChange={() => toggleFilter('showRunning')} className="w-3 h-3 accent-[#00E0A0]" />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#00E0A0', boxShadow: '0 0 6px rgba(0,224,160,0.5)' }}></span>
              <span className="text-[#8A9AAB] text-[11px]">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-0.5 rounded transition-colors">
              <input type="checkbox" checked={filters.showRecipients} onChange={() => toggleFilter('showRecipients')} className="w-3 h-3 accent-[#E8A838]" />
              <span className="w-2.5 h-2.5" style={{ background: '#E8A838', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></span>
              <span className="text-[#8A9AAB] text-[11px]">Recipients</span>
            </label>
          </div>

          <div className="border-t border-[rgba(0,224,160,0.1)] pt-2 text-[10px] text-[#5A7A6A]">
            <span className="text-[#00A878]">Scroll</span> zoom · <span className="text-[#00A878]">Click</span> select · <span className="text-[#00A878]">Dbl-click</span> focus
          </div>
        </div>

        {/* Browse campaigns button — bottom right */}
        <div className="absolute bottom-4 right-4 z-10 pointer-events-auto">
          <Link
            href="/campaigns"
            className="px-5 py-2 text-center font-light tracking-[0.1em] uppercase text-xs transition-all duration-300 ds-holographic hover:border-[rgba(0,224,160,0.4)]"
            style={{ color: '#00E0A0' }}
          >
            Browse Campaigns
          </Link>
        </div>

        {/* Detail Sidebar — right side */}
        {selectedNode && (
          <aside className="absolute top-0 right-0 bottom-0 w-80 z-20 ds-holographic border-0 border-l border-[rgba(0,224,160,0.12)] p-6 overflow-y-auto ds-slide-in">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-sm font-medium text-[#E8ECF0] pr-2 leading-tight">{selectedNode.label}</h2>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[#7A9090] hover:text-[#00E0A0] transition-colors text-lg leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="ds-label">Type</span>
                <p className="text-[#E8ECF0] text-sm capitalize mt-0.5">{selectedNode.type}</p>
              </div>

              {selectedNode.type === 'campaign' && (
                <>
                  <div>
                    <span className="ds-label">Platform</span>
                    <p className="text-[#E8ECF0] text-sm capitalize mt-0.5">{selectedNode.metadata.platform}</p>
                  </div>
                  <div>
                    <span className="ds-label">Status</span>
                    <p className={`text-sm capitalize mt-0.5 ${
                      selectedNode.metadata.status === 'success' ? 'text-ds-green' :
                      selectedNode.metadata.status === 'expired' ? 'text-ds-red' :
                      'text-ds-cyan'
                    }`}>{selectedNode.metadata.status === 'success' ? 'funded' : selectedNode.metadata.status === 'expired' ? 'expired' : 'active'}</p>
                  </div>
                  <div>
                    <span className="ds-label">Amount</span>
                    <p className="font-mono text-2xl mt-0.5" style={{ color: '#00FF88', textShadow: '0 0 15px rgba(0,255,136,0.3)' }}>
                      {selectedNode.value} <span className="text-sm text-[#5A8A7A]">BCH</span>
                    </p>
                  </div>
                  {selectedNode.metadata.time && (
                    <div>
                      <span className="ds-label">Date</span>
                      <p className="text-[#E8ECF0] text-sm font-mono mt-0.5">{formatDate(selectedNode.metadata.time)}</p>
                      <p className="text-[#00A878] text-xs font-mono">{getTimeSinceDate(selectedNode.metadata.time)}</p>
                    </div>
                  )}
                  {selectedNode.metadata.transactionTimestamp && (
                    <div>
                      <span className="ds-label">Funded</span>
                      <p className="text-[#E8ECF0] text-sm font-mono mt-0.5">{formatDate(undefined, selectedNode.metadata.transactionTimestamp)}</p>
                      <p className="text-[#00A878] text-xs font-mono">{getTimeSinceDate(undefined, selectedNode.metadata.transactionTimestamp)}</p>
                    </div>
                  )}
                  <Link
                    href={`/campaigns/${selectedNode.id}`}
                    className="block w-full px-4 py-2 border text-center text-xs tracking-[0.08em] uppercase transition-all"
                    style={{ borderColor: 'rgba(0, 224, 160, 0.3)', color: '#00E0A0' }}
                  >
                    View Details
                  </Link>
                </>
              )}

              {selectedNode.type === 'recipient' && (
                <>
                  <div>
                    <span className="ds-label">Address</span>
                    <p className="font-mono text-xs text-[#8A9AAB] break-all mt-1 p-2 bg-[rgba(0,20,15,0.5)] border border-[rgba(0,224,160,0.08)] rounded">{selectedNode.metadata.fullAddress}</p>
                  </div>
                  <div>
                    <span className="ds-label">Campaigns</span>
                    <p className="font-mono text-2xl mt-0.5" style={{ color: '#E8A838', textShadow: '0 0 15px rgba(232,168,56,0.3)' }}>{selectedNode.metadata.campaigns}</p>
                  </div>
                  <div>
                    <span className="ds-label">Total Received</span>
                    <p className="font-mono text-2xl mt-0.5" style={{ color: '#00FF88' }}>{selectedNode.metadata.totalBCH.toFixed(2)} <span className="text-sm text-[#5A8A7A]">BCH</span></p>
                  </div>
                  <div>
                    <span className="ds-label">Success Rate</span>
                    <p className="font-mono text-lg text-[#E8ECF0] mt-0.5">{(selectedNode.metadata.successRate * 100).toFixed(0)}%</p>
                    <p className="text-xs text-[#5A8A7A] font-mono">{selectedNode.metadata.successfulCampaigns}/{selectedNode.metadata.campaigns}</p>
                  </div>
                </>
              )}

              {selectedNode.type === 'entity' && (
                <>
                  <div>
                    <span className="ds-label">Campaigns</span>
                    <p className="font-mono text-2xl mt-0.5" style={{ color: '#00E0A0' }}>{selectedNode.metadata.campaigns}</p>
                  </div>
                  <div>
                    <span className="ds-label">Total Raised</span>
                    <p className="font-mono text-2xl mt-0.5" style={{ color: '#00FF88' }}>{selectedNode.metadata.totalBCH.toFixed(2)} <span className="text-sm text-[#5A8A7A]">BCH</span></p>
                  </div>
                  <div>
                    <span className="ds-label">Success Rate</span>
                    <p className="font-mono text-lg text-[#E8ECF0] mt-0.5">{(selectedNode.metadata.successRate * 100).toFixed(0)}%</p>
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
