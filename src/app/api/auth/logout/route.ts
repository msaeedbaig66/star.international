import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
// Edge runtime removed due to cookie() dependency in createClient
// export const runtime = 'edge'

export async function POST() {
 const supabase = await createClient()
 await supabase.auth.signOut()
 return NextResponse.json({ data: { message: 'Logged out' }, error: null })
}
