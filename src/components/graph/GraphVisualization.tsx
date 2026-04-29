'use client'

import { useEffect, useRef } from 'react'
import type { GraphNode, GraphEdge } from '@/types/campaign'

let cytoscape: any

export interface NodeFilters {
  showSuccessful: boolean
  showFailed: boolean
  showRunning: boolean
  showRecipients: boolean
  showProjects: boolean
}

// Cracked moon SVG for failed/expired campaigns — a fractured planet splitting apart.
// Uses preserveAspectRatio="xMidYMid meet" so it scales correctly inside Cytoscape's
// background-fit:contain rectangle without clipping. Padded viewBox (-15 to 115)
// keeps stroke ends and crack lines from being clipped by the node's bounds at
// large sizes.
const CRACKED_MOON_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 112 112" width="112" height="112" preserveAspectRatio="xMidYMid meet">
  <defs>
    <clipPath id="left-half">
      <path d="M0,0 L47,0 L44,38 L50,50 L43,65 L48,100 L0,100 Z"/>
    </clipPath>
    <clipPath id="right-half">
      <path d="M53,0 L100,0 L100,100 L52,100 L57,65 L50,50 L56,38 Z"/>
    </clipPath>
  </defs>
  <!-- Left half, shifted slightly left and down -->
  <circle cx="48" cy="52" r="42" fill="#1a0000" stroke="#FF4455" stroke-width="3" clip-path="url(#left-half)"/>
  <!-- Right half, shifted slightly right and up -->
  <circle cx="52" cy="48" r="42" fill="#1a0000" stroke="#FF4455" stroke-width="3" clip-path="url(#right-half)"/>
  <!-- Crack lines — jagged fractures through the center -->
  <polyline points="50,4 48,20 54,32 44,38 50,50 43,65 52,78 48,96" fill="none" stroke="#FF4455" stroke-width="2.5" stroke-linecap="round"/>
  <polyline points="18,22 30,30 44,38" fill="none" stroke="#FF4455" stroke-width="1.5" stroke-linecap="round"/>
  <polyline points="82,72 68,66 57,65" fill="none" stroke="#FF4455" stroke-width="1.5" stroke-linecap="round"/>
</svg>`)

// Exploding planet SVG for funded-but-didn't-deliver campaigns — three large
// fragments flying outward from a bright explosion core. Distinct from the
// cracked-moon (campaign-failed) and solid red planet (project-died-later)
// to make "took the BCH and never shipped" visually obvious.
//
// IMPORTANT: avoid intra-SVG `url(#id)` references (gradients, clipPaths
// with id refs). When this SVG is loaded as a data URI inside Cytoscape's
// canvas renderer, those references resolve to the *page* DOM context, not
// the SVG's own document, and the gradients fail silently — leaving the
// node invisible. Flat fills work reliably; that's why the cracked-moon
// SVG (which uses no gradients) renders fine.
const EXPLODING_PLANET_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 108 108" width="108" height="108" preserveAspectRatio="xMidYMid meet">
  <!-- Explosion glow — overlapping translucent circles approximate a radial gradient -->
  <circle cx="48" cy="48" r="42" fill="#FF4455" opacity="0.18"/>
  <circle cx="48" cy="48" r="32" fill="#FF7A4C" opacity="0.30"/>
  <circle cx="48" cy="48" r="22" fill="#FFE066" opacity="0.40"/>

  <!-- Three large planet-body fragments flying outward, flat fills -->
  <path d="M 24 16 L 38 20 L 34 32 L 26 30 L 16 24 Z" fill="#CC3344" stroke="#FF8899" stroke-width="0.7" opacity="0.92"/>
  <path d="M 63 19 L 77 25 L 73 37 L 61 33 L 57 25 Z" fill="#CC3344" stroke="#FF8899" stroke-width="0.7" opacity="0.92"/>
  <path d="M 36 64 L 56 62 L 62 74 L 56 84 L 38 82 L 32 72 Z" fill="#CC3344" stroke="#FF8899" stroke-width="0.7" opacity="0.92"/>

  <!-- Small debris chunks scattered outward -->
  <circle cx="14" cy="18" r="2.2" fill="#FF8899" opacity="0.85"/>
  <circle cx="82" cy="22" r="2.6" fill="#FF6677" opacity="0.85"/>
  <circle cx="86" cy="60" r="1.8" fill="#FF8899" opacity="0.7"/>
  <circle cx="10" cy="70" r="2.3" fill="#FF4455" opacity="0.8"/>
  <circle cx="20" cy="86" r="1.6" fill="#FF8899" opacity="0.7"/>
  <circle cx="78" cy="84" r="2" fill="#FF6677" opacity="0.75"/>

  <!-- Outward motion streaks from explosion center -->
  <path d="M 48 48 L 14 18" stroke="#FFD060" stroke-width="0.7" opacity="0.45" stroke-linecap="round"/>
  <path d="M 48 48 L 82 22" stroke="#FFD060" stroke-width="0.7" opacity="0.45" stroke-linecap="round"/>
  <path d="M 48 48 L 86 60" stroke="#FFD060" stroke-width="0.5" opacity="0.4" stroke-linecap="round"/>
  <path d="M 48 48 L 10 70" stroke="#FFD060" stroke-width="0.6" opacity="0.45" stroke-linecap="round"/>
  <path d="M 48 48 L 20 86" stroke="#FFD060" stroke-width="0.5" opacity="0.4" stroke-linecap="round"/>
  <path d="M 48 48 L 78 84" stroke="#FFD060" stroke-width="0.6" opacity="0.45" stroke-linecap="round"/>

  <!-- Bright explosion center -->
  <circle cx="48" cy="48" r="9" fill="#FFE066" opacity="0.9"/>
  <circle cx="48" cy="48" r="4" fill="#FFFFFF" opacity="0.95"/>
</svg>`)

// Simple seeded random from string — deterministic per node ID
function seededRandom(seed: string, index: number): number {
  let h = 0
  const s = seed + ':' + index
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return ((h & 0x7fffffff) % 10000) / 10000
}

// Continent center positions — wide spread, core at CENTER
const CONTINENT_CENTERS: Record<string, { x: number; y: number; label: string }> = {
  core:       { x: 0,     y: 0,     label: 'CORE INFRASTRUCTURE' },
  ecosystem:  { x: 0,     y: -2000, label: 'ECOSYSTEM INITIATIVES' },
  media:      { x: -2000, y: -730,  label: 'MEDIA & EDUCATION' },
  apps:       { x: 2000,  y: -730,  label: 'APPS & WALLETS' },
  middleware:  { x: -2000, y: 900,   label: 'MIDDLEWARE & LIBRARIES' },
  defi:       { x: 2000,  y: 900,   label: 'DEFI & CONTRACTS' },
  charity:    { x: 0,     y: 2000,  label: 'CHARITY & ADOPTION' },
  other:      { x: 0,     y: 3200,  label: 'OTHER' },
}

// Planetary system layout: sun at center, concentric rings by funding size
function computePlanetaryPositions(
  centerX: number,
  centerY: number,
  campaigns: GraphNode[]
): { positions: Map<string, { x: number; y: number }>; ringRadii: number[] } {
  const positions = new Map<string, { x: number; y: number }>()
  if (campaigns.length === 0) return { positions, ringRadii: [] }

  // Separate funded/active from failed
  const funded: GraphNode[] = []
  const failed: GraphNode[] = []
  for (const c of campaigns) {
    const status = c.data.metadata?.status
    if (status === 'expired' || status === 'failed') {
      failed.push(c)
    } else {
      funded.push(c)
    }
  }

  // Sort funded by value descending — biggest is the sun
  funded.sort((a, b) => (b.data.value || 0) - (a.data.value || 0))
  // Sort failed by value descending too (sized by ask amount)
  failed.sort((a, b) => (b.data.value || 0) - (a.data.value || 0))

  // Place the sun at center
  if (funded.length > 0) {
    positions.set(funded[0].data.id, { x: centerX, y: centerY })
  }

  // Remaining funded campaigns go in concentric rings
  const ringCapacities = [5, 6, 5, 6, 5, 6] // nodes per ring — keep rings uncrowded
  let ringIndex = 0
  let slotInRing = 0
  const RING_START = 150
  const RING_STEP = 120
  const MIN_SPACING = 40 // minimum distance between any two nodes

  // Track ring radii for orbit ring visualization
  const ringRadii: number[] = []

  for (let i = 1; i < funded.length; i++) {
    const capacity = ringCapacities[Math.min(ringIndex, ringCapacities.length - 1)]
    const nominalRadius = RING_START + ringIndex * RING_STEP
    if (!ringRadii.includes(nominalRadius)) ringRadii.push(nominalRadius)
    const angleStep = (Math.PI * 2) / capacity
    const id = funded[i].data.id
    // Scatter: random angular offset + radial jitter (seeded by node ID)
    const angularJitter = seededRandom(id, 0) * angleStep * 0.6
    const radialScale = 0.85 + seededRandom(id, 1) * 0.3
    const angle = slotInRing * angleStep + angularJitter
    const radius = nominalRadius * radialScale

    positions.set(id, {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    })

    slotInRing++
    if (slotInRing >= capacity) {
      slotInRing = 0
      ringIndex++
    }
  }

  // Failed campaigns at the outer edge — one more ring beyond the last funded ring
  const outerRingStart = RING_START + (ringIndex + 1) * RING_STEP
  const failedRingCapacities = [5, 6, 5, 6, 5, 6]
  let failedRingIndex = 0
  let failedSlot = 0

  for (let i = 0; i < failed.length; i++) {
    const capacity = failedRingCapacities[Math.min(failedRingIndex, failedRingCapacities.length - 1)]
    const nominalRadius = outerRingStart + failedRingIndex * RING_STEP
    if (!ringRadii.includes(nominalRadius)) ringRadii.push(nominalRadius)
    const angleStep = (Math.PI * 2) / capacity
    const id = failed[i].data.id
    // Scatter: random angular offset + radial jitter
    const angularJitter = seededRandom(id, 0) * angleStep * 0.6
    const radialScale = 0.85 + seededRandom(id, 1) * 0.3
    const angle = failedSlot * angleStep + angularJitter
    const radius = nominalRadius * radialScale

    positions.set(id, {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    })

    failedSlot++
    if (failedSlot >= capacity) {
      failedSlot = 0
      failedRingIndex++
    }
  }

  // Collision resolution: push apart any nodes closer than MIN_SPACING
  const allIds = Array.from(positions.keys())
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < allIds.length; i++) {
      for (let j = i + 1; j < allIds.length; j++) {
        const a = positions.get(allIds[i])!
        const b = positions.get(allIds[j])!
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < MIN_SPACING && dist > 0) {
          const push = (MIN_SPACING - dist) / 2
          const nx = dx / dist
          const ny = dy / dist
          a.x -= nx * push
          a.y -= ny * push
          b.x += nx * push
          b.y += ny * push
        }
      }
    }
  }

  return { positions, ringRadii }
}

// Orbit ring data for canvas rendering
interface OrbitRing {
  cx: number
  cy: number
  radius: number
}

function computePresetPositions(nodes: GraphNode[], edges: GraphEdge[]): { positions: Map<string, { x: number; y: number }>; orbitRings: OrbitRing[] } {
  const positions = new Map<string, { x: number; y: number }>()
  const orbitRings: OrbitRing[] = []

  // Group campaign nodes by continent
  const continentGroups = new Map<string, GraphNode[]>()
  const recipientNodes: GraphNode[] = []
  const projectNodes: GraphNode[] = []

  for (const node of nodes) {
    if (node.data.type === 'campaign') {
      const continent = node.data.metadata?.continent || 'other'
      if (!continentGroups.has(continent)) continentGroups.set(continent, [])
      continentGroups.get(continent)!.push(node)
    } else if (node.data.type === 'recipient') {
      recipientNodes.push(node)
    } else if (node.data.type === 'project') {
      projectNodes.push(node)
    }
  }

  // Position campaign nodes as planetary systems within each continent
  for (const [continent, group] of continentGroups) {
    const center = CONTINENT_CENTERS[continent] || CONTINENT_CENTERS.other
    const { positions: planetaryPositions, ringRadii } = computePlanetaryPositions(center.x, center.y, group)
    for (const [id, pos] of planetaryPositions) {
      positions.set(id, pos)
    }
    for (const r of ringRadii) {
      orbitRings.push({ cx: center.x, cy: center.y, radius: r })
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

  // Position project stations: anchor at centroid of their member campaigns,
  // offset above the cluster so the station "hovers" over its planets
  for (const pNode of projectNodes) {
    const memberEdges = edges.filter(e =>
      e.data.type === 'project-member' && e.data.source === pNode.data.id
    )
    let sumX = 0, sumY = 0, count = 0
    for (const edge of memberEdges) {
      const pos = positions.get(edge.data.target)
      if (pos) {
        sumX += pos.x
        sumY += pos.y
        count++
      }
    }
    if (count > 0) {
      // Offset upward by 90px so the station sits above its planet cluster
      const jitterX = (seededRandom(pNode.data.id, 0) - 0.5) * 60
      positions.set(pNode.data.id, {
        x: sumX / count + jitterX,
        y: sumY / count - 90,
      })
    } else {
      // Fallback: project's continent center
      const continent = pNode.data.metadata?.continent || 'other'
      const center = CONTINENT_CENTERS[continent] || CONTINENT_CENTERS.other
      positions.set(pNode.data.id, { x: center.x, y: center.y })
    }
  }

  return { positions, orbitRings }
}

// Check if an edge crosses continent boundaries
function isCrossContinentEdge(edge: GraphEdge, nodeContMap: Map<string, string>): boolean {
  const srcCont = nodeContMap.get(edge.data.source)
  const tgtCont = nodeContMap.get(edge.data.target)
  return !!(srcCont && tgtCont && srcCont !== tgtCont)
}

export function GraphVisualization({
  nodes,
  edges,
  onNodeClick,
  filters = { showSuccessful: true, showFailed: true, showRunning: true, showRecipients: true, showProjects: true }
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
        const cytoscapeCanvas = (await import('cytoscape-canvas')).default
        cytoscapeCanvas(cytoscape)
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
        if (type === 'project' && !filters.showProjects) return false

        return true
      })

      const visibleNodeIds = new Set(filteredNodes.map(n => n.data.id))
      const filteredEdges = edges.filter(edge =>
        visibleNodeIds.has(edge.data.source) && visibleNodeIds.has(edge.data.target)
      )

      // Build node→continent map for cross-continent edge detection
      const nodeContMap = new Map<string, string>()
      for (const node of filteredNodes) {
        if (node.data.type === 'campaign') {
          nodeContMap.set(node.data.id, node.data.metadata?.continent || 'other')
        }
      }

      // Tag cross-continent edges with metadata
      const edgesWithCross = filteredEdges.map(e => ({
        ...e,
        data: {
          ...e.data,
          crossContinent: isCrossContinentEdge(e, nodeContMap) ? 'yes' : 'no',
        }
      }))

      // Compute positions before creating graph
      const { positions, orbitRings } = computePresetPositions(filteredNodes, filteredEdges)

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

      // Position label nodes ABOVE continent centers so they don't overlap campaign nodes
      for (const [key, val] of Object.entries(CONTINENT_CENTERS)) {
        positions.set(`label-${key}`, { x: val.x, y: val.y - 280 })
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
          edges: edgesWithCross,
        },

        style: [
          // Continent watermark labels — rendered behind everything
          {
            selector: 'node[type="continent-label"]',
            style: {
              'background-opacity': 0,
              'label': 'data(label)',
              'font-size': '56px',
              'font-weight': '700',
              'text-valign': 'center',
              'text-halign': 'center',
              'color': 'rgba(0, 224, 160, 0.15)',
              'text-outline-width': 0,
              'width': 1,
              'height': 1,
              'overlay-opacity': 0,
              'events': 'no',
              'border-width': 0,
              'text-transform': 'uppercase' as any,
              'z-index': 0,
            }
          },
          // Campaign nodes:
          //   funded + delivered:'no' → exploding planet (took the BCH, never shipped)
          //   funded + project active → green planet (working as intended)
          //   funded + project dead → solid red planet (delivered, project later died)
          //   funded + project dormant → amber planet
          //   funded + no project link → orange planet (default — investigate)
          //   running → cyan rectangle
          //   expired/failed (campaign itself) → cracked-moon SVG (reserved for goal-not-reached)
          {
            selector: 'node[type="campaign"]',
            style: {
              'background-color': (ele: any) => {
                const md = ele.data('metadata')
                const status = md.status
                if (status === 'success') {
                  if (md.delivered === 'no') return 'rgba(0,0,0,0)' // SVG handles visuals
                  if (md.projectStatus === 'active') return '#00FF88'
                  if (md.projectStatus === 'dead') return '#FF4455'
                  if (md.projectStatus === 'dormant') return '#E8A838'
                  return '#FF8C00' // orange default for unlinked funded
                }
                if (status === 'running') return '#00D4FF'
                if (status === 'expired' || status === 'failed') return 'rgba(0,0,0,0)'
                return '#556677'
              },
              'background-opacity': (ele: any) => {
                const md = ele.data('metadata')
                const status = md.status
                if (status === 'expired' || status === 'failed') return 0
                if (status === 'success' && md.delivered === 'no') return 0
                if (status === 'success') return 0.9
                if (status === 'running') return 0.9
                return 0.6
              },
              'shape': (ele: any) => {
                const md = ele.data('metadata')
                const status = md.status
                if (status === 'running') return 'rectangle'
                if (status === 'expired' || status === 'failed') return 'rectangle'
                if (status === 'success' && md.delivered === 'no') return 'rectangle'
                return 'ellipse'
              },
              'background-image': (ele: any) => {
                const md = ele.data('metadata')
                const status = md.status
                if (status === 'expired' || status === 'failed') return CRACKED_MOON_SVG
                if (status === 'success' && md.delivered === 'no') return EXPLODING_PLANET_SVG
                return 'none'
              },
              'background-fit': 'contain' as any,
              'background-clip': 'none' as any,
              'label': (ele: any) => {
                const title = ele.data('label') || ''
                return title.length > 40 ? title.slice(0, 40) + '…' : title
              },
              'width': (ele: any) => Math.max(10, Math.log2((ele.data('value') || 0) + 1) * 9),
              'height': (ele: any) => Math.max(10, Math.log2((ele.data('value') || 0) + 1) * 9),
              'font-size': (ele: any) => {
                const size = Math.max(10, Math.log2((ele.data('value') || 0) + 1) * 9)
                if (size >= 30) return '12px'
                if (size >= 18) return '10px'
                return '8px'
              },
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 5,
              'text-wrap': 'ellipsis' as any,
              'text-max-width': '160px',
              'color': (ele: any) => {
                const status = ele.data('metadata').status
                if (status === 'expired' || status === 'failed') return 'rgba(255, 68, 85, 0.7)'
                if (status === 'running') return 'rgba(0, 224, 160, 0.8)'
                return 'rgba(232, 236, 240, 0.8)'
              },
              'text-outline-color': '#0B0E11',
              'text-outline-width': 1.5,
              'overlay-opacity': 0,
              'z-index': 10,
              'border-width': (ele: any) => {
                const status = ele.data('metadata').status
                if (status === 'expired' || status === 'failed') return 0
                if (status === 'running') return 1.5
                return 0
              },
              'border-color': (ele: any) => {
                const status = ele.data('metadata').status
                if (status === 'running') return 'rgba(0, 212, 255, 0.6)'
                return 'transparent'
              },
              'border-opacity': 1,
              'opacity': (ele: any) => {
                const status = ele.data('metadata').status
                if (status === 'expired' || status === 'failed') return 0.7
                return 1
              },
              // Glow/shadow
              'shadow-blur': (ele: any) => {
                const status = ele.data('metadata').status
                if (status === 'success') return 15
                if (status === 'running') return 20
                if (status === 'expired' || status === 'failed') return 15
                return 5
              },
              'shadow-color': (ele: any) => {
                const md = ele.data('metadata')
                const status = md.status
                if (status === 'success') {
                  if (md.delivered === 'no') return 'rgba(255, 122, 76, 0.7)' // explosion warm
                  if (md.projectStatus === 'active') return 'rgba(0, 255, 136, 0.5)'
                  if (md.projectStatus === 'dead') return 'rgba(255, 68, 85, 0.5)'
                  if (md.projectStatus === 'dormant') return 'rgba(232, 168, 56, 0.5)'
                  return 'rgba(255, 140, 0, 0.5)' // orange default
                }
                if (status === 'running') return 'rgba(0, 212, 255, 0.6)'
                if (status === 'expired' || status === 'failed') return 'rgba(255, 68, 85, 0.6)'
                return 'rgba(85, 102, 119, 0.2)'
              },
              'shadow-offset-x': 0,
              'shadow-offset-y': 0,
              'shadow-opacity': 0.8,
            }
          },
          // Recipient nodes — orange diamonds, bigger and visible
          {
            selector: 'node[type="recipient"]',
            style: {
              'background-color': '#FF8C00',
              'background-opacity': 0.7,
              'label': '',
              'width': 10,
              'height': 10,
              'shape': 'diamond',
              'border-width': 1,
              'border-color': '#FF8C00',
              'border-opacity': 0.5,
              'overlay-opacity': 0,
              'opacity': 0.7,
            }
          },
          // Entity nodes — yellow hexagons
          {
            selector: 'node[type="entity"]',
            style: {
              'background-color': '#FFD700',
              'background-opacity': 0.9,
              'label': 'data(label)',
              'width': (ele: any) => Math.max(40, ele.data('metadata').campaigns * 15),
              'height': (ele: any) => Math.max(40, ele.data('metadata').campaigns * 15),
              'shape': 'hexagon',
              'font-size': '14px',
              'font-weight': 'bold',
              'text-valign': 'center',
              'text-halign': 'center',
              'color': '#0B0E11',
              'text-outline-color': 'rgba(255, 215, 0, 0.3)',
              'text-outline-width': 2,
              'overlay-opacity': 0,
              'shadow-blur': 12,
              'shadow-color': 'rgba(255, 215, 0, 0.4)',
              'shadow-offset-x': 0,
              'shadow-offset-y': 0,
              'shadow-opacity': 0.8,
            }
          },
          // Project nodes — space stations
          // Small (1-2 campaigns) = ISS-style; Large (3+) = Starbase
          {
            selector: 'node[type="project"]',
            style: {
              'background-color': 'rgba(0, 0, 0, 0)',
              'background-opacity': 0,
              'background-image': '/iss-station.svg',
              'background-fit': 'contain',
              'background-clip': 'none',
              'label': 'data(label)',
              'shape': 'rectangle',
              'font-size': '12px',
              'font-weight': 'bold',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 6,
              'color': '#00FF88',
              'text-outline-color': '#0A0A0C',
              'text-outline-width': 2,
              'border-width': 0,
              'overlay-opacity': 0,
              'shadow-blur': 18,
              'shadow-color': '#00FF88',
              'shadow-offset-x': 0,
              'shadow-offset-y': 0,
              'shadow-opacity': 0.6,
            } as any
          },
          // Small (ISS) station: 1-2 campaigns
          {
            selector: 'node[type="project"][stationSize="small"]',
            style: {
              'background-image': '/iss-station.svg',
              'width': 70,
              'height': 46,
            } as any
          },
          // Large (Side Colony) station: 3+ campaigns — 160:100 aspect (Gundam side colony)
          {
            selector: 'node[type="project"][stationSize="large"]',
            style: {
              'background-image': '/starbase.svg',
              'width': (ele: any) => {
                const count = ele.data('metadata')?.campaignCount || 3
                return Math.min(180, 100 + count * 6)
              },
              'height': (ele: any) => {
                const count = ele.data('metadata')?.campaignCount || 3
                return Math.min(112, 64 + count * 3.5)
              },
            } as any
          },
          // Dormant project stations — amber variant
          {
            selector: 'node[type="project"][stationSize="small"][status="dormant"], node[type="project"][stationSize="small"][status="unknown"]',
            style: {
              'background-image': '/iss-station-dormant.svg',
              'color': '#E8A838',
              'shadow-color': '#E8A838',
              'shadow-opacity': 0.5,
            } as any
          },
          {
            selector: 'node[type="project"][stationSize="large"][status="dormant"], node[type="project"][stationSize="large"][status="unknown"]',
            style: {
              'background-image': '/starbase-dormant.svg',
              'color': '#E8A838',
              'shadow-color': '#E8A838',
              'shadow-opacity': 0.5,
            } as any
          },
          // Dead project stations — explosion / debris variant
          {
            selector: 'node[type="project"][stationSize="small"][status="dead"]',
            style: {
              'background-image': '/iss-station-dead.svg',
              'color': '#FF4455',
              'shadow-color': '#FF4455',
              'shadow-opacity': 0.4,
            } as any
          },
          {
            selector: 'node[type="project"][stationSize="large"][status="dead"]',
            style: {
              'background-image': '/starbase-dead.svg',
              'color': '#FF4455',
              'shadow-color': '#FF4455',
              'shadow-opacity': 0.4,
            } as any
          },
          // Project-member edges — thin cyan strands from project to its campaigns
          {
            selector: 'edge[type="project-member"]',
            style: {
              'width': 1.5,
              'line-color': 'rgba(0, 212, 255, 0.35)',
              'curve-style': 'bezier',
              'opacity': 0.6,
            }
          },
          // Shared-address edges — orange, 2px wide
          {
            selector: 'edge[type="shared-address"]',
            style: {
              'width': 2,
              'line-color': '#FF8C00',
              'curve-style': 'bezier',
              'opacity': 0.4,
            }
          },
          // Cross-continent shared-address edges — brighter
          {
            selector: 'edge[type="shared-address"][crossContinent="yes"]',
            style: {
              'width': 3,
              'line-color': '#FF8C00',
              'opacity': 0.7,
            }
          },
          // Received edges (campaign → recipient) — subtle orange
          {
            selector: 'edge[type="received"]',
            style: {
              'width': 1,
              'line-color': 'rgba(255, 140, 0, 0.2)',
              'target-arrow-shape': 'none',
              'curve-style': 'bezier',
              'opacity': 0.3,
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

      // Expose cy for E2E tests / debugging in dev only.
      if (typeof window !== 'undefined') {
        ;(window as unknown as { __cy?: unknown }).__cy = cy
      }

      // Click: select, highlight connections, smoothly zoom to node
      cy.on('tap', 'node', (evt: any) => {
        const node = evt.target
        if (node.data('type') === 'continent-label') return
        onNodeClick?.(node.id(), node.data())

        // Dim all, brighten connected
        cy.elements().forEach((ele: any) => {
          ele.style('opacity', 0.6)
        })
        cy.nodes('[type="continent-label"]').forEach((ele: any) => {
          ele.style('opacity', 1)
        })
        node.style('opacity', 1)
        node.connectedEdges().forEach((edge: any) => {
          edge.style('opacity', 1)
          const edgeType = edge.data('type')
          if (edgeType === 'project-member') {
            edge.style('line-color', '#00D4FF')
            edge.style('width', 3)
          } else if (edgeType === 'shared-address') {
            edge.style('line-color', '#FF8C00')
            edge.style('width', 4)
          } else {
            edge.style('line-color', '#4ECDC4')
            edge.style('width', 3)
          }
          edge.connectedNodes().style('opacity', 1)
        })

        // Auto-zoom: project nodes fit their full neighborhood (campaigns +
        // recipients) so the user sees the cluster. Campaign / recipient nodes
        // zoom to a fixed legible level centered on the node — high enough
        // that the campaign label, neighbors' labels, and any project station
        // nearby are readable.
        const nodeType = node.data('type')
        if (nodeType === 'project') {
          const neighborhood = node.closedNeighborhood()
          cy.animate({
            fit: { eles: neighborhood, padding: 80 },
            duration: 600,
            easing: 'ease-out-cubic' as any,
          })
        } else {
          cy.animate({
            zoom: 2,
            center: { eles: node },
            duration: 500,
            easing: 'ease-out-cubic' as any,
          })
        }
      })

      // Click on edge: highlight + log relationship type
      cy.on('tap', 'edge', (evt: any) => {
        const edge = evt.target
        const data = edge.data()
        const sourceNode = cy.getElementById(data.source)
        const targetNode = cy.getElementById(data.target)

        const relationshipLabels: Record<string, string> = {
          'project-member': 'Project membership',
          'shared-address': 'Shared recipient address',
          'received': 'Funds received',
        }
        const label = relationshipLabels[data.type] || data.type

        onNodeClick?.('edge:' + data.id, {
          type: 'edge',
          label: label,
          metadata: {
            edgeType: data.type,
            sourceLabel: sourceNode.data('label'),
            sourceType: sourceNode.data('type'),
            targetLabel: targetNode.data('label'),
            targetType: targetNode.data('type'),
            weight: data.weight,
          }
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

      // Hover: show full label (untruncated for campaigns, label for others)
      cy.on('mouseover', 'node', (evt: any) => {
        const node = evt.target
        if (node.data('type') === 'continent-label') return
        node.style('label', node.data('label'))
        // Brighten recipients on hover
        if (node.data('type') === 'recipient') {
          node.style('opacity', 1)
          node.style('width', 14)
          node.style('height', 14)
        }
      })
      cy.on('mouseout', 'node', (evt: any) => {
        const node = evt.target
        if (node.data('type') === 'continent-label') return
        // Campaigns: restore truncated label; others: hide
        if (node.data('type') === 'campaign') {
          node.removeStyle('label')
        } else {
          node.style('label', '')
        }
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

      // Draw faint orbit rings on the canvas underlay
      const layer = cy.cyCanvas({ zIndex: 1 })
      const canvas = layer.getCanvas()
      const ctx = canvas.getContext('2d')

      cy.on('render cyCanvas.resize', () => {
        layer.resetTransform(ctx)
        layer.clear(ctx)
        layer.setTransform(ctx)

        ctx.strokeStyle = 'rgba(255, 220, 50, 0.3)'
        ctx.lineWidth = 1.0
        ctx.setLineDash([10, 8])

        for (const ring of orbitRings) {
          ctx.beginPath()
          ctx.arc(ring.cx, ring.cy, ring.radius, 0, Math.PI * 2)
          ctx.stroke()
        }

        ctx.setLineDash([]) // reset dash pattern
      })

      cyRef.current = cy
      // Expose for debugging
      if (typeof window !== 'undefined') (window as any)._cy = cy
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
