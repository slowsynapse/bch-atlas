'use client'

import { useState } from 'react'
import { GraphVisualization, type NodeFilters } from '@/components/graph/GraphVisualization'
import { getCampaigns, getEntities } from '@/lib/data/campaigns'
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

export default function GraphPage() {
  const campaigns = getCampaigns()
  const entities = getEntities()
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
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="ds-holographic border-0 border-b border-[rgba(78,205,196,0.08)] px-4 py-3 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <Link href="/" className="text-lg font-light tracking-[0.15em] uppercase text-ds-cyan hover:opacity-80 transition-opacity">
              BCH ATLAS
            </Link>
            <p className="ds-label mt-0.5">Graph Explorer</p>
          </div>
          <div className="flex gap-3">
            <Link href="/campaigns" className="px-4 py-1.5 border border-[rgba(78,205,196,0.12)] text-[#7A8899] text-xs tracking-[0.08em] uppercase hover:border-[rgba(78,205,196,0.25)] hover:text-[#E0E4E8] transition-all">
              Campaigns
            </Link>
            <Link href="/" className="px-4 py-1.5 border border-[rgba(78,205,196,0.12)] text-[#7A8899] text-xs tracking-[0.08em] uppercase hover:border-[rgba(78,205,196,0.25)] hover:text-[#E0E4E8] transition-all">
              Home
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex relative">
        <main className="flex-1 relative">
          <GraphVisualization
            nodes={nodes}
            edges={edges}
            onNodeClick={handleNodeClick}
            filters={filters}
          />

          {/* Controls */}
          <div className="absolute top-4 left-4 ds-holographic p-4 max-w-xs ds-fade-in">
            <h3 className="ds-label mb-3">Filters</h3>
            <div className="space-y-2 text-sm mb-4">
              <label className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors">
                <input type="checkbox" checked={filters.showSuccessful} onChange={() => toggleFilter('showSuccessful')} className="w-3.5 h-3.5 accent-[#56E89C]" />
                <span className="w-3 h-3 rounded-full" style={{ background: '#56E89C', boxShadow: '0 0 6px rgba(86,232,156,0.4)' }}></span>
                <span className="text-[#8A9AAB] text-xs">Success</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors">
                <input type="checkbox" checked={filters.showFailed} onChange={() => toggleFilter('showFailed')} className="w-3.5 h-3.5 accent-[#E85454]" />
                <span className="w-3 h-3 rounded-full" style={{ background: '#E85454', boxShadow: '0 0 6px rgba(232,84,84,0.4)' }}></span>
                <span className="text-[#8A9AAB] text-xs">Failed</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors">
                <input type="checkbox" checked={filters.showRunning} onChange={() => toggleFilter('showRunning')} className="w-3.5 h-3.5 accent-[#4ECDC4]" />
                <span className="w-3 h-3 rounded-full" style={{ background: '#4ECDC4', boxShadow: '0 0 6px rgba(78,205,196,0.4)' }}></span>
                <span className="text-[#8A9AAB] text-xs">Running</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors">
                <input type="checkbox" checked={filters.showRecipients} onChange={() => toggleFilter('showRecipients')} className="w-3.5 h-3.5 accent-[#E8A838]" />
                <span className="w-3 h-3" style={{ background: '#E8A838', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', boxShadow: '0 0 6px rgba(232,168,56,0.4)' }}></span>
                <span className="text-[#8A9AAB] text-xs">Recipients</span>
              </label>
            </div>

            <div className="border-t border-[rgba(78,205,196,0.08)] pt-3 mb-3">
              <p className="ds-label mb-2">Controls</p>
              <div className="space-y-1 text-xs text-[#7A8899]">
                <div><span className="text-ds-cyan">Scroll</span> — Zoom</div>
                <div><span className="text-ds-cyan">Drag</span> — Pan</div>
                <div><span className="text-ds-cyan">Click</span> — Select</div>
                <div><span className="text-ds-cyan">Dbl-click</span> — Focus</div>
              </div>
            </div>

            <p className="text-[10px] text-[#5A6A7A] border-t border-[rgba(78,205,196,0.08)] pt-2">
              Node size = BCH amount. Diamonds = shared recipients.
            </p>
          </div>
        </main>

        {/* Detail Sidebar */}
        {selectedNode && (
          <aside className="w-80 ds-holographic border-0 border-l border-[rgba(78,205,196,0.08)] p-6 overflow-y-auto ds-slide-in">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-sm font-medium text-[#E0E4E8] pr-2 leading-tight">{selectedNode.label}</h2>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-[#7A8899] hover:text-ds-cyan transition-colors text-lg leading-none flex-shrink-0"
              >
                x
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="ds-label">Type</span>
                <p className="text-[#E0E4E8] text-sm capitalize mt-0.5">{selectedNode.type}</p>
              </div>

              {selectedNode.type === 'campaign' && (
                <>
                  <div>
                    <span className="ds-label">Platform</span>
                    <p className="text-[#E0E4E8] text-sm capitalize mt-0.5">{selectedNode.metadata.platform}</p>
                  </div>
                  <div>
                    <span className="ds-label">Status</span>
                    <p className={`text-sm capitalize mt-0.5 ${
                      selectedNode.metadata.status === 'success' ? 'text-ds-green' :
                      selectedNode.metadata.status === 'expired' ? 'text-ds-red' :
                      'text-ds-cyan'
                    }`}>{selectedNode.metadata.status}</p>
                  </div>
                  <div>
                    <span className="ds-label">Amount</span>
                    <p className="font-mono text-2xl text-ds-green mt-0.5">{selectedNode.value} <span className="text-sm text-[#7A8899]">BCH</span></p>
                  </div>
                  {selectedNode.metadata.time && (
                    <div>
                      <span className="ds-label">Date</span>
                      <p className="text-[#E0E4E8] text-sm font-mono mt-0.5">{formatDate(selectedNode.metadata.time)}</p>
                      <p className="text-ds-cyan-dim text-xs font-mono">{getTimeSinceDate(selectedNode.metadata.time)}</p>
                    </div>
                  )}
                  {selectedNode.metadata.transactionTimestamp && (
                    <div>
                      <span className="ds-label">Funded</span>
                      <p className="text-[#E0E4E8] text-sm font-mono mt-0.5">{formatDate(undefined, selectedNode.metadata.transactionTimestamp)}</p>
                      <p className="text-ds-cyan-dim text-xs font-mono">{getTimeSinceDate(undefined, selectedNode.metadata.transactionTimestamp)}</p>
                    </div>
                  )}
                  <Link
                    href={`/campaigns/${selectedNode.id}`}
                    className="block w-full px-4 py-2 border border-ds-cyan text-ds-cyan text-center text-xs tracking-[0.08em] uppercase hover:bg-[rgba(78,205,196,0.08)] hover:shadow-[0_0_20px_rgba(78,205,196,0.1)] transition-all"
                  >
                    View Details
                  </Link>
                </>
              )}

              {selectedNode.type === 'recipient' && (
                <>
                  <div>
                    <span className="ds-label">Address</span>
                    <p className="font-mono text-xs text-[#8A9AAB] break-all mt-1 p-2 bg-[rgba(11,14,17,0.5)] border border-[rgba(78,205,196,0.06)] rounded">{selectedNode.metadata.fullAddress}</p>
                  </div>
                  <div>
                    <span className="ds-label">Campaigns</span>
                    <p className="font-mono text-2xl text-ds-amber mt-0.5">{selectedNode.metadata.campaigns}</p>
                  </div>
                  <div>
                    <span className="ds-label">Total Received</span>
                    <p className="font-mono text-2xl text-ds-green mt-0.5">{selectedNode.metadata.totalBCH.toFixed(2)} <span className="text-sm text-[#7A8899]">BCH</span></p>
                  </div>
                  <div>
                    <span className="ds-label">Success Rate</span>
                    <p className="font-mono text-lg text-[#E0E4E8] mt-0.5">{(selectedNode.metadata.successRate * 100).toFixed(0)}%</p>
                    <p className="text-xs text-[#7A8899] font-mono">{selectedNode.metadata.successfulCampaigns}/{selectedNode.metadata.campaigns}</p>
                  </div>
                </>
              )}

              {selectedNode.type === 'entity' && (
                <>
                  <div>
                    <span className="ds-label">Campaigns</span>
                    <p className="font-mono text-2xl text-ds-cyan mt-0.5">{selectedNode.metadata.campaigns}</p>
                  </div>
                  <div>
                    <span className="ds-label">Total Raised</span>
                    <p className="font-mono text-2xl text-ds-green mt-0.5">{selectedNode.metadata.totalBCH.toFixed(2)} <span className="text-sm text-[#7A8899]">BCH</span></p>
                  </div>
                  <div>
                    <span className="ds-label">Success Rate</span>
                    <p className="font-mono text-lg text-[#E0E4E8] mt-0.5">{(selectedNode.metadata.successRate * 100).toFixed(0)}%</p>
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
