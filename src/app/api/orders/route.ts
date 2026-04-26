import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const orderSchema = z.object({
 listingId: z.string().uuid(),
 quantity: z.number().int().min(1).max(10).default(1),
 shippingAddress: z.string().trim().min(5).max(500),
 shippingCity: z.string().trim().min(2).max(100),
 shippingCost: z.number().min(0).max(10000).default(0),
 codSurcharge: z.number().min(0).max(5000).default(0),
 comment: z.string().max(500).optional().nullable(),
 buyerName: z.string().trim().min(2).max(100),
 buyerPhone: z.string().trim().min(10).max(15),
 courierService: z.string().trim().max(50).default('TCS'),
 paymentMethod: z.string().trim().max(50).default('COD'),
 selectedVariantName: z.string().trim().max(100).optional().nullable()
})

export async function POST(request: Request) {
 try {
 const supabase = await createClient()
 
 // 1. Auth check
 const { data: { user } } = await supabase.auth.getUser()
 if (!user) {
 return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

 // 2. Fetch & Validate Body
 const body = await request.json().catch(() => ({}))
 const parsed = orderSchema.safeParse(body)
 
 if (!parsed.success) {
 return NextResponse.json({ 
 error: 'Invalid order details', 
 details: parsed.error.issues[0].message 
 }, { status: 400 })
 }

 const { 
 listingId, 
 quantity,
 shippingAddress,
 shippingCity,
 shippingCost,
 codSurcharge,
 comment,
 buyerName,
 buyerPhone,
 courierService,
 paymentMethod,
 selectedVariantName
 } = parsed.data

 // 3. Verify Listing from Database
 const { data: listing, error: listingError } = await supabase
 .from('listings')
 .select('id, price, seller_id, title, status, variants')
 .eq('id', listingId)
 .single()

 if (listingError || !listing) {
 return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
 }

 if (listing.status !== 'available') {
 return NextResponse.json({ error: 'This listing is no longer available for purchase' }, { status: 400 })
 }

 const sellerId = listing.seller_id
 let dbPrice = listing.price

 // 3.5 Handle Variant Pricing
 if (selectedVariantName) {
   const variants = (listing.variants as any[]) || []
   const variant = variants.find(v => v.name === selectedVariantName)
   if (!variant) {
     return NextResponse.json({ error: 'Selected variant is not valid for this item' }, { status: 400 })
   }
   dbPrice = variant.price
 }

 // 4. Prevent self-ordering
 if (user.id === sellerId) {
 return NextResponse.json({ error: "You cannot order your own item." }, { status: 403 })
 }

 // 5. Prevent duplicate pending orders
 const { data: existingOrder } = await supabase
 .from('orders')
 .select('id')
 .eq('buyer_id', user.id)
 .eq('listing_id', listingId)
 .eq('status', 'pending')
 .maybeSingle()

 if (existingOrder) {
 return NextResponse.json({ error: 'You already have a pending order for this item.' }, { status: 409 })
 }

 // 6. Calculate Totals (Security: Client values ignored for financial fields)
 const calculatedTotalAmount = (dbPrice * quantity) + shippingCost + codSurcharge

 // 6. Create the Order
 const { data: order, error: orderError } = await supabase
 .from('orders')
 .insert({
 buyer_id: user.id,
 seller_id: sellerId,
 listing_id: listingId,
 total_price: dbPrice,
 quantity,
 shipping_address: shippingAddress,
 shipping_city: shippingCity,
 shipping_cost: shippingCost,
 cod_surcharge: codSurcharge,
 total_amount: calculatedTotalAmount,
 buyer_comment: comment,
 courier_service: courierService,
 payment_method: paymentMethod,
 buyer_name: buyerName,
 buyer_phone: buyerPhone,
 selected_variant_name: selectedVariantName,
 status: 'pending'
 })
 .select()
 .single()

 if (orderError) throw orderError

 // 7. Create or Get Message Thread
 const { data: threadData, error: threadError } = await supabase
 .rpc('get_or_create_message_thread', {
 user_a: user.id,
 user_b: sellerId
 });

 if (threadError) throw threadError
 
 const threadId = threadData?.thread_id || threadData;

 // 8. Post automated message
 const orderMessage = `🚀 **NEW PROFESSIONAL ORDER**\n\n` +
 `Item: **${listing.title}**\n` +
 (selectedVariantName ? `Option: **${selectedVariantName}**\n` : '') +
 `Quantity: **${quantity}**\n` +
 `Total: **Rs ${calculatedTotalAmount.toLocaleString()}**\n` +
 `Payment: **${paymentMethod}**\n` +
 `Courier: **${courierService}**\n\n` +
 `👤 **Buyer Details:**\n` +
 `Name: ${buyerName}\n` +
 `Phone: ${buyerPhone}\n\n` +
 `📍 **Delivery Info:**\n` +
 `City: ${shippingCity}\n` +
 `Address: ${shippingAddress}\n` +
 (comment ? `\n💬 **Comment:** ${comment}` : '') +
 `\n\n*Order ID: #${order.id.slice(0, 8).toUpperCase()}*`
 
 await supabase.from('messages').insert({
 thread_id: threadId,
 sender_id: user.id,
 content: orderMessage
 })

 return NextResponse.json({ 
 success: true, 
 orderId: order.id, 
 threadId: threadId 
 })

 } catch (error: any) {
 console.error('Order creation error:', error)
 return NextResponse.json({ 
 error: 'An internal error occurred while processing your order.'
 }, { status: 500 })
 }
}
