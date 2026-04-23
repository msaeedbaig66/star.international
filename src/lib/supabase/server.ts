import '@/lib/env'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

type SessionCookieMode = 'persistent' | 'session'

interface CreateClientOptions {
  sessionCookieMode?: SessionCookieMode
}

export async function createClient(options: CreateClientOptions = {}) {
  const cookieStore = cookies()
  const sessionCookieMode = options.sessionCookieMode ?? 'persistent'

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              if (sessionCookieMode === 'session') {
                const { maxAge, expires, ...sessionOptions } = options ?? {}
                void maxAge
                void expires
                cookieStore.set(name, value, sessionOptions)
                return
              }

              cookieStore.set(name, value, options)
            } catch {}
          })
        },
      },
    }
  )
}

export async function createAdminClient() {
  return createAdmin<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
