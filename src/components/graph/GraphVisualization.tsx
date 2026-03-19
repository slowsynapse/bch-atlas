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

// Continent center positions — wide spread, core at CENTER
const CONTINENT_CENTERS: Record<string, { x: number; y: number; label: string }> = {
  core:       { x: 0,     y: 0,     label: 'CORE INFRASTRUCTURE' },
  ecosystem:  { x: 0,     y: -1100, label: 'ECOSYSTEM INITIATIVES' },
  media:      { x: -1100, y: -400,  label: 'MEDIA & EDUCATION' },
  apps:       { x: 1100,  y: -400,  label: 'APPS & WALLETS' },
  middleware:  { x: -1100, y: 500,   label: 'MIDDLEWARE & LIBRARIES' },
  defi:       { x: 1100,  y: 500,   label: 'DEFI & CONTRACTS' },
  charity:    { x: 0,     y: 1100,  label: 'CHARITY & ADOPTION' },
  other:      { x: 0,     y: 1800,  label: 'OTHER' },
}

// Spiral positioning: bigger campaigns closer to center, wider spacing
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
  const baseRadius = 60 + (1 - normalizedAmount) * 300

  // Spiral angle — golden angle
  const goldenAngle = 2.399963
  const angle = index * goldenAngle
  const radiusGrowth = 1 + (index / Math.max(total, 1)) * 0.7
  const radius = baseRadius * radiusGrowth

  // Jitter to prevent overlaps
  const jitterX = (Math.sin(index * 7.3) * 15)
  const jitterY = (Math.cos(index * 11.7) * 15)

  return {
    x: centerX + Math.cos(angle) * radius + jitterX,
    y: centerY + Math.sin(angle) * radius + jitterY,
  }
}

function computePresetPositions(nodes: GraphNode[], edges: GraphEdge[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()

  // Group campaign nodes by continent
  const continentGroups = new Map<string, GraphNode[]>()
  const recipientNodes: GraphNode[] = []

  for (const node of nodes) {
    if (node.data.type === 'campaign') {
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
    group.sort((a, b) => (b.data.value || 0) - (a.data.value || 0))
    const maxAmount = group[0]?.data.value || 1

    for (let i = 0; i < group.length; i++) {
      const pos = computeSpiralPosition(center.x, center.y, i, group.length, group[i].data.value, maxAmount)
      positions.set(group[i].data.id, pos)
    }
  }

  // Position recipient nodes: average position of connected campaigns
  for (const rNode of recipientNodes) {
    const connectedEdges = edges.filter(e =>
      (e.data.target === rNode.data.id || e.data.source === rNode.data.id) && e.data.type === 'received'
    )
    let sumX = 0, sumY = 0, count = 0
    for (const edge of connectedEdges) {
      const campaignId = edge.data.source === rNode.data.id ? edge.data.target : edge.data.source
      const pos = positions.get(campaignId)
      if (pos) {
        sumX += pos.x
        sumY += pos.y
        count++
      }
    }
    if (count > 0) {
      const jitterX = Math.sin(rNode.data.id.length * 3.7) * 25
      const jitterY = Math.cos(rNode.data.id.length * 5.3) * 25
      positions.set(rNode.data.id, { x: sumX / count + jitterX, y: sumY / count + jitterY })
    } else {
      positions.set(rNode.data.id, { x: 0, y: 0 })
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

      // Add continent watermark label nodes
      const labelNodes: GraphNode[] = Object.entries(CONTINENT_CENTERS).map(([key, val]) => ({
        data: {
          id: `label-${key}`,
          label: val.label,
          type: 'continent-label' as any,
          value: 0,
          metadata: { continent: key }
        }
      }))

      // Position label nodes at continent centers
      for (const [key, val] of Object.entries(CONTINENT_CENTERS)) {
        positions.set(`label-${key}`, { x: val.x, y: val.y })
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
          // Continent watermark labels — very large, very dim
          {
            selector: 'node[type="continent-label"]',
            style: {
              'background-opacity': 0,
              'label': 'data(label)',
              'font-size': '48px',
              'font-weight': '700',
              'text-valign': 'center',
              'text-halign': 'center',
              'color': 'rgba(0, 224, 160, 0.08)',
              'text-outline-width': 0,
              'width': 1,
              'height': 1,
              'overlay-opacity': 0,
              'events': 'no',
              'border-width': 0,
              'text-transform': 'uppercase' as any,
            }
          },
          // Failed/expired campaigns — supernova remnant: hollow ring, transparent fill
          {
            selector: 'node[type="campaign"]',
            style: {
              'background-color': (ele: any) => {
                const status = ele.data('metadata').status
                if (status === 'success') return '#00FF88'
                if (status === 'running') return '#00D4FF'
                if (status === 'expired' || status === 'failed') return 'rgba(255, 68, 85, 0.1)'
                return '#556677'
              },
              'background-opacity': (ele: any) => {
                const status = ele.data('metadata').status
                if (status === 'expired' || status === 'failed') return 0.15
                if (status === 'success') return 0.9
                if (status === 'running') return 0.9
                return 0.6
              },
              'shape': (ele: any) => {
                return ele.data('metadata').status === 'running' ? 'rectangle' : 'ellipse'
              },
              'label': '',  // Labels off by default
              'width': (ele: any) => Math.max(10, Math.log2((ele.data('value') || 0) + 1) * 9),
              'height': (ele: any) => Math.max(10, Math.log2((ele.data('value') || 0) + 1) * 9),
              'font-size': '9px',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 5,
              'text-wrap': 'wrap',
              'text-max-width': '80px',
              'color': '#E0E4E8',
              'text-outline-color': '#0B0E11',
              'text-outline-width': 1.5,
              'overlay-opacity': 0,
              // Border for expired: hollow ring effect
              'border-width': (ele: any) => {
                const status = ele.data('metadata').status
                if (status === 'expired' || status === 'failed') return 2
                if (status === 'running') return 1.5
                return 0
              },
              'border-color': (ele: any) => {
                const status = ele.data('metadata').status
                if (status === 'expired' || status === 'failed') return 'rgba(255, 68, 85, 0.4)'
                if (status === 'running') return 'rgba(0, 212, 255, 0.6)'
                return 'transparent'
              },
              'border-opacity': 1,
              // Opacity: failed campaigns more transparent
              'opacity': (ele: any) => {
                const status = ele.data('metadata').status
                if (status === 'expired' || status === 'failed') return 0.4
                return 1
              },
              // Glow/shadow
              'shadow-blur': (ele: any) => {
                const status = ele.data('metadata').status
                if (status === 'success') return 15
                if (status === 'running') return 20
                return 5
              },
              'shadow-color': (ele: any) => {
                const status = ele.data('metadata').status
                if (status === 'success') return 'rgba(0, 255, 136, 0.5)'
                if (status === 'running') return 'rgba(0, 212, 255, 0.6)'
                if (status === 'expired' || status === 'failed') return 'rgba(255, 68, 85, 0.2)'
                return 'rgba(85, 102, 119, 0.2)'
              },
              'shadow-offset-x': 0,
              'shadow-offset-y': 0,
              'shadow-opacity': 0.8,
            }
          },
          // Recipient nodes — tiny, very transparent
          {
            selector: 'node[type="recipient"]',
            style: {
              'background-color': '#E8A838',
              'background-opacity': 0.3,
              'label': '',
              'width': 4,
              'height': 4,
              'shape': 'diamond',
              'border-width': 0,
              'overlay-opacity': 0,
              'opacity': 0.3,
            }
          },
          // Entity nodes (if any remain)
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
            }
          },
          // Same-entity edges — bright green strands
          {
            selector: 'edge[type="same-entity"]',
            style: {
              'width': 2,
              'line-color': 'rgba(0, 255, 136, 0.35)',
              'curve-style': 'bezier',
              'opacity': 0.6,
            }
          },
          // Shared-address edges — dim amber
          {
            selector: 'edge[type="shared-address"]',
            style: {
              'width': 1,
              'line-color': 'rgba(232, 168, 56, 0.15)',
              'curve-style': 'bezier',
              'opacity': 0.3,
            }
          },
          // Received edges (campaign → recipient) — very dim
          {
            selector: 'edge[type="received"]',
            style: {
              'width': 0.5,
              'line-color': 'rgba(232, 168, 56, 0.1)',
              'target-arrow-shape': 'none',
              'curve-style': 'bezier',
              'opacity': 0.2,
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

        minZoom: 0.05,
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
          ele.style('opacity', 0.08)
        })
        // Keep continent labels visible
        cy.nodes('[type="continent-label"]').forEach((ele: any) => {
          ele.style('opacity', 1)
        })
        node.style('opacity', 1)
        node.connectedEdges().forEach((edge: any) => {
          edge.style('opacity', 0.9)
          const edgeType = edge.data('type')
          if (edgeType === 'same-entity') {
            edge.style('line-color', '#00FF88')
            edge.style('width', 3)
          } else if (edgeType === 'shared-address') {
            edge.style('line-color', '#E8A838')
            edge.style('width', 2)
          } else {
            edge.style('line-color', '#4ECDC4')
            edge.style('width', 2)
          }
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
            ele.removeStyle('label')
          })
        }
      })

      // Hover: show label
      cy.on('mouseover', 'node', (evt: any) => {
        const node = evt.target
        if (node.data('type') === 'continent-label') return
        node.style('label', node.data('label'))
        // Brighten recipients on hover
        if (node.data('type') === 'recipient') {
          node.style('opacity', 1)
          node.style('width', 8)
          node.style('height', 8)
        }
      })
      cy.on('mouseout', 'node', (evt: any) => {
        const node = evt.target
        if (node.data('type') === 'continent-label') return
        node.style('label', '')
        if (node.data('type') === 'recipient') {
          node.removeStyle('opacity')
          node.removeStyle('width')
          node.removeStyle('height')
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
