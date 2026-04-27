import type { Campaign } from '@/types/campaign'
import projectsData from '../../../data/projects.json'
import type { Project } from '@/types/project'

// Derive KNOWN_ENTITIES from projects.json (lazy-loaded, cached)
let _knownEntities: Record<string, string[]> | null = null

function getKnownEntities(): Record<string, string[]> {
  if (_knownEntities) return _knownEntities

  _knownEntities = {}
  for (const project of projectsData as Project[]) {
    _knownEntities[project.name] = project.campaignMatchers
  }
  return _knownEntities
}

/**
 * Extract entity names from campaign data
 * Examples:
 *   "BCHN 2020" → ["Bitcoin Cash Node"]
 *   "Electron Cash Development" → ["Electron Cash"]
 *   "imaginary.cash - Development" → ["Imaginary"]
 */
export function extractEntities(campaign: Partial<Campaign>): string[] {
  const entities: Set<string> = new Set()
  // Match against title + short description only — URL has too many false positives
  // (every flipstarter URL contains "flipstarter")
  const text = `${campaign.title || ''} ${(campaign.description || '').slice(0, 300)}`.toLowerCase()
  const knownEntities = getKnownEntities()

  // Check against known entities
  Object.entries(knownEntities).forEach(([canonical, matchers]) => {
    const allNames = [canonical.toLowerCase(), ...matchers.map(m => m.toLowerCase())]

    if (allNames.some(name => text.includes(name))) {
      entities.add(canonical)
    }
  })

  // Extract from URL subdomain ONLY if it matches known entities
  if (campaign.url) {
    const urlMatch = campaign.url.match(/([a-z0-9-]+)\.(flipstarter|fundme)/)
    if (urlMatch) {
      const subdomain = urlMatch[1]

      const skipSubdomains = ['flipstarter', 'fundme', 'www', 'api', 'fund']
      if (skipSubdomains.includes(subdomain)) {
        return Array.from(entities)
      }

      for (const [canonical, matchers] of Object.entries(knownEntities)) {
        if (matchers.includes(subdomain) || canonical.toLowerCase() === subdomain) {
          entities.add(canonical)
          break
        }
      }
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

  if (n1 === n2) return true
  if (n1.includes(n2) || n2.includes(n1)) return true

  // Acronym match (BCHN === Bitcoin Cash Node)
  const acronym1 = name1.split(' ').map(w => w[0]).join('').toLowerCase()
  const acronym2 = name2.split(' ').map(w => w[0]).join('').toLowerCase()

  if (acronym1 === n2 || acronym2 === n1) return true

  // Check against known aliases
  const knownEntities = getKnownEntities()
  for (const [canonical, matchers] of Object.entries(knownEntities)) {
    const allNames = [canonical.toLowerCase(), ...matchers.map(m => m.toLowerCase())]
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
  const knownEntities = getKnownEntities()

  for (const [canonical, matchers] of Object.entries(knownEntities)) {
    if (canonical.toLowerCase() === lower || matchers.some(m => m.toLowerCase() === lower)) {
      return canonical
    }
  }

  return entityName
}
