import '@/lib/env'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkRateLimit, type RateLimitResult } from '@/lib/rate-limit'

interface ApiRatePolicy {
  bucket: string
  limit: number
  windowMs: number
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

function buildContentSecurityPolicy(nonce?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  let supabaseOrigin = ''
  let supabaseWebsocketOrigin = ''

  if (supabaseUrl) {
    try {
      const parsed = new URL(supabaseUrl)
      supabaseOrigin = parsed.origin
      supabaseWebsocketOrigin = parsed.origin.replace(/^http/i, 'ws')
    } catch {}
  }

  const scriptSrc = [`'self'`, 'https://cdn.jsdelivr.net']
  if (nonce) {
    scriptSrc.push(`'nonce-${nonce}'`)
  }
  if (!IS_PRODUCTION) {
    scriptSrc.push(`'unsafe-eval'`)
  }

  const connectSrc = [`'self'`]
  if (supabaseOrigin) connectSrc.push(supabaseOrigin)
  if (supabaseWebsocketOrigin) connectSrc.push(supabaseWebsocketOrigin)
  connectSrc.push('https://*.supabase.co', 'wss://*.supabase.co', 'https://*.sentry.io')

  const directives = [
    `default-src 'self'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `script-src ${scriptSrc.join(' ')} https://vercel.live https://*.vercel.live`,
    `script-src-attr 'none'`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co https://lh3.googleusercontent.com https://images.unsplash.com https://api.dicebear.com https://i.pravatar.cc https://*.google.com`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `connect-src ${connectSrc.join(' ')} https://*.vercel.live https://vercel.live`,
    `frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.google.com https://vercel.live https://*.vercel.live`,
    `media-src 'self' blob: https://res.cloudinary.com https://*.supabase.co`,
    `worker-src 'self' blob:`,
  ]

  if (IS_PRODUCTION) {
    directives.push('upgrade-insecure-requests')
  }

  return directives.join('; ')
}

function applySecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set('Content-Security-Policy', buildContentSecurityPolicy(nonce))
  response.headers.set('x-nonce', nonce)
  
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
  )

  if (IS_PRODUCTION) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  return response
}

function buildRequestHeadersWithNonce(request: NextRequest, nonce: string) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  return requestHeaders
}

function getRequesterIp(request: NextRequest): string {
  if (request.ip) return request.ip

  const providerHeaders = ['cf-connecting-ip', 'x-vercel-forwarded-for', 'fly-client-ip']
  for (const header of providerHeaders) {
    const value = request.headers.get(header)?.split(',')[0]?.trim()
    if (value) return value
  }

  const hasTrustedProxySignal = Boolean(
    request.headers.get('x-vercel-id') ||
    request.headers.get('cf-ray') ||
    request.headers.get('fly-request-id')
  )

  if (hasTrustedProxySignal) {
    const forwardedFor = request.headers.get('x-forwarded-for')
    if (forwardedFor) {
      const first = forwardedFor.split(',')[0]?.trim()
      if (first) return first
    }
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp

  return 'unknown'
}

function resolveApiRatePolicy(request: NextRequest): ApiRatePolicy {
  const { pathname } = request.nextUrl
  const method = request.method
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase()

  // Layer 1: Block known scraping signatures and bad bots
  const isBot = /python-requests|axios|node-fetch|got|postman|insomnia|curl|wget|java|go-http|http-client|spider|crawl|scraper/i.test(userAgent)
  const multiplier = isBot ? 5 : 1 // 5x stricter for suspicious agents

  if (pathname.startsWith('/api/auth/signup')) {
    return { bucket: 'auth-signup', limit: 4, windowMs: 60_000 }
  }
  if (pathname.startsWith('/api/auth/login')) {
    return { bucket: 'auth-login', limit: 8, windowMs: 60_000 }
  }
  if (pathname.startsWith('/api/auth/magic-link') || pathname.startsWith('/api/auth/resend')) {
    return { bucket: 'auth-email-flow', limit: 5, windowMs: 60_000 }
  }
  if (pathname.startsWith('/api/upload')) {
    return { bucket: 'upload', limit: 6, windowMs: 60_000 } 
  }
  if (pathname.startsWith('/api/listings') && method === 'POST') {
    return { bucket: 'listing-create', limit: 3, windowMs: 60_000 } // Stricter create limit
  }
  if (pathname.startsWith('/api/contact')) {
    return { bucket: 'contact', limit: 3, windowMs: 60_000 }
  }
  if (pathname.startsWith('/api/search')) {
    return { bucket: 'search', limit: 10 / multiplier, windowMs: 60_000 } // Bots get only 2 searches/min
  }
  if (
    pathname.startsWith('/api/messages') ||
    pathname.startsWith('/api/comments') ||
    pathname.startsWith('/api/reports') ||
    pathname.includes('/follow') ||
    pathname.includes('/block')
  ) {
    return { bucket: 'api-write', limit: 10 / multiplier, windowMs: 60_000 } // Bots get only 2 writes/min
  }
  return { bucket: 'api-default', limit: 40 / multiplier, windowMs: 60_000 } // Default limit lowered to 40
}

function addRateLimitHeaders(response: NextResponse, result: RateLimitResult) {
  response.headers.set('X-RateLimit-Limit', String(result.limit))
  response.headers.set('X-RateLimit-Remaining', String(result.remaining))
  response.headers.set('X-RateLimit-Reset', String(result.reset))
}

const PROTECTED_PREFIXES = ['/dashboard', '/admin']
const PUBLIC_PATHS = ['/', '/marketplace', '/blogs', '/communities', '/about', '/search',
  '/login', '/signup', '/forgot-password', '/faq', '/contact', '/how-it-works',
  '/privacy', '/terms', '/guidelines', '/selling-guidelines', '/verify-email', '/onboarding']

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || (p !== '/' && pathname.startsWith(p + '/')))
  || pathname.startsWith('/profile/')
  || pathname.startsWith('/marketplace/')
  || pathname.startsWith('/blogs/')
  || pathname.startsWith('/communities/')
}

function getSupabaseAuthCookieName() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return 'sb-auth-token'
  try {
    const projectRef = new URL(url).hostname.split('.')[0]
    return `sb-${projectRef}-auth-token`
  } catch {
    return 'sb-auth-token'
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const nonce = btoa(crypto.randomUUID())
  const requestHeadersWithNonce = buildRequestHeadersWithNonce(request, nonce)

  if (pathname.startsWith('/api/')) {
    const policy = resolveApiRatePolicy(request)
    const requesterIp = getRequesterIp(request)
    const key = `${policy.bucket}:${requesterIp}`

    try {
      const rateResult = await checkRateLimit(key, policy.limit, policy.windowMs, policy.bucket)

      if (!rateResult.success) {
        const retryAfter = Math.max(1, rateResult.reset - Math.floor(Date.now() / 1000))
        const blocked = NextResponse.json(
          { error: 'Too many requests. Please try again in 1 minute.' },
          { status: 429 }
        )
        addRateLimitHeaders(blocked, rateResult)
        blocked.headers.set('Retry-After', String(retryAfter))
        return applySecurityHeaders(blocked, nonce)
      }

      const allowed = NextResponse.next({ request: { headers: requestHeadersWithNonce } })
      addRateLimitHeaders(allowed, rateResult)
      return applySecurityHeaders(allowed, nonce)
    } catch (error) {
      console.error('Rate limit middleware error:', error)
      return applySecurityHeaders(
        NextResponse.next({ request: { headers: requestHeadersWithNonce } }),
        nonce
      )
    }
  }

  if (isPublicRoute(pathname) && !isProtectedRoute(pathname)) {
    let supabaseResponse = NextResponse.next({ request: { headers: requestHeadersWithNonce } })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request: { headers: requestHeadersWithNonce } })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const cookieName = getSupabaseAuthCookieName()
    const hasSession = request.cookies.has(cookieName) || request.cookies.getAll().some(c => c.name.includes('auth-token'))
    if (hasSession) {
      await supabase.auth.getUser()
    }

    return applySecurityHeaders(supabaseResponse, nonce)
  }

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeadersWithNonce } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: requestHeadersWithNonce } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (isProtectedRoute(pathname) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return applySecurityHeaders(NextResponse.redirect(url), nonce)
  }

  if (user && !user.email_confirmed_at && pathname !== '/verify-email' && !pathname.startsWith('/auth/callback') && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/verify-email'
    return applySecurityHeaders(NextResponse.redirect(url), nonce)
  }

  return applySecurityHeaders(supabaseResponse, nonce)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)'],
}
