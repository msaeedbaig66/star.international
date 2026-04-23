import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const notificationIdSchema = z.string().uuid()

export async function POST(req: Request, { params }: { params: { id: string } }) {

  try {
    const parsedNotificationId = notificationIdSchema.safeParse(params.id)
    if (!parsedNotificationId.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsedNotificationId.error.format() }, { status: 400 })
    }
    const notificationId = parsedNotificationId.data

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { data: null, error: { message: 'Unauthorized' } },
        { status: 401 }
      )
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ data: { read: true }, error: null })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { data: null, error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
