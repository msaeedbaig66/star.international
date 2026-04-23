import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const usernameQuerySchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_.-]+$/)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username') || ''

  const parsedUsername = usernameQuerySchema.safeParse(username)
  if (!parsedUsername.success) {
    return NextResponse.json(
      { available: false, error: 'Username must be 3-30 characters and use only letters, numbers, dot, underscore, or hyphen.' },
      { status: 400 }
    )
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', parsedUsername.data.toLowerCase())
      .single()

    // If we find a user, it's NOT available. If we get PGRST116 (0 rows), it IS available.
    if (error && error.code === 'PGRST116') {
      return NextResponse.json({ available: true })
    }
    
    // If no error, we found the user
    if (data) {
      return NextResponse.json({ available: false })
    }

    // Default false for safety if some other error occurred
    return NextResponse.json({ available: false, error: error?.message })
  } catch (err: any) {
    return NextResponse.json({ available: false, error: err.message }, { status: 500 })
  }
}
