import type { Campaign } from '@/types/campaign'

export type Continent = 'infrastructure' | 'wallets' | 'media' | 'charity' | 'defi' | 'commerce' | 'other'

const KEYWORD_MAP: Partial<Record<Continent, RegExp>> = {
  infrastructure: /\b(node|protocol|network|upgrade|consensus|fork|specification|chip|infrastructure|server|mining|hashrate|bchn|bchd|verde|knuth|abc|full.?node)\b/i,
  wallets: /\b(wallet|tool|library|sdk|api|extension|app|browser|mobile|electron.?cash|badger|cashual|zapit|flowee|selene)\b/i,
  media: /\b(podcast|video|tutorial|education|content|media|documentary|show|stream|article|blog|news|magazine|film|animation|music|creative)\b/i,
  charity: /\b(charity|donat|food|humanitarian|adoption|community|orphan|relief|school|health|eatbch|volunteer|aid|shelter|water)\b/i,
  defi: /\b(defi|swap|dex|contract|cashscript|cashtokens?|nft|token|fungible|smartbch|sidechain|bridge|oracle|amm)\b/i,
  commerce: /\b(merchant|shop|store|payment|pos|commerce|business|marketplace|retail|vendor|trade|exchange)\b/i,
}

const CATEGORY_TO_CONTINENT: Record<string, Continent> = {
  'infrastructure': 'infrastructure',
  'software': 'infrastructure',
  'license-mit': 'infrastructure',
  'license-gpl': 'infrastructure',
  'education': 'media',
  'charity': 'charity',
  'adoption': 'charity',
  'business': 'commerce',
  'commerce': 'commerce',
}

export function mapToContinent(campaign: Partial<Campaign>): Continent {
  // First: try mapping from existing category tags (Flipstarter)
  if (campaign.category && campaign.category.length > 0) {
    for (const cat of campaign.category) {
      const mapped = CATEGORY_TO_CONTINENT[cat.toLowerCase()]
      if (mapped) return mapped
    }
  }

  // Second: keyword matching on title + description
  const text = [campaign.title || '', (campaign.description || '').slice(0, 500)].join(' ')

  // Check each continent's keywords, return first match
  // Order matters: more specific categories first
  const priority: Continent[] = ['defi', 'wallets', 'infrastructure', 'media', 'charity', 'commerce']
  for (const continent of priority) {
    if (KEYWORD_MAP[continent]?.test(text)) {
      return continent
    }
  }

  return 'other'
}
