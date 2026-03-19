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
                return status === 'success' ? '#56E89C' :
                       status === 'expired' ? '#E85454' :
                       status === 'running' ? '#4ECDC4' :
                       '#556677'
              },
              'background-opacity': 0.85,
              'label': 'data(label)',
              'width': (ele: any) => Math.max(20, Math.sqrt(ele.data('value')) * 5),
              'height': (ele: any) => Math.max(20, Math.sqrt(ele.data('value')) * 5),
              'font-size': '10px',
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'wrap',
              'text-max-width': '80px',
              'color': '#E0E4E8',
              'text-outline-color': '#0B0E11',
              'text-outline-width': 1.5,
              'overlay-opacity': 0,
              // Subtle glow via shadow
              'shadow-blur': 12,
              'shadow-color': (ele: any) => {
                const status = ele.data('metadata').status
                return status === 'success' ? 'rgba(86, 232, 156, 0.4)' :
                       status === 'expired' ? 'rgba(232, 84, 84, 0.4)' :
                       status === 'running' ? 'rgba(78, 205, 196, 0.4)' :
                       'rgba(85, 102, 119, 0.3)'
              },
              'shadow-offset-x': 0,
              'shadow-offset-y': 0,
              'shadow-opacity': 0.6,
            }
          },
          {
            selector: 'node[type="recipient"]',
            style: {
              'background-color': '#E8A838',
              'background-opacity': 0.85,
              'label': 'data(label)',
              'width': (ele: any) => Math.max(30, Math.sqrt(ele.data('value')) * 4),
              'height': (ele: any) => Math.max(30, Math.sqrt(ele.data('value')) * 4),
              'shape': 'diamond',
              'font-size': '9px',
              'font-weight': 'bold',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 5,
              'color': '#E8A838',
              'border-width': 1.5,
              'border-color': 'rgba(232, 168, 56, 0.5)',
              'text-outline-color': '#0B0E11',
              'text-outline-width': 1,
              'overlay-opacity': 0,
              'shadow-blur': 10,
              'shadow-color': 'rgba(232, 168, 56, 0.35)',
              'shadow-offset-x': 0,
              'shadow-offset-y': 0,
              'shadow-opacity': 0.5,
            }
          },
          {
            selector: 'node[type="entity"]',
            style: {
              'background-color': (ele: any) => {
                const successRate = ele.data('metadata').successRate
                return successRate > 0.7 ? '#56E89C' :
                       successRate > 0.3 ? '#E8A838' : '#E85454'
              },
              'background-opacity': 0.85,
              'label': 'data(label)',
              'width': (ele: any) => Math.max(40, ele.data('metadata').campaigns * 15),
              'height': (ele: any) => Math.max(40, ele.data('metadata').campaigns * 15),
              'shape': 'hexagon',
              'font-size': '14px',
              'font-weight': 'bold',
              'text-valign': 'center',
              'text-halign': 'center',
              'color': '#E0E4E8',
              'text-outline-color': '#0B0E11',
              'text-outline-width': 2,
              'overlay-opacity': 0,
              'shadow-blur': 16,
              'shadow-color': (ele: any) => {
                const successRate = ele.data('metadata').successRate
                return successRate > 0.7 ? 'rgba(86, 232, 156, 0.4)' :
                       successRate > 0.3 ? 'rgba(232, 168, 56, 0.4)' : 'rgba(232, 84, 84, 0.4)'
              },
              'shadow-offset-x': 0,
              'shadow-offset-y': 0,
              'shadow-opacity': 0.6,
            }
          },
          {
            selector: 'edge[type="created"]',
            style: {
              'width': 1.5,
              'line-color': 'rgba(78, 205, 196, 0.25)',
              'target-arrow-color': 'rgba(78, 205, 196, 0.25)',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'opacity': 0.7,
            }
          },
          {
            selector: 'edge[type="related"]',
            style: {
              'width': 3,
              'line-color': 'rgba(78, 205, 196, 0.35)',
              'line-style': 'dashed',
              'curve-style': 'bezier',
              'opacity': 0.6,
            }
          },
          {
            selector: 'edge[type="received"]',
            style: {
              'width': 1.5,
              'line-color': 'rgba(232, 168, 56, 0.35)',
              'target-arrow-color': 'rgba(232, 168, 56, 0.35)',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'opacity': 0.5,
            }
          },
          {
            selector: ':selected',
            style: {
              'border-width': 2,
              'border-color': '#4ECDC4',
              'shadow-blur': 25,
              'shadow-color': 'rgba(78, 205, 196, 0.6)',
              'shadow-opacity': 1,
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
          ele.style('opacity', 0.1)
        })
        node.style('opacity', 1)
        node.connectedEdges().forEach((edge: any) => {
          edge.style('opacity', 0.9)
          edge.style('line-color', edge.data('type') === 'received' ? '#E8A838' : '#4ECDC4')
          edge.style('width', edge.data('type') === 'received' ? 2.5 : 2)
          edge.connectedNodes().style('opacity', 1)
        })
      })

      // Click background: reset
      cy.on('tap', (evt: any) => {
        if (evt.target === cy) {
          cy.elements().forEach((ele: any) => {
            ele.removeStyle('opacity')
            ele.removeStyle('line-color')
            ele.removeStyle('width')
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
      style={{
        minHeight: '600px',
        background: `
          radial-gradient(ellipse 60% 50% at 50% 50%, rgba(78, 205, 196, 0.03) 0%, transparent 70%),
          radial-gradient(ellipse 40% 40% at 75% 25%, rgba(42, 157, 143, 0.02) 0%, transparent 60%),
          radial-gradient(ellipse 50% 50% at 25% 75%, rgba(78, 205, 196, 0.015) 0%, transparent 50%),
          #0B0E11
        `,
      }}
    />
  )
}
