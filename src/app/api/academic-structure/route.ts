import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  sector_type_id: z.string().uuid().optional(),
  institution_id: z.string().uuid().optional(),
})

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const sector_type_id = url.searchParams.get('sector_type_id') || undefined
    const institution_id = url.searchParams.get('institution_id') || undefined

    const parsed = querySchema.safeParse({
      sector_type_id,
      institution_id,
    })

    if (!parsed.success) {
      return NextResponse.json({ data: null, error: { message: 'Validation failed', details: parsed.error.format() } }, { status: 400 })
    }

    const supabase = await createClient()
    
    // 1. Sector Types
    let sectorTypes: any[] = []
    if (!institution_id) {
      const { data, error } = await supabase
        .from('sector_types')
        .select('id, name, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      sectorTypes = data || []
    }

    // 2. Institutions (Universities)
    let institutions: any[] = []
    if (parsed.data.sector_type_id) {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, sector_type_id, name, city, province_or_region, sort_order')
        .eq('is_active', true)
        .eq('sector_type_id', parsed.data.sector_type_id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      institutions = data || []
    }

    // 3. Departments
    let departments: any[] = []
    if (parsed.data.institution_id) {
      const { data, error } = await supabase
        .from('departments')
        .select('id, institution_id, name, sort_order')
        .eq('is_active', true)
        .eq('institution_id', parsed.data.institution_id)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      departments = data || []
    }

    return NextResponse.json({
      data: {
        sector_types: sectorTypes,
        institutions: institutions,
        departments: departments,
      },
      error: null,
    })
  } catch (error: any) {
    console.error('academic-structure GET failed:', error)
    return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
  }
}

