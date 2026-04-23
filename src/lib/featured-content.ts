type FeatureEntity = {
 is_featured?: boolean | null
 featured_until?: string | null
}

export function isFeaturedActive(entity?: FeatureEntity | null): boolean {
 if (!entity?.is_featured) return false
 if (!entity.featured_until) return true

 const until = Date.parse(entity.featured_until)
 return Number.isFinite(until) && until > Date.now()
}

export function sortFeaturedFirst<T extends FeatureEntity>(items: T[]): T[] {
 return [...items].sort((a, b) => {
 const aFeatured = isFeaturedActive(a) ? 1 : 0
 const bFeatured = isFeaturedActive(b) ? 1 : 0
 return bFeatured - aFeatured
 })
}
