import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateOrderSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  trackingNumber: z.string().max(100).optional().nullable()
})

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {

  try {
    const supabase = await createClient()
    
    // 1. Admin/Service check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch user profile to check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Body check
    const body = await request.json().catch(() => ({}))
    const parsed = updateOrderSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid update data' }, { status: 400 })
    }

    const { status, trackingNumber } = parsed.data
    
    const updateData: any = { 
        status, 
        updated_at: new Date().toISOString() 
    }
    
    if (trackingNumber !== undefined) {
        updateData.tracking_number = trackingNumber
    }

    // 3. Update Order
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })

  } catch (error: any) {
    console.error('Admin order update error:', error)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
