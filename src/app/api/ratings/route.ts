import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ratingSchema } from '@/lib/validations/rating'

const PUBLIC_PROFILE_SELECT = 'id, username, full_name, avatar_url'
const RATINGS_SELECT = `
  id,
  reviewer_id,
  subject_id,
  listing_id,
  score,
  review_text,
  created_at,
  reviewer:profiles!reviewer_id(${PUBLIC_PROFILE_SELECT}),
  subject:profiles!subject_id(${PUBLIC_PROFILE_SELECT})
`
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

function isPermissionDenied(error: any) {
  const message = String(error?.message || '').toLowerCase()
  const code = String(error?.code || '').toUpperCase()
  return (
    code === '42501' ||
    message.includes('permission denied') ||
    message.includes('row-level security') ||
    message.includes('not allowed')
  )
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get('subject_id')
    const reviewerId = searchParams.get('reviewer_id')
    const page = parsePositiveInteger(searchParams.get('page'), 1)
    const limit = Math.min(parsePositiveInteger(searchParams.get('limit'), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE)
    const from = (page - 1) * limit
    const to = from + limit - 1

    const supabase = await createClient()
    let query = supabase
      .from('ratings')
      .select(RATINGS_SELECT)

    if (subjectId) {
      query = query.eq('subject_id', subjectId)
    }
    if (reviewerId) {
      query = query.eq('reviewer_id', reviewerId)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    return NextResponse.json({ data, error: null })
  } catch (error: any) {
    return NextResponse.json({ data: null, error: 'Failed to process rating' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    let adminClient: ReturnType<typeof createAdminClient> | null = null
    const getAdmin = () => {
      if (!adminClient) adminClient = createAdminClient()
      return adminClient
    }
    
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Validate request body
    const body = await request.json()
    const result = ratingSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 })
    }

    const { subject_id, listing_id, score } = result.data

    // 3. Prevent self-rating
    if (user.id === subject_id) {
       return NextResponse.json({ error: 'Cannot rate yourself' }, { status: 400 })
    }

    // 4. Prevent duplicate ratings for same listing/profile
    if (listing_id) {
        const { data: existing } = await supabase
            .from('ratings')
            .select('id')
            .eq('reviewer_id', user.id)
            .eq('listing_id', listing_id)
            .single()

        if (existing) {
             return NextResponse.json({ error: 'Already rated this listing' }, { status: 400 })
        }
    } else {
      const { data: existingProfileRating } = await supabase
        .from('ratings')
        .select('id')
        .eq('reviewer_id', user.id)
        .eq('subject_id', subject_id)
        .is('listing_id', null)
        .maybeSingle()

      if (existingProfileRating) {
        return NextResponse.json({ error: 'Already rated this profile' }, { status: 400 })
      }
    }

    // 5. Insert into ratings table
    const { data, error } = await supabase
      .from('ratings')
      .insert({
        reviewer_id: user.id,
        subject_id,
        listing_id,
        score,
        review_text: null,
      })
      .select()
      .single()

    if (error) throw error

    // 6. Recompute seller profile rating aggregates
    const { data: subjectRatings, error: aggregateReadError } = await supabase
      .from('ratings')
      .select('score')
      .eq('subject_id', subject_id)
    if (aggregateReadError) throw aggregateReadError

    if (subjectRatings && subjectRatings.length > 0) {
      const total = subjectRatings.reduce((sum, r: any) => sum + Number(r.score || 0), 0)
      const count = subjectRatings.length
      const average = Number((total / count).toFixed(2))

      const payload = {
        rating_avg: average,
        rating_count: count
      }
      const { error: aggregateWriteError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', subject_id)
      if (aggregateWriteError) {
        if (!isPermissionDenied(aggregateWriteError)) throw aggregateWriteError
        const admin = getAdmin()
        const { error: adminAggregateWriteError } = await admin
          .from('profiles')
          .update(payload)
          .eq('id', subject_id)
        if (adminAggregateWriteError) throw adminAggregateWriteError
      }
    } else {
      const payload = {
        rating_avg: 0,
        rating_count: 0
      }
      const { error: resetWriteError } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', subject_id)
      if (resetWriteError) {
        if (!isPermissionDenied(resetWriteError)) throw resetWriteError
        const admin = getAdmin()
        const { error: adminResetWriteError } = await admin
          .from('profiles')
          .update(payload)
          .eq('id', subject_id)
        if (adminResetWriteError) throw adminResetWriteError
      }
    }

    return NextResponse.json({ data, error: null }, { status: 201 })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ data: null, error: 'Failed to process rating' }, { status: 500 })
  }
}
