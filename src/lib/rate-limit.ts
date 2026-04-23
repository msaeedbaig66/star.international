import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis/cloudflare'

export interface RateLimitResult {
 success: boolean
 limit: number
 remaining: number
 reset: number
}

interface LocalRateLimitEntry {
 count: number
 resetAt: number
}

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

const redis = upstashUrl && upstashToken
 ? new Redis({
 url: upstashUrl,
 token: upstashToken,
 })
 : null

const upstashLimiterCache = new Map<string, Ratelimit>()
const localRateLimitStore = new Map<string, LocalRateLimitEntry>()

// Prevent memory leak by occasionally clearing expired entries
let lastCleanup = Date.now()
function cleanupLocalStore() {
 const now = Date.now()
 if (now - lastCleanup < 60_000) return // Cleanup once per minute at most

 localRateLimitStore.forEach((entry, key) => {
 if (entry.resetAt <= now) {
 localRateLimitStore.delete(key)
 }
 })

 // Hard cap to prevent runaway memory if many active users
 if (localRateLimitStore.size > 10000) {
 localRateLimitStore.clear()
 }

 lastCleanup = now
}

function normalizeWindow(windowMs: number): `${number} s` {
 const seconds = Math.max(1, Math.floor(windowMs / 1000))
 return `${seconds} s`
}

function getLimiter(bucket: string, limit: number, windowMs: number): Ratelimit | null {
 if (!redis) return null

 const cacheKey = `${bucket}:${limit}:${windowMs}`
 const existing = upstashLimiterCache.get(cacheKey)
 if (existing) return existing

 const limiter = new Ratelimit({
 redis,
 limiter: Ratelimit.slidingWindow(limit, normalizeWindow(windowMs)),
 analytics: true,
 prefix: `allpanga:rl:${bucket}`,
 })

 upstashLimiterCache.set(cacheKey, limiter)
 return limiter
}

function applyLocalRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
 cleanupLocalStore()
 const now = Date.now()
 const existing = localRateLimitStore.get(key)

 if (!existing || existing.resetAt <= now) {
 const resetAt = now + windowMs
 localRateLimitStore.set(key, { count: 1, resetAt })
 return {
 success: true,
 limit,
 remaining: Math.max(0, limit - 1),
 reset: Math.ceil(resetAt / 1000),
 }
 }

 if (existing.count >= limit) {
 return {
 success: false,
 limit,
 remaining: 0,
 reset: Math.ceil(existing.resetAt / 1000),
 }
 }

 existing.count += 1
 localRateLimitStore.set(key, existing)

 return {
 success: true,
 limit,
 remaining: Math.max(0, limit - existing.count),
 reset: Math.ceil(existing.resetAt / 1000),
 }
}

export async function checkRateLimit(
 key: string,
 limit: number,
 windowMs: number,
 bucket = 'default'
): Promise<RateLimitResult> {
 const limiter = getLimiter(bucket, limit, windowMs)
 if (!limiter) {
 return applyLocalRateLimit(key, limit, windowMs)
 }

 const result = await limiter.limit(key)
 return {
 success: result.success,
 limit: result.limit,
 remaining: result.remaining,
 reset: result.reset,
 }
}
