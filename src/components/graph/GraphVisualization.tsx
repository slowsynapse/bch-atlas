'use client'

import { useEffect, useRef } from 'react'
import type { GraphNode, GraphEdge } from '@/types/campaign'

let cytoscape: any

export interface NodeFilters {
  showSuccessful: boolean
  showFailed: boolean
  showRunning: boolean
  showRecipients: boolean
}

// Continent center positions on canvas (x, y) — laid out like a map
const CONTINENT_CENTERS: Record<string, { x: number; y: number; label: string }> = {
  infrastructure: { x: -400, y: -250, label: 'INFRASTRUCTURE' },
  wallets:        { x: 400, y: -250, label: 'WALLETS & TOOLS' },
  defi:           { x: 0, y: 0, label: 'DEFI & CONTRACTS' },
  media:          { x: -400, y: 250, label: 'MEDIA & EDUCATION' },
  commerce:       { x: 400, y: 250, label: 'COMMERCE' },
  charity:        { x: 0, y: 350, label: 'CHARITY & ADOPTION' },
  other:          { x: 0, y: -350, label: 'OTHER' },
}

// Spiral positioning: bigger campaigns closer to center
function computeSpiralPosition(
  centerX: number,
  centerY: number,
  index: number,
  total: number,
  amount: number,
  maxAmount: number
): { x: number; y: number } {
  if (total === 0) return { x: centerX, y: centerY }

  // Distance from center: small amounts farther out, big amounts close
  const normalizedAmount = Math.log2((amount || 0) + 1) / Math.log2((maxAmount || 1) + 1)
  const baseRadius = 40 + (1 - normalizedAmount) * 160

  // Spiral angle
  const goldenAngle = 2.399963 // ~137.5 degrees in radians
  const angle = index * goldenAngle
  const radiusGrowth = 1 + (index / Math.max(total, 1)) * 0.5
  const radius = baseRadius * radiusGrowth

  // Add small jitter to prevent perfect overlaps
  const jitterX = (Math.sin(index * 7.3) * 8)
  const jitterY = (Math.cos(index * 11.7) * 8)

  return {
    x: centerX + Math.cos(angle) * radius + jitterX,
    y: centerY + Math.sin(angle) * radius + jitterY,
  }
}

function computePresetPositions(nodes: GraphNode[], edges: GraphEdge[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()

  // Group campaign nodes by continent
  const continentGroups = new Map<string, GraphNode[]>()
  const campaignNodes: GraphNode[] = []
  const recipientNodes: GraphNode[] = []

  for (const node of nodes) {
    if (node.data.type === 'campaign') {
      campaignNodes.push(node)
      const continent = node.data.metadata?.continent || 'other'
      if (!continentGroups.has(continent)) continentGroups.set(continent, [])
      continentGroups.get(continent)!.push(node)
    } else if (node.data.type === 'recipient') {
      recipientNodes.push(node)
    }
  }

  // Position campaign nodes in spiral within each continent
  for (const [continent, group] of continentGroups) {
    const center = CONTINENT_CENTERS[continent] || CONTINENT_CENTERS.other
    // Sort by amount descending so biggest campaigns get spiral index 0 (closest to center)
    group.sort((a, b) => (b.data.value || 0) - (a.data.value || 0))
    const maxAmount = group[0]?.data.value || 1

    for (let i = 0; i < group.length; i++) {
      const pos = computeSpiralPosition(center.x, center.y, i, group.length, group[i].data.value, maxAmount)
      positions.set(group[i].data.id, pos)
    }
  }

  // Position recipient nodes: average position of their connected campaigns
  const campaignPositions = positions
  for (const rNode of recipientNodes) {
    const connectedEdges = edges.filter(e => e.data.target === rNode.data.id || e.data.source === rNode.data.id)
    let sumX = 0, sumY = 0, count = 0
    for (const edge of connectedEdges) {
      const campaignId = edge.data.source === rNode.data.id ? edge.data.target : edge.data.source
      const pos = campaignPositions.get(campaignId)
      if (pos) {
        sumX += pos.x
        sumY += pos.y
        count++
      }
    }
    if (count > 0) {
      // Place recipient slightly offset from the average of its connected campaigns
      const jitterX = Math.sin(rNode.data.id.length * 3.7) * 20
      const jitterY = Math.cos(rNode.data.id.length * 5.3) * 20
      positions.set(rNode.data.id, { x: sumX / count + jitterX, y: sumY / count + jitterY })
    } else {
      positions.set(rNode.data.id, { x: 0, y: 0 })
    }
  }

  // Entity nodes: average of their campaigns
  for (const node of nodes) {
    if (node.data.type === 'entity') {
      positions.set(node.data.id, { x: 0, y: 0 })
    }
  }

  return positions
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

      // Compute positions before creating graph
      const positions = computePresetPositions(filteredNodes, filteredEdges)

      // Add continent label nodes
      const labelNodes: GraphNode[] = Object.entries(CONTINENT_CENTERS).map(([key, val]) => ({
        data: {
          id: `label-${key}`,
          label: val.label,
          type: 'continent-label' as any,
          value: 0,
          metadata: { continent: key }
        }
      }))

      // Set label positions
      for (const [key, val] of Object.entries(CONTINENT_CENTERS)) {
        positions.set(`label-${key}`, { x: val.x, y: val.y - 200 })
      }

      // Add positions to nodes
      const nodesWithPositions = [...filteredNodes, ...labelNodes].map(n => ({
        ...n,
        position: positions.get(n.data.id) || { x: 0, y: 0 }
      }))

      const cy = cytoscape({
        container: containerRef.current,

        elements: {
          nodes: nodesWithPositions,
          edges: filteredEdges,
        },

        style: [
          // Continent label nodes
          {
            selector: 'node[type="continent-label"]',
            style: {
              'background-opacity': 0,
              'label': 'data(label)',
              'font-size': '14px',
              'font-weight': '300',
              'text-valign': 'center',
              'text-halign': 'center',
              'color': 'rgba(0, 224, 160, 0.2)',
              'text-outline-width': 0,
              'width': 1,
              'height': 1,
              'overlay-opacity': 0,
              'events': 'no',
              'border-width': 0,
            }
          },
          // Campaign nodes — running campaigns are rectangles (squares)
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
              'shape': (ele: any) => {
                return ele.data('metadata').status === 'running' ? 'rectangle' : 'ellipse'
              },
              'label': (ele: any) => {
                const val = ele.data('value') || 0
                return val > 10 ? ele.data('label') : ''
              },
              'width': (ele: any) => Math.max(8, Math.log2((ele.data('value') || 0) + 1) * 8),
              'height': (ele: any) => Math.max(8, Math.log2((ele.data('value') || 0) + 1) * 8),
              'font-size': '9px',
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'wrap',
              'text-max-width': '70px',
              'color': '#E0E4E8',
              'text-outline-color': '#0B0E11',
              'text-outline-width': 1.5,
              'overlay-opacity': 0,
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
              'label': (ele: any) => {
                const val = ele.data('value') || 0
                return val > 5 ? ele.data('label') : ''
              },
              'width': (ele: any) => Math.max(12, Math.log2((ele.data('value') || 0) + 1) * 7),
              'height': (ele: any) => Math.max(12, Math.log2((ele.data('value') || 0) + 1) * 7),
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
              'width': 1,
              'line-color': 'rgba(78, 205, 196, 0.15)',
              'target-arrow-color': 'rgba(78, 205, 196, 0.15)',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'opacity': 0.5,
            }
          },
          {
            selector: 'edge[type="related"]',
            style: {
              'width': 1.5,
              'line-color': 'rgba(78, 205, 196, 0.2)',
              'line-style': 'dashed',
              'curve-style': 'bezier',
              'opacity': 0.4,
            }
          },
          {
            selector: 'edge[type="received"]',
            style: {
              'width': 1,
              'line-color': 'rgba(232, 168, 56, 0.2)',
              'target-arrow-color': 'rgba(232, 168, 56, 0.2)',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'opacity': 0.35,
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
          name: 'preset',
        },

        minZoom: 0.1,
        maxZoom: 3,
        wheelSensitivity: 0.5,
      })

      // Click: select and highlight connections
      cy.on('tap', 'node', (evt: any) => {
        const node = evt.target
        if (node.data('type') === 'continent-label') return
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

      // Hover: show label for small nodes
      cy.on('mouseover', 'node', (evt: any) => {
        const node = evt.target
        if (node.data('type') !== 'continent-label') {
          node.style('label', node.data('label'))
        }
      })
      cy.on('mouseout', 'node', (evt: any) => {
        const node = evt.target
        if (node.data('type') === 'continent-label') return
        const val = node.data('value') || 0
        const type = node.data('type')
        const threshold = type === 'recipient' ? 5 : type === 'entity' ? 0 : 10
        if (val <= threshold) {
          node.style('label', '')
        }
      })

      // Double-click to focus
      cy.on('dbltap', 'node', (evt: any) => {
        const node = evt.target
        if (node.data('type') === 'continent-label') return
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
          #070A0D
        `,
      }}
    />
  )
}
