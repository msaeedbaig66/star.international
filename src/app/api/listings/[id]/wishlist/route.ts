import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const listingIdSchema = z.string().uuid()

export async function POST(req: Request, { params }: { params: { id: string } }) {

 try {
 const parsedListingId = listingIdSchema.safeParse(params.id)
 if (!parsedListingId.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsedListingId.error.format() }, { status: 400 })
 }
 const listingId = parsedListingId.data

 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const { error } = await supabase
 .from('wishlist')
 .upsert(
 { user_id: user.id, listing_id: listingId },
 { onConflict: 'user_id,listing_id', ignoreDuplicates: true }
 );

 if (error) throw error;
 
 return NextResponse.json({ success: true, error: null })
 } catch (error: any) {
 console.error('API Error:', error)
 return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
 }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {

 try {
 const parsedListingId = listingIdSchema.safeParse(params.id)
 if (!parsedListingId.success) {
 return NextResponse.json({ error: 'Validation failed', details: parsedListingId.error.format() }, { status: 400 })
 }
 const listingId = parsedListingId.data

 const supabase = await createClient()
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

 const { error } = await supabase
 .from('wishlist')
 .delete()
 .eq('user_id', user.id)
 .eq('listing_id', listingId);

 if (error) throw error;
 
 return NextResponse.json({ success: true, error: null })
 } catch (error: any) {
 console.error('API Error:', error)
 return NextResponse.json({ data: null, error: { message: 'Internal server error' } }, { status: 500 })
 }
}
