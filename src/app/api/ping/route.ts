import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
// Edge runtime removed due to cookie() dependency in createClient
// export const runtime = 'edge'

/**
 * Allpanga Stay-Alive Pinger
 * This route is designed to be called every 6 days by an external cron service (e.g. cron-job.org)
 * to prevent Supabase from pausing the project due to inactivity.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Perform a tiny query to keep the database connection active
    const { data, error } = await supabase
      .from('sector_types')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({
      status: 'active',
      timestamp: new Date().toISOString(),
      db_check: !!data ? 'connected' : 'no_data',
      message: 'Allpanga Nexus is awake and vigilant.'
    })
  } catch (err: any) {
    console.error('Pinger Failed:', err.message)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Failed to heartbeat database' 
    }, { status: 500 })
  }
}
