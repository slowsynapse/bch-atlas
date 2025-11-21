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

  if (diffYears > 0) {
    return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`
  } else if (diffMonths > 0) {
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`
  } else {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  }
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
      <header className="bg-white border-b p-4 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
              BCH ATLAS
            </Link>
            <p className="text-sm text-gray-600">Ecosystem Graph Explorer</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/campaigns"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
            >
              Browse Campaigns
            </Link>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <main className="flex-1 relative">
          <GraphVisualization
            nodes={nodes}
            edges={edges}
            onNodeClick={handleNodeClick}
            filters={filters}
          />

          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
            <h3 className="font-bold mb-3">Graph Controls</h3>

            {/* Filters */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-600 mb-2">Show/Hide Nodes</p>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={filters.showSuccessful}
                    onChange={() => toggleFilter('showSuccessful')}
                    className="w-4 h-4"
                  />
                  <div className="w-6 h-6 bg-green-500 rounded-full"></div>
                  <span>Success (150)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={filters.showFailed}
                    onChange={() => toggleFilter('showFailed')}
                    className="w-4 h-4"
                  />
                  <div className="w-6 h-6 bg-red-500 rounded-full"></div>
                  <span>Failed (73)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={filters.showRunning}
                    onChange={() => toggleFilter('showRunning')}
                    className="w-4 h-4"
                  />
                  <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
                  <span>Running (2)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={filters.showRecipients}
                    onChange={() => toggleFilter('showRecipients')}
                    className="w-4 h-4"
                  />
                  <div className="w-6 h-6 bg-purple-600 rounded-full transform rotate-45"></div>
                  <span>Recipients (138)</span>
                </label>
              </div>
            </div>

            {/* Mouse Controls */}
            <div className="mb-3 border-t pt-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Mouse Controls</p>
              <div className="space-y-1 text-xs text-gray-700">
                <div>🖱️ <strong>Middle button scroll:</strong> Zoom in/out</div>
                <div>✋ <strong>Left click + drag:</strong> Pan around</div>
                <div>👆 <strong>Click node:</strong> View details</div>
                <div>🔍 <strong>Double-click:</strong> Focus on node</div>
              </div>
            </div>

            <p className="text-xs text-gray-500 italic border-t pt-2">
              Node size = BCH amount. Purple diamonds show addresses that received funds from 2+ campaigns.
            </p>
          </div>
        </main>

        {selectedNode && (
          <aside className="w-80 bg-white border-l p-6 overflow-y-auto">
            <button
              onClick={() => setSelectedNode(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-4">{selectedNode.label}</h2>

            <div className="space-y-4">
              <div>
                <span className="text-sm text-gray-600">Type:</span>
                <p className="font-medium capitalize">{selectedNode.type}</p>
              </div>

              {selectedNode.type === 'campaign' && (
                <>
                  <div>
                    <span className="text-sm text-gray-600">Platform:</span>
                    <p className="font-medium capitalize">{selectedNode.metadata.platform}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Status:</span>
                    <p className="font-medium capitalize">{selectedNode.metadata.status}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Amount:</span>
                    <p className="font-bold text-green-600 text-2xl">{selectedNode.value} BCH</p>
                  </div>
                  {selectedNode.metadata.time && (
                    <>
                      <div>
                        <span className="text-sm text-gray-600">Completion Date:</span>
                        <p className="font-medium">{formatDate(selectedNode.metadata.time)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Time Since Finished:</span>
                        <p className="font-medium text-blue-600">{getTimeSinceDate(selectedNode.metadata.time)}</p>
                      </div>
                    </>
                  )}
                  {selectedNode.metadata.transactionTimestamp && (
                    <>
                      <div>
                        <span className="text-sm text-gray-600">Funded On:</span>
                        <p className="font-medium">{formatDate(undefined, selectedNode.metadata.transactionTimestamp)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Time Since Funded:</span>
                        <p className="font-medium text-blue-600">{getTimeSinceDate(undefined, selectedNode.metadata.transactionTimestamp)}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <Link
                      href={`/campaigns/${selectedNode.id}`}
                      className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center font-medium"
                    >
                      View Campaign Details
                    </Link>
                  </div>
                </>
              )}

              {selectedNode.type === 'recipient' && (
                <>
                  <div>
                    <span className="text-sm text-gray-600">Address:</span>
                    <p className="font-mono text-xs break-all bg-gray-100 p-2 rounded">{selectedNode.metadata.fullAddress}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Campaigns:</span>
                    <p className="font-bold text-2xl">{selectedNode.metadata.campaigns}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Total Received:</span>
                    <p className="font-bold text-purple-600 text-2xl">{selectedNode.metadata.totalBCH.toFixed(2)} BCH</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Success Rate:</span>
                    <p className="font-bold text-xl">{(selectedNode.metadata.successRate * 100).toFixed(0)}%</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Successful:</span>
                    <p className="font-medium">{selectedNode.metadata.successfulCampaigns} / {selectedNode.metadata.campaigns}</p>
                  </div>
                </>
              )}

              {selectedNode.type === 'entity' && (
                <>
                  <div>
                    <span className="text-sm text-gray-600">Campaigns:</span>
                    <p className="font-bold text-2xl">{selectedNode.metadata.campaigns}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Total Raised:</span>
                    <p className="font-bold text-green-600 text-2xl">{selectedNode.metadata.totalBCH.toFixed(2)} BCH</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Success Rate:</span>
                    <p className="font-bold text-xl">{(selectedNode.metadata.successRate * 100).toFixed(0)}%</p>
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
