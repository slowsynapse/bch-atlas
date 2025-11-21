import type { Campaign, Entity } from '@/types/campaign'
import { matchEntities, getCanonicalName } from '../parsers/entity-extractor'

export function buildEntityMap(campaigns: Campaign[]): Map<string, Entity> {
  const entityMap = new Map<string, Entity>()

  campaigns.forEach(campaign => {
    const entities = campaign.entities.map(getCanonicalName)

    entities.forEach(entityName => {
      // Find or create entity
      let entity = entityMap.get(entityName)

      if (!entity) {
        // Check if this is an alias of existing entity
        for (const [existingName, existingEntity] of entityMap) {
          if (matchEntities(entityName, existingName)) {
            entity = existingEntity
            if (!entity.aliases.includes(entityName)) {
              entity.aliases.push(entityName)
            }
            // Also add to map with this name for faster lookups
            entityMap.set(entityName, entity)
            break
          }
        }
      }

      if (!entity) {
        // Create new entity
        entity = {
          name: entityName,
          campaigns: [],
          totalBCH: 0,
          successRate: 0,
          aliases: []
        }
        entityMap.set(entityName, entity)
      }

      // Add campaign to entity (avoid duplicates)
      if (!entity.campaigns.includes(campaign.id)) {
        entity.campaigns.push(campaign.id)
        entity.totalBCH += campaign.amount
      }
    })
  })

  // Calculate success rates
  entityMap.forEach((entity, name) => {
    const successes = entity.campaigns.filter(id => {
      const campaign = campaigns.find(c => c.id === id)
      return campaign?.status === 'success'
    }).length

    entity.successRate = entity.campaigns.length > 0
      ? successes / entity.campaigns.length
      : 0
  })

  return entityMap
}

export function getEntityByCampaign(
  campaignId: string,
  entityMap: Map<string, Entity>
): Entity[] {
  const entities: Entity[] = []

  entityMap.forEach(entity => {
    if (entity.campaigns.includes(campaignId)) {
      entities.push(entity)
    }
  })

  return entities
}
