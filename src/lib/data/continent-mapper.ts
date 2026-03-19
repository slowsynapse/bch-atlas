import type { Campaign } from '@/types/campaign'

export type Continent = 'core' | 'middleware' | 'apps' | 'media' | 'defi' | 'charity' | 'ecosystem' | 'other'

const KEYWORD_MAP: Record<Continent, RegExp> = {
  core: /\b(bchn|bchd|verde|bitcoin verde|knuth|bitcoin abc|abc|bitcoin unlimited|bu|full.?node|node.?implementation|protocol.?upgrade|consensus|block.?size|mining|hashrate|chip-\d|specification)\b/i,
  middleware: /\b(mainnet\.?js|mainnet|libauth|bitcore|cashscript|bitauth|electrum.?protocol|sdk|rest\.?bitcoin|grpc|indexer|fulcrum|rostrum|chaingraph|developer.?tool|library|bitbox|slp-sdk|bch-js)\b/i,
  apps: /\b(wallet|electron.?cash|cashual|badger|zapit|flowee|selene|pos|point.?of.?sale|merchant.?tool|mobile.?app|browser.?extension|web.?app|payment.?gateway|cashaddress|memo\.cash|member|read\.cash)\b/i,
  media: /\b(podcast|video|tutorial|education|content|media|documentary|show|stream|article|blog|news|magazine|film|animation|music|creative|journalist|reporter|awareness|marketing|promotion)\b/i,
  defi: /\b(defi|swap|dex|contract|cashtokens?|nft|token|fungible|smartbch|sidechain|bridge|oracle|amm|cashstarter|fundme|crowdfunding.?platform|anyhedge|detoken)\b/i,
  charity: /\b(charity|donat|food|humanitarian|adoption|orphan|relief|school|health|eatbch|volunteer|aid|shelter|water|venezuela|south.?sudan|ghana|africa|community.?outreach|feeding)\b/i,
  ecosystem: /\b(accelerator|bch-?1|governance|dao|foundation|collective|hackathon|conference|bliss|meetup|summit|initiative|fund.?raising|ecosystem|general.?fund|bounty|grant)\b/i,
  other: /(?!)/,  // never matches — fallback only
}

const CATEGORY_TO_CONTINENT: Record<string, Continent> = {
  'infrastructure': 'core',
  'software': 'middleware',
  'license-mit': 'middleware',
  'license-gpl': 'middleware',
  'education': 'media',
  'charity': 'charity',
  'adoption': 'charity',
  'business': 'apps',
  'commerce': 'apps',
}

// Title-level overrides for known projects that categories alone can't resolve
const TITLE_OVERRIDES: [RegExp, Continent][] = [
  [/\b(bchn|bitcoin cash node|bchd|bitcoin verde|verde|knuth|bitcoin abc|bitcoin unlimited)\b/i, 'core'],
  [/\b(electron cash|cashual wallet|zapit|selene|badger)\b/i, 'apps'],
  [/\b(mainnet\.?js|libauth|cashscript|bitauth|bitbox)\b/i, 'middleware'],
  [/\b(eatbch|eat\s?bch)\b/i, 'charity'],
  [/\b(bch-?1|bliss|bitcoin cash city)\b/i, 'ecosystem'],
]

export function mapToContinent(campaign: Partial<Campaign>): Continent {
  const text = [campaign.title || '', (campaign.description || '').slice(0, 500)].join(' ')

  // First: title-level overrides for well-known projects
  for (const [regex, continent] of TITLE_OVERRIDES) {
    if (regex.test(campaign.title || '')) return continent
  }

  // Second: try mapping from existing category tags (Flipstarter)
  if (campaign.category && campaign.category.length > 0) {
    for (const cat of campaign.category) {
      const mapped = CATEGORY_TO_CONTINENT[cat.toLowerCase()]
      if (mapped) return mapped
    }
  }

  // Third: keyword matching on title + description
  // Order matters: more specific categories first
  const priority: Continent[] = ['core', 'charity', 'ecosystem', 'defi', 'middleware', 'apps', 'media']
  for (const continent of priority) {
    if (KEYWORD_MAP[continent].test(text)) {
      return continent
    }
  }

  return 'other'
}
