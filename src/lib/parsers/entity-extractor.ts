import type { Campaign } from '@/types/campaign'

// Known entities in the BCH ecosystem (actual teams/contributors, NOT platforms)
const KNOWN_ENTITIES: Record<string, string[]> = {
  'BCHN': ['bchn', 'bitcoin cash node'],
  'Electron Cash': ['electron cash', 'electroncash'],
  'General Protocols': ['general protocols', 'generalprotocols'],
  'Bitcoin Verde': ['verde', 'bitcoin verde'],
  'Knuth': ['knuth'],
  'BCHD': ['bchd'],
  'Bitcoin ABC': ['abc', 'bitcoin abc'],
  'Imaginary': ['imaginary', 'imaginary.cash'],
  'Bitcoin Cash Podcast': ['bitcoin cash podcast', 'bch podcast'],
  'read.cash': ['read.cash', 'readcash'],
  'Cashual Wallet': ['cashual'],
  'Neutrino': ['neutrino'],
}

/**
 * Extract entity names from campaign data
 * Examples:
 *   "BCHN 2020" → ["BCHN"]
 *   "Electron Cash Development" → ["Electron Cash"]
 *   "imaginary.cash - Development" → ["Imaginary"]
 */
export function extractEntities(campaign: Partial<Campaign>): string[] {
  const entities: Set<string> = new Set()
  const text = `${campaign.title || ''} ${campaign.description || ''} ${campaign.url || ''}`.toLowerCase()

  // Check against known entities
  Object.entries(KNOWN_ENTITIES).forEach(([canonical, aliases]) => {
    const allNames = [canonical.toLowerCase(), ...aliases]

    if (allNames.some(name => text.includes(name))) {
      entities.add(canonical)
    }
  })

  // Extract from URL subdomain ONLY if it matches KNOWN_ENTITIES
  // Don't auto-create entities - we'll build them from blockchain addresses later
  if (campaign.url) {
    const urlMatch = campaign.url.match(/([a-z0-9-]+)\.(flipstarter|fundme)/)
    if (urlMatch) {
      const subdomain = urlMatch[1]

      // Skip platform names and generic subdomains
      const skipSubdomains = ['flipstarter', 'fundme', 'www', 'api', 'fund']
      if (skipSubdomains.includes(subdomain)) {
        return Array.from(entities)
      }

      // ONLY add if it matches a KNOWN_ENTITY (no auto-creation!)
      for (const [canonical, aliases] of Object.entries(KNOWN_ENTITIES)) {
        if (aliases.includes(subdomain) || canonical.toLowerCase() === subdomain) {
          entities.add(canonical)
          break
        }
      }

      // DO NOT create entities for unknown subdomains
      // We'll build real contributor nodes from blockchain addresses instead
    }
  }

  return Array.from(entities)
}

/**
 * Fuzzy match entity names
 * Returns true if names likely refer to same entity
 */
export function matchEntities(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().trim()
  const n2 = name2.toLowerCase().trim()

  // Exact match
  if (n1 === n2) return true

  // Check if one is contained in the other
  if (n1.includes(n2) || n2.includes(n1)) return true

  // Acronym match (BCHN === Bitcoin Cash Node)
  const acronym1 = name1.split(' ').map(w => w[0]).join('').toLowerCase()
  const acronym2 = name2.split(' ').map(w => w[0]).join('').toLowerCase()

  if (acronym1 === n2 || acronym2 === n1) return true

  // Check against known aliases
  for (const [canonical, aliases] of Object.entries(KNOWN_ENTITIES)) {
    const allNames = [canonical.toLowerCase(), ...aliases]
    if (allNames.includes(n1) && allNames.includes(n2)) {
      return true
    }
  }

  return false
}

/**
 * Get canonical entity name (standardized version)
 */
export function getCanonicalName(entityName: string): string {
  const lower = entityName.toLowerCase()

  for (const [canonical, aliases] of Object.entries(KNOWN_ENTITIES)) {
    if (canonical.toLowerCase() === lower || aliases.includes(lower)) {
      return canonical
    }
  }

  return entityName
}
