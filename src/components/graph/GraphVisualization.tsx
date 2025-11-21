'use client'

import { useEffect, useRef } from 'react'
import type { GraphNode, GraphEdge } from '@/types/campaign'

// Dynamic import to avoid SSR issues
let cytoscape: any
let fcose: any

export interface NodeFilters {
  showSuccessful: boolean
  showFailed: boolean
  showRunning: boolean
  showRecipients: boolean
}

export function GraphVisualization({
  nodes,
  edges,
  onNodeClick,
  filters = { showSuccessful: true, showFailed: true, showRunning: true, showRecipients: true }
}: {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeClick?: (nodeId: string, nodeData: any) => void
  filters?: NodeFilters
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<any>(null)

  useEffect(() => {
    // Import cytoscape dynamically (client-side only)
    const initCytoscape = async () => {
      if (!cytoscape) {
        cytoscape = (await import('cytoscape')).default
        fcose = (await import('cytoscape-fcose')).default
        cytoscape.use(fcose)
      }

      if (!containerRef.current || cyRef.current) return

      // Filter nodes based on filter settings
      const filteredNodes = nodes.filter(node => {
        const { type, metadata } = node.data

        if (type === 'campaign') {
          const status = metadata.status
          if (status === 'success' && !filters.showSuccessful) return false
          if ((status === 'expired' || status === 'failed') && !filters.showFailed) return false
          if (status === 'running' && !filters.showRunning) return false
        }

        if (type === 'recipient' && !filters.showRecipients) return false

        return true
      })

      // Get IDs of visible nodes
      const visibleNodeIds = new Set(filteredNodes.map(n => n.data.id))

      // Filter edges to only include those connecting visible nodes
      const filteredEdges = edges.filter(edge =>
        visibleNodeIds.has(edge.data.source) && visibleNodeIds.has(edge.data.target)
      )

      const cy = cytoscape({
        container: containerRef.current,

        elements: {
          nodes: filteredNodes,
          edges: filteredEdges,
        },

        style: [
          {
            selector: 'node[type="campaign"]',
            style: {
              'background-color': (ele: any) => {
                const status = ele.data('metadata').status
                return status === 'success' ? '#22C55E' :  // Green for success
                       status === 'expired' ? '#EF4444' :   // Red for expired/failed
                       status === 'running' ? '#3B82F6' :   // Blue for running
                       '#9CA3AF'  // Gray for unknown
              },
              'label': 'data(label)',
              'width': (ele: any) => Math.max(20, Math.sqrt(ele.data('value')) * 5),
              'height': (ele: any) => Math.max(20, Math.sqrt(ele.data('value')) * 5),
              'font-size': '10px',
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'wrap',
              'text-max-width': '80px',
            }
          },
          {
            selector: 'node[type="recipient"]',
            style: {
              'background-color': '#8B5CF6',  // Purple for recipients
              'label': 'data(label)',
              'width': (ele: any) => Math.max(30, Math.sqrt(ele.data('value')) * 4),
              'height': (ele: any) => Math.max(30, Math.sqrt(ele.data('value')) * 4),
              'shape': 'diamond',
              'font-size': '9px',
              'font-weight': 'bold',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 5,
              'color': '#4C1D95',
              'border-width': 2,
              'border-color': '#6D28D9',
            }
          },
          {
            selector: 'node[type="entity"]',
            style: {
              'background-color': (ele: any) => {
                const successRate = ele.data('metadata').successRate
                return successRate > 0.7 ? '#22C55E' :
                       successRate > 0.3 ? '#F59E0B' : '#EF4444'
              },
              'label': 'data(label)',
              'width': (ele: any) => Math.max(40, ele.data('metadata').campaigns * 15),
              'height': (ele: any) => Math.max(40, ele.data('metadata').campaigns * 15),
              'shape': 'hexagon',
              'font-size': '14px',
              'font-weight': 'bold',
              'text-valign': 'center',
              'text-halign': 'center',
              'color': '#fff',
              'text-outline-color': '#000',
              'text-outline-width': 2,
            }
          },
          {
            selector: 'edge[type="created"]',
            style: {
              'width': 2,
              'line-color': '#94A3B8',
              'target-arrow-color': '#94A3B8',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
            }
          },
          {
            selector: 'edge[type="related"]',
            style: {
              'width': 4,
              'line-color': '#8B5CF6',
              'line-style': 'dashed',
              'curve-style': 'bezier',
            }
          },
          {
            selector: 'edge[type="received"]',
            style: {
              'width': 2,
              'line-color': '#A78BFA',
              'target-arrow-color': '#A78BFA',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'opacity': 0.6,
            }
          },
          {
            selector: ':selected',
            style: {
              'border-width': 3,
              'border-color': '#FF6B6B',
            }
          }
        ],

        layout: {
          name: 'fcose',
          quality: 'proof',
          animate: false,
          randomize: false,
          nodeDimensionsIncludeLabels: true,
          idealEdgeLength: 100,
          nodeRepulsion: 4500,
          edgeElasticity: 0.45,
          nestingFactor: 0.1,
        },

        minZoom: 0.1,
        maxZoom: 3,
        wheelSensitivity: 0.5,  // Increased for faster zoom (was 0.2)
      })

      // Click handler
      cy.on('tap', 'node', (evt: any) => {
        const node = evt.target
        onNodeClick?.(node.id(), node.data())
      })

      // Double-click to focus
      cy.on('dbltap', 'node', (evt: any) => {
        const node = evt.target
        cy.animate({
          zoom: {
            level: 1.5,
            position: node.position()
          },
          duration: 500
        })
      })

      cyRef.current = cy
    }

    initCytoscape()

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
    }
  }, [nodes, edges, onNodeClick, filters])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-gray-50"
      style={{ minHeight: '600px' }}
    />
  )
}
