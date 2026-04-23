export type SearchType = 'all' | 'items' | 'blogs' | 'communities' | 'users'

export interface SearchOperators {
  campus?: string
  category?: string
  field?: string
  minPrice?: number
  maxPrice?: number
}

export interface ParsedSearchQuery {
  rawQuery: string
  cleanQuery: string
  tokens: string[]
  resolvedType: SearchType
  operators: SearchOperators
}

interface QueryField {
  value?: string | null
  weight: number
}

const TYPE_ALIASES: Record<SearchType, string[]> = {
  all: ['all'],
  items: ['item', 'items', 'listing', 'listings', 'market', 'marketplace'],
  blogs: ['blog', 'blogs', 'article', 'articles', 'post', 'posts'],
  communities: ['community', 'communities', 'group', 'groups', 'forum', 'forums'],
  users: ['user', 'users', 'profile', 'profiles', 'person', 'people', 'student', 'students'],
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9@#\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenizeText(value: string): string[] {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1)
}

function resolveTypeFromAlias(raw: string | null | undefined): SearchType | null {
  if (!raw) return null
  const key = normalizeText(raw).replace(':', '')
  for (const [type, aliases] of Object.entries(TYPE_ALIASES) as Array<[SearchType, string[]]>) {
    if (aliases.includes(key)) return type
  }
  return null
}

function parseNumericOperator(value: string): number | undefined {
  const cleaned = value.replace(/[^0-9.]/g, '')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function toSafeLikeTerm(value: string): string {
  return value.replace(/[,%_().]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function buildSearchOrFilter(fields: string[], terms: string[]): string {
  const uniqueTerms = Array.from(new Set(terms.map(toSafeLikeTerm).filter(Boolean))).slice(0, 6)
  const clauses: string[] = []
  for (const term of uniqueTerms) {
    for (const field of fields) {
      clauses.push(`${field}.ilike.%${term}%`)
    }
  }
  return clauses.join(',')
}

export function parseSearchQuery(rawQuery: string, rawType: string | undefined): ParsedSearchQuery {
  const baseQuery = String(rawQuery || '').trim()
  const operators: SearchOperators = {}
  const explicitType = resolveTypeFromAlias(rawType) || 'all'
  let inferredType: SearchType | null = null

  const chunks = baseQuery.match(/"([^"]+)"|(\S+)/g) || []
  const freeTextTokens: string[] = []

  for (const token of chunks) {
    const cleanedToken = token.replace(/^"|"$/g, '').trim()
    const [keyRaw, ...rest] = cleanedToken.split(':')
    if (rest.length > 0) {
      const key = normalizeText(keyRaw)
      const value = rest.join(':').trim()
      if (!value) continue
      if (key === 'type' || key === 'in') {
        const typed = resolveTypeFromAlias(value)
        if (typed) inferredType = typed
        continue
      }
      if (key === 'campus') {
        operators.campus = value
        continue
      }
      if (key === 'category' || key === 'cat') {
        operators.category = value
        continue
      }
      if (key === 'field') {
        operators.field = value
        continue
      }
      if (key === 'min' || key === 'minprice') {
        operators.minPrice = parseNumericOperator(value)
        continue
      }
      if (key === 'max' || key === 'maxprice') {
        operators.maxPrice = parseNumericOperator(value)
        continue
      }
    }

    if (cleanedToken.startsWith('@') && cleanedToken.length > 1) {
      freeTextTokens.push(cleanedToken.slice(1))
      if (!inferredType) inferredType = 'users'
      continue
    }

    if (cleanedToken.startsWith('#') && cleanedToken.length > 1) {
      freeTextTokens.push(cleanedToken.slice(1))
      if (!inferredType) inferredType = 'blogs'
      continue
    }

    freeTextTokens.push(cleanedToken)
  }

  const cleanQuery = freeTextTokens.join(' ').trim()
  const tokens = tokenizeText(cleanQuery).slice(0, 8)

  const resolvedType =
    explicitType !== 'all'
      ? explicitType
      : inferredType || 'all'

  // If user typed @username, ensure we prioritize the username search
  if (baseQuery.startsWith('@') && baseQuery.length > 1) {
    const handle = baseQuery.slice(1).toLowerCase()
    if (!tokens.includes(handle)) tokens.unshift(handle)
  }

  return {
    rawQuery: baseQuery,
    cleanQuery,
    tokens,
    resolvedType,
    operators,
  }
}

function wordPrefixMatch(text: string, token: string): boolean {
  return text.split(' ').some((word) => word.startsWith(token))
}

export function scoreSearchDocument({
  query,
  tokens,
  primary,
  fields,
  popularity = 0,
  createdAt,
}: {
  query: string
  tokens: string[]
  primary: string
  fields: QueryField[]
  popularity?: number
  createdAt?: string | null
}): number {
  const normalizedQuery = normalizeText(query)
  const normalizedPrimary = normalizeText(primary)
  const normalizedFields = fields.map((field) => ({
    weight: field.weight,
    text: normalizeText(String(field.value || '')),
  }))

  let score = 0

  // 1. Absolute Primary Matches (Exact username or full name)
  if (normalizedQuery) {
    if (normalizedPrimary === normalizedQuery) {
      score += 500 // Absolute match boost
    } else if (normalizedPrimary.startsWith(normalizedQuery)) {
      score += 200 // Prefix match boost
    } else if (normalizedPrimary.includes(normalizedQuery)) {
      score += 100 // Substring match boost
    }
  }

  // 2. Token Matching
  let matchedTokens = 0
  for (const token of tokens) {
    let tokenMatched = false
    
    // Check if whole token matches the primary name exactly
    if (normalizedPrimary === token) {
      score += 150
      tokenMatched = true
    }

    for (const field of normalizedFields) {
      if (!field.text) continue
      
      if (field.text === token) {
        score += field.weight * 2.5 // Exact word match in any field
        tokenMatched = true
        break
      }
      if (field.text.startsWith(token)) {
        score += field.weight * 1.5 // Word prefix match
        tokenMatched = true
        break
      }
      if (field.text.includes(token)) {
        score += field.weight
        tokenMatched = true
        break
      }
    }
    if (tokenMatched) matchedTokens += 1
  }

  // 3. Completeness Bonus
  if (tokens.length > 1 && matchedTokens === tokens.length) {
    score += 80 // bonus for matching all tokens
  } else if (matchedTokens > 0) {
    score += matchedTokens * 10
  }

  // 4. Popularity/Reputation Boost
  if (Number.isFinite(popularity) && popularity > 0) {
    score += Math.min(25, Math.log10(popularity + 1) * 10)
  }

  // 5. Freshness
  if (createdAt) {
    const createdMs = new Date(createdAt).getTime()
    if (Number.isFinite(createdMs)) {
      const daysOld = (Date.now() - createdMs) / 86_400_000
      if (daysOld <= 7) score += 20
      else if (daysOld <= 30) score += 10
      else if (daysOld <= 90) score += 5
    }
  }

  return Number(score.toFixed(3))
}

export function rankSearchResults<T>(
  items: T[],
  scorer: (item: T) => number
): T[] {
  return items
    .map((item) => ({ item, score: scorer(item) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item)
}
