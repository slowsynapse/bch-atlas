'use client'

import { useState, useCallback } from 'react'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
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

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    const q = query.toLowerCase()
    const results = nodes
      .filter(n => n.data.label.toLowerCase().includes(q))
      .slice(0, 8)
      .map(n => n.data)
    setSearchResults(results)
  }, [nodes])

  const handleSearchSelect = (nodeData: any) => {
    setSelectedNode({ id: nodeData.id, ...nodeData })
    setSearchQuery('')
    setSearchResults([])
  }

  const successCount = campaigns.filter(c => c.status === 'success').length
  const expiredCount = campaigns.filter(c => c.status === 'expired').length
  const runningCount = campaigns.filter(c => c.status === 'running').length

  return (
    <div className="h-screen flex overflow-hidden">
      {/* LEFT HUD PANEL — game-UI sidebar */}
      <div
        className="w-[300px] flex-shrink-0 flex flex-col z-20 overflow-y-auto"
        style={{
          background: 'linear-gradient(180deg, rgba(0, 180, 140, 0.08) 0%, rgba(0, 160, 120, 0.04) 30%, rgba(7, 10, 13, 0.95) 100%)',
          borderRight: '1px solid rgba(0, 224, 160, 0.15)',
          boxShadow: '1px 0 30px rgba(0, 0, 0, 0.5), inset -1px 0 0 rgba(0, 224, 160, 0.08)',
        }}
      >
        {/* Title */}
        <div className="px-5 pt-5 pb-3">
          <h1
            className="text-xl font-extralight tracking-[0.3em] uppercase"
            style={{
              color: '#00E0A0',
              textShadow: '0 0 30px rgba(0, 224, 160, 0.3)',
            }}
          >
            BCH ATLAS
          </h1>
          <p className="text-[9px] uppercase tracking-[0.2em] mt-1" style={{ color: '#3A6A5A' }}>
            Archive & Tracking Ledger for Assurance Schemes
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(0,224,160,0.3), rgba(0,224,160,0.05))' }} />

        {/* Search */}
        <div className="px-5 py-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono placeholder-[#3A6A5A] outline-none transition-all"
              style={{
                background: 'rgba(0, 180, 140, 0.06)',
                border: '1px solid rgba(0, 224, 160, 0.15)',
                borderRadius: '2px',
                color: '#E8ECF0',
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(0, 224, 160, 0.4)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(0, 224, 160, 0.15)'}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3A6A5A] text-xs">⌕</span>
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div
              className="mt-1 overflow-hidden"
              style={{
                background: 'rgba(7, 14, 12, 0.95)',
                border: '1px solid rgba(0, 224, 160, 0.2)',
                borderRadius: '2px',
              }}
            >
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSearchSelect(result)}
                  className="w-full text-left px-3 py-2 text-xs transition-colors flex justify-between items-center"
                  style={{ borderBottom: '1px solid rgba(0, 224, 160, 0.06)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 224, 160, 0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span className="text-[#C0D0D0] truncate pr-2">{result.label}</span>
                  <span className="text-[10px] font-mono flex-shrink-0" style={{
                    color: result.type === 'campaign'
                      ? (result.metadata?.status === 'success' ? '#00FF88' : '#FF4455')
                      : '#E8A838'
                  }}>
                    {result.type === 'campaign' ? `${result.value} BCH` : result.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(0,224,160,0.2), rgba(0,224,160,0.02))' }} />

        {/* Stats */}
        <div className="px-5 py-3">
          <p className="text-[9px] uppercase tracking-[0.15em] mb-2" style={{ color: '#3A6A5A' }}>Network Stats</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2" style={{ background: 'rgba(0, 180, 140, 0.05)', border: '1px solid rgba(0, 224, 160, 0.08)', borderRadius: '2px' }}>
              <div className="font-mono text-base font-medium" style={{ color: '#00E0A0', textShadow: '0 0 10px rgba(0,224,160,0.3)' }}>
                {stats.totalCampaigns}
              </div>
              <div className="text-[8px] uppercase tracking-[0.15em]" style={{ color: '#3A6A5A' }}>campaigns</div>
            </div>
            <div className="p-2" style={{ background: 'rgba(0, 180, 140, 0.05)', border: '1px solid rgba(0, 224, 160, 0.08)', borderRadius: '2px' }}>
              <div className="font-mono text-base font-medium" style={{ color: '#00FF88', textShadow: '0 0 10px rgba(0,255,136,0.3)' }}>
                {stats.totalBCH.toFixed(0)}
              </div>
              <div className="text-[8px] uppercase tracking-[0.15em]" style={{ color: '#3A6A5A' }}>bch raised</div>
            </div>
            <div className="p-2" style={{ background: 'rgba(0, 180, 140, 0.05)', border: '1px solid rgba(0, 224, 160, 0.08)', borderRadius: '2px' }}>
              <div className="font-mono text-base font-medium" style={{ color: '#00E0A0', textShadow: '0 0 10px rgba(0,224,160,0.3)' }}>
                {(stats.successRate * 100).toFixed(0)}%
              </div>
              <div className="text-[8px] uppercase tracking-[0.15em]" style={{ color: '#3A6A5A' }}>funded</div>
            </div>
            <div className="p-2" style={{ background: 'rgba(0, 180, 140, 0.05)', border: '1px solid rgba(0, 224, 160, 0.08)', borderRadius: '2px' }}>
              <div className="font-mono text-base font-medium" style={{ color: '#E8A838', textShadow: '0 0 10px rgba(232,168,56,0.3)' }}>
                {stats.totalEntities}
              </div>
              <div className="text-[8px] uppercase tracking-[0.15em]" style={{ color: '#3A6A5A' }}>entities</div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(0,224,160,0.2), rgba(0,224,160,0.02))' }} />

        {/* Filters */}
        <div className="px-5 py-3">
          <p className="text-[9px] uppercase tracking-[0.15em] mb-2" style={{ color: '#3A6A5A' }}>Filter Nodes</p>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2.5 cursor-pointer hover:bg-[rgba(0,224,160,0.04)] p-1 rounded transition-colors">
              <input type="checkbox" checked={filters.showSuccessful} onChange={() => toggleFilter('showSuccessful')} className="w-3 h-3 accent-[#00FF88]" />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#00FF88', boxShadow: '0 0 6px rgba(0,255,136,0.5)' }}></span>
              <span className="text-[#90A8A8] text-[11px] flex-1">Funded</span>
              <span className="font-mono text-[10px]" style={{ color: '#3A6A5A' }}>{successCount}</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer hover:bg-[rgba(0,224,160,0.04)] p-1 rounded transition-colors">
              <input type="checkbox" checked={filters.showFailed} onChange={() => toggleFilter('showFailed')} className="w-3 h-3 accent-[#FF4455]" />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF4455', boxShadow: '0 0 6px rgba(255,68,85,0.5)' }}></span>
              <span className="text-[#90A8A8] text-[11px] flex-1">Expired</span>
              <span className="font-mono text-[10px]" style={{ color: '#3A6A5A' }}>{expiredCount}</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer hover:bg-[rgba(0,224,160,0.04)] p-1 rounded transition-colors">
              <input type="checkbox" checked={filters.showRunning} onChange={() => toggleFilter('showRunning')} className="w-3 h-3 accent-[#00E0A0]" />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#00E0A0', boxShadow: '0 0 6px rgba(0,224,160,0.5)' }}></span>
              <span className="text-[#90A8A8] text-[11px] flex-1">Active</span>
              <span className="font-mono text-[10px]" style={{ color: '#3A6A5A' }}>{runningCount}</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer hover:bg-[rgba(0,224,160,0.04)] p-1 rounded transition-colors">
              <input type="checkbox" checked={filters.showRecipients} onChange={() => toggleFilter('showRecipients')} className="w-3 h-3 accent-[#E8A838]" />
              <span className="w-2.5 h-2.5" style={{ background: '#E8A838', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></span>
              <span className="text-[#90A8A8] text-[11px] flex-1">Recipients</span>
              <span className="font-mono text-[10px]" style={{ color: '#3A6A5A' }}>138</span>
            </label>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(0,224,160,0.2), rgba(0,224,160,0.02))' }} />

        {/* Nav */}
        <div className="px-5 py-3">
          <Link
            href="/campaigns"
            className="block w-full px-3 py-2 text-center text-[11px] font-mono uppercase tracking-[0.12em] transition-all"
            style={{
              background: 'rgba(0, 180, 140, 0.06)',
              border: '1px solid rgba(0, 224, 160, 0.2)',
              color: '#00E0A0',
              borderRadius: '2px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 180, 140, 0.12)'
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 224, 160, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 180, 140, 0.06)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Browse All Campaigns
          </Link>
        </div>

        {/* Controls — pushed to bottom */}
        <div className="mt-auto px-5 py-3 border-t" style={{ borderColor: 'rgba(0, 224, 160, 0.08)' }}>
          <p className="text-[9px] uppercase tracking-[0.15em] mb-1.5" style={{ color: '#3A6A5A' }}>Controls</p>
          <div className="text-[10px]" style={{ color: '#4A6A5A' }}>
            <span style={{ color: '#00A878' }}>Scroll</span> zoom · <span style={{ color: '#00A878' }}>Drag</span> pan · <span style={{ color: '#00A878' }}>Click</span> select · <span style={{ color: '#00A878' }}>Dbl-click</span> focus
          </div>
          <p className="text-[9px] mt-2" style={{ color: '#2A4A3A' }}>
            Node size = BCH amount<br/>
            ◇ Diamonds = shared recipient addresses
          </p>
        </div>
      </div>

      {/* MAIN GRAPH AREA */}
      <div className="flex-1 relative">
        <GraphVisualization
          nodes={nodes}
          edges={edges}
          onNodeClick={handleNodeClick}
          filters={filters}
        />

        {/* Detail Sidebar — right side, appears on click */}
        {selectedNode && (
          <aside
            className="absolute top-0 right-0 bottom-0 w-80 z-20 overflow-y-auto ds-slide-in"
            style={{
              background: 'linear-gradient(180deg, rgba(0, 180, 140, 0.08) 0%, rgba(7, 10, 13, 0.95) 100%)',
              borderLeft: '1px solid rgba(0, 224, 160, 0.15)',
              boxShadow: '-1px 0 30px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-sm font-medium text-[#E8ECF0] pr-2 leading-tight">{selectedNode.label}</h2>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-[#5A8A7A] hover:text-[#00E0A0] transition-colors text-lg leading-none flex-shrink-0 w-6 h-6 flex items-center justify-center"
                  style={{ border: '1px solid rgba(0, 224, 160, 0.15)', borderRadius: '2px' }}
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="ds-label">Type</span>
                  <p className="text-[#E8ECF0] text-sm capitalize mt-0.5 font-mono">{selectedNode.type}</p>
                </div>

                {selectedNode.type === 'campaign' && (
                  <>
                    <div>
                      <span className="ds-label">Status</span>
                      <p className={`text-sm capitalize mt-0.5 font-mono ${
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
                    <div>
                      <span className="ds-label">Platform</span>
                      <p className="text-[#E8ECF0] text-sm capitalize mt-0.5 font-mono">{selectedNode.metadata.platform}</p>
                    </div>
                    {selectedNode.metadata.time && (
                      <div>
                        <span className="ds-label">Date</span>
                        <p className="text-[#E8ECF0] text-sm font-mono mt-0.5">{formatDate(selectedNode.metadata.time)}</p>
                        <p className="text-[#00A878] text-xs font-mono">{getTimeSinceDate(selectedNode.metadata.time)}</p>
                      </div>
                    )}
                    <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(0,224,160,0.15), transparent)' }} />
                    <Link
                      href={`/campaigns/${selectedNode.id}`}
                      className="block w-full px-4 py-2 text-center text-[11px] font-mono uppercase tracking-[0.1em] transition-all"
                      style={{
                        background: 'rgba(0, 180, 140, 0.06)',
                        border: '1px solid rgba(0, 224, 160, 0.25)',
                        color: '#00E0A0',
                        borderRadius: '2px',
                      }}
                    >
                      View Full Details →
                    </Link>
                  </>
                )}

                {selectedNode.type === 'recipient' && (
                  <>
                    <div>
                      <span className="ds-label">Address</span>
                      <p className="font-mono text-[10px] text-[#8AACA8] break-all mt-1 p-2" style={{ background: 'rgba(0,20,15,0.5)', border: '1px solid rgba(0,224,160,0.08)', borderRadius: '2px' }}>{selectedNode.metadata.fullAddress}</p>
                    </div>
                    <div>
                      <span className="ds-label">Campaigns Connected</span>
                      <p className="font-mono text-2xl mt-0.5" style={{ color: '#E8A838', textShadow: '0 0 15px rgba(232,168,56,0.3)' }}>{selectedNode.metadata.campaigns}</p>
                    </div>
                    <div>
                      <span className="ds-label">Total Received</span>
                      <p className="font-mono text-2xl mt-0.5" style={{ color: '#00FF88' }}>{selectedNode.metadata.totalBCH.toFixed(2)} <span className="text-sm text-[#5A8A7A]">BCH</span></p>
                    </div>
                    <div>
                      <span className="ds-label">Success Rate</span>
                      <p className="font-mono text-lg text-[#E8ECF0] mt-0.5">{(selectedNode.metadata.successRate * 100).toFixed(0)}%</p>
                      <p className="text-[10px] text-[#5A8A7A] font-mono">{selectedNode.metadata.successfulCampaigns} of {selectedNode.metadata.campaigns} funded</p>
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
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
