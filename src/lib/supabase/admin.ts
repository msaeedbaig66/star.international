import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { createClient as createServerClient } from './server'

export function createAdminClient() {
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL
 const key = process.env.SUPABASE_SERVICE_ROLE_KEY
 
 if (!url || !key) {
 if (process.env.NODE_ENV === 'development') {
 console.warn('createAdminClient: SUPABASE_SERVICE_ROLE_KEY is missing. Admin features will be restricted.')
 }
 // Return a dummy client or throw? We need it to be non-null for TS.
 // Instead of throwing immediately (which crashes build/pages if called at top-level),
 // throwing at runtime is safer. Let's just throw for now.
 throw new Error('createAdminClient: Missing SUPABASE_SERVICE_ROLE_KEY')
 }
 
 return createClient<Database>(url, key)
}

/**
 * Creates an admin client only after verifying the current user is an admin.
 * Use this in API routes and server actions to prevent unauthorized service-role access.
 */
export async function getAuthorizedAdminClient() {
 const supabase = await createServerClient()
 const { data: { user }, error: authError } = await supabase.auth.getUser()
 
 if (authError || !user) {
 throw new Error('Unauthorized')
 }

 const { data: profile, error: dbError } = await supabase
 .from('profiles')
 .select('role')
 .eq('id', user.id)
 .single()

 if (dbError || profile?.role !== 'admin') {
 throw new Error('Access denied: Admin role required')
 }

 const adminClient = createAdminClient()

 return adminClient
}
