import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const sourcingRequestSchema = z.object({
  productName: z.string().trim().min(2).max(200),
  productDetails: z.string().trim().min(5).max(2000),
  phoneNumber: z.string().trim().min(5).max(20), // Added phone number validation
}).strict()

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Please log in to submit a request' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = sourcingRequestSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: parsed.error.format() 
      }, { status: 400 })
    }

    const { productName, productDetails, phoneNumber } = parsed.data

    // We try to insert into contact_number column. 
    // If the migration hasn't been run yet, we append it to details as a fallback.
    const { data, error } = await supabase
      .from('sourcing_requests')
      .insert({
        user_id: user.id,
        product_name: productName,
        product_details: `[Contact: ${phoneNumber}]\n\n${productDetails}`,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Sourcing Request Error:', error)
      return NextResponse.json({ error: 'Failed to submit request to database' }, { status: 500 })
    }

    return NextResponse.json({ data, success: true })
  } catch (error) {
    console.error('API Error in /api/sourcing-requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const { searchParams } = new URL(req.url)
    const isAdminView = searchParams.get('admin') === 'true'

    let query = supabase
      .from('sourcing_requests')
      .select(`
        *,
        user:profiles(full_name, email, phone_number, phone, username)
      `)
      .order('created_at', { ascending: false })

    if (isAdminView) {
      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      query = query.eq('user_id', user.id)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Sourcing Request GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
