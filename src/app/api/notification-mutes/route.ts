import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const mutePayloadSchema = z
  .object({
    targetType: z.enum(['profile', 'blog', 'community']),
    targetId: z.string().uuid(),
  })
  .strict()

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const parsed = mutePayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
    }
    const { targetType, targetId } = parsed.data

    const { error } = await supabase
      .from('notification_mutes')
      .upsert(
        { user_id: user.id, target_type: targetType, target_id: targetId },
        { onConflict: 'user_id,target_type,target_id', ignoreDuplicates: true }
      )

    if (error) throw error
    return NextResponse.json({ success: true, muted: true, error: null })
  } catch (error: any) {
    console.error('notification mutes POST error', error)
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const parsed = mutePayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 })
    }
    const { targetType, targetId } = parsed.data

    const { error } = await supabase
      .from('notification_mutes')
      .delete()
      .eq('user_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)

    if (error) throw error
    return NextResponse.json({ success: true, muted: false, error: null })
  } catch (error: any) {
    console.error('notification mutes DELETE error', error)
    return NextResponse.json({ success: false, error: error?.message || 'Internal Server Error' }, { status: 500 })
  }
}
