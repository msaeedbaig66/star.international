import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reportSchema } from '@/lib/validations/report'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Validate request body
    const body = await request.json()
    const result = reportSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 })
    }

    const { target_type, target_id, category, description, evidence_url } = result.data

    // 3. Insert into reports table
    const { data, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        target_type,
        target_id,
        category,
        description,
        evidence_url,
        status: 'open'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data, error: null }, { status: 201 })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ data: null, error: 'Failed to process report' }, { status: 500 })
  }
}
