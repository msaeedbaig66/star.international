type CacheEntry<T> = {
 data: T
 expiry: number
}

/**
 * Production-grade hybrid cache service.
 * Automatically uses Upstash Redis if environment variables are present,
 * otherwise falls back to a lightweight in-memory Map for the current instance.
 */
const cache = new Map<string, CacheEntry<any>>()

let _redisClient: any = null
let _redisInitAttempted = false

async function getRedisClient() {
 if (typeof window !== 'undefined') return null
 if (_redisInitAttempted) return _redisClient

 const url = process.env.UPSTASH_REDIS_REST_URL
 const token = process.env.UPSTASH_REDIS_REST_TOKEN
 
 _redisInitAttempted = true
 if (!url || !token) return null
 
 try {
 const { Redis } = await import('@upstash/redis')
 _redisClient = new Redis({ url, token })
 return _redisClient
 } catch (e) {
 console.error('Redis Init Error:', e)
 return null
 }
}

export const cacheService = {
 async get<T>(key: string): Promise<T | null> {
 const redis = await getRedisClient()
 if (redis) {
 try {
 return (await redis.get(key)) as T
 } catch (e) {
 console.error('Redis Get Error:', e)
 }
 }

 // Fallback to memory
 const entry = cache.get(key)
 if (!entry) return null
 if (Date.now() > entry.expiry) {
 cache.delete(key)
 return null
 }
 return entry.data as T
 },

 async set<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
 const redis = await getRedisClient()
 if (redis) {
 try {
 await redis.set(key, data, { ex: ttlSeconds })
 return
 } catch (e) {
 console.error('Redis Set Error:', e)
 }
 }

 // Fallback to memory
 cache.set(key, {
 data,
 expiry: Date.now() + ttlSeconds * 1000,
 })
 },

 async delete(key: string): Promise<void> {
 const redis = await getRedisClient()
 if (redis) {
 try {
 await redis.del(key)
 } catch (e) {
 console.error('Redis Del Error:', e)
 }
 }
 cache.delete(key)
 },

 async deleteByPattern(pattern: string): Promise<void> {
 const redis = await getRedisClient()
 if (redis) {
 try {
 const keys = await redis.keys(pattern)
 if (keys.length > 0) await redis.del(...keys)
 } catch (e) {
 console.error('Redis Pattern Del Error:', e)
 }
 }

 const regex = new RegExp(pattern.replace('*', '.*'))
 const keys = Array.from(cache.keys())
 for (const key of keys) {
 if (regex.test(key)) {
 cache.delete(key)
 }
 }
 },
}
