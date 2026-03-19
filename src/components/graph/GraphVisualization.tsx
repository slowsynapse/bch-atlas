'use client'

import { useEffect, useRef } from 'react'
import type { GraphNode, GraphEdge } from '@/types/campaign'

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
    const initCytoscape = async () => {
      if (!cytoscape) {
        cytoscape = (await import('cytoscape')).default
        fcose = (await import('cytoscape-fcose')).default
        cytoscape.use(fcose)
      }

      if (!containerRef.current || cyRef.current) return

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

      const visibleNodeIds = new Set(filteredNodes.map(n => n.data.id))
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
                return status === 'success' ? '#00FF88' :
                       status === 'expired' ? '#FF3344' :
                       status === 'running' ? '#00D4FF' :
                       '#555566'
              },
              'label': 'data(label)',
              'width': (ele: any) => Math.max(20, Math.sqrt(ele.data('value')) * 5),
              'height': (ele: any) => Math.max(20, Math.sqrt(ele.data('value')) * 5),
              'font-size': '10px',
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'wrap',
              'text-max-width': '80px',
              'color': '#E8E8EC',
              'text-outline-color': '#0A0A0C',
              'text-outline-width': 1.5,
            }
          },
          {
            selector: 'node[type="recipient"]',
            style: {
              'background-color': '#FF8C00',
              'label': 'data(label)',
              'width': (ele: any) => Math.max(30, Math.sqrt(ele.data('value')) * 4),
              'height': (ele: any) => Math.max(30, Math.sqrt(ele.data('value')) * 4),
              'shape': 'diamond',
              'font-size': '9px',
              'font-weight': 'bold',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 5,
              'color': '#FF8C00',
              'border-width': 2,
              'border-color': '#CC7000',
              'text-outline-color': '#0A0A0C',
              'text-outline-width': 1,
            }
          },
          {
            selector: 'node[type="entity"]',
            style: {
              'background-color': (ele: any) => {
                const successRate = ele.data('metadata').successRate
                return successRate > 0.7 ? '#00FF88' :
                       successRate > 0.3 ? '#FF8C00' : '#FF3344'
              },
              'label': 'data(label)',
              'width': (ele: any) => Math.max(40, ele.data('metadata').campaigns * 15),
              'height': (ele: any) => Math.max(40, ele.data('metadata').campaigns * 15),
              'shape': 'hexagon',
              'font-size': '14px',
              'font-weight': 'bold',
              'text-valign': 'center',
              'text-halign': 'center',
              'color': '#E8E8EC',
              'text-outline-color': '#0A0A0C',
              'text-outline-width': 2,
            }
          },
          {
            selector: 'edge[type="created"]',
            style: {
              'width': 2,
              'line-color': 'rgba(0, 212, 255, 0.2)',
              'target-arrow-color': 'rgba(0, 212, 255, 0.2)',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
            }
          },
          {
            selector: 'edge[type="related"]',
            style: {
              'width': 4,
              'line-color': 'rgba(0, 212, 255, 0.3)',
              'line-style': 'dashed',
              'curve-style': 'bezier',
            }
          },
          {
            selector: 'edge[type="received"]',
            style: {
              'width': 2,
              'line-color': 'rgba(255, 140, 0, 0.3)',
              'target-arrow-color': 'rgba(255, 140, 0, 0.3)',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'opacity': 0.6,
            }
          },
          {
            selector: ':selected',
            style: {
              'border-width': 3,
              'border-color': '#00D4FF',
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
        wheelSensitivity: 0.5,
      })

      // Click: select and highlight connections
      cy.on('tap', 'node', (evt: any) => {
        const node = evt.target
        onNodeClick?.(node.id(), node.data())

        // Dim all, brighten connected
        cy.elements().forEach((ele: any) => {
          ele.style('opacity', 0.15)
        })
        node.style('opacity', 1)
        node.connectedEdges().forEach((edge: any) => {
          edge.style('opacity', 1)
          edge.style('line-color', edge.data('type') === 'received' ? '#FF8C00' : '#00D4FF')
          edge.connectedNodes().style('opacity', 1)
        })
      })

      // Click background: reset
      cy.on('tap', (evt: any) => {
        if (evt.target === cy) {
          cy.elements().forEach((ele: any) => {
            ele.removeStyle('opacity')
            ele.removeStyle('line-color')
          })
        }
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
      className="w-full h-full"
      style={{ minHeight: '600px', background: '#0A0A0C' }}
    />
  )
}
