import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import Image from 'next/image';
import { CheckoutForm } from './checkout-form';

export default async function CheckoutPage({ 
  params,
  searchParams
}: { 
  params: { id: string },
  searchParams: { variant?: string }
}) {

 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();

 if (!user) {
 redirect('/login?next=/checkout/' + params.id);
 }

 // 1. Fetch listing and seller data
 const { data: listing, error } = await supabase
 .from('listings')
 .select('*, seller:profiles!seller_id(id, full_name, role)')
 .eq('id', params.id)
 .single();

 if (error || !listing || listing.seller.role !== 'admin') {
 return notFound();
 }

 // 2. Fetch buyer profile for pre-filling
 const { data: profile } = await supabase
 .from('profiles')
 .select('full_name, phone_number, city')
 .eq('id', user.id)
 .single();

  const variants = (listing.variants as {name: string, price: number}[]) || [];
  const selectedVariant = variants.find(v => v.name === searchParams.variant);

  const price = selectedVariant 
    ? selectedVariant.price 
    : Number(listing.listing_type === 'rent' ? (listing.rental_price || listing.price || 0) : (listing.price || 0));

 return (
 <main className="min-h-screen pt-12 pb-24 px-6 bg-surface">
 <div className="max-w-5xl mx-auto">
 <div className="flex items-center gap-4 mb-10">
 <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">1</div>
 <h1 className="text-3xl font-black text-on-surface tracking-tight">Checkout Details</h1>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
 {/* Left: Checkout Form */}
 <div className="lg:col-span-7">
  <CheckoutForm 
  listing={listing} 
  profile={profile || {}} 
  basePrice={price}
  selectedVariantName={searchParams.variant}
  />
 </div>

 {/* Right: Order Summary Sidebar */}
 <div className="lg:col-span-5">
 <div className="sticky top-24">
 <div className="bg-surface-container-lowest rounded-2xl border border-border overflow-hidden shadow-sm">
 <div className="p-6 border-b border-border bg-surface-container-high/30">
 <h3 className="font-bold text-lg">Order Summary</h3>
 </div>
 
 <div className="p-6 space-y-4">
 <div className="flex gap-4">
 <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-border">
 <Image 
 src={listing.images?.[0] || 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=200'} 
 alt={listing.title}
 fill
 className="object-cover"
 />
 </div>
 <div className="min-w-0">
 <h4 className="font-bold text-on-surface truncate">{listing.title}</h4>
 <p className="text-sm text-on-surface-variant mt-1">{listing.category || 'Professional Item'}</p>
 <p className="text-primary font-bold mt-1">{formatPrice(price)}</p>
 </div>
 </div>

 <div className="pt-4 space-y-3 border-t border-surface-container-high">
 <div className="flex justify-between text-sm">
 <span className="text-on-surface-variant">Subtotal</span>
 <span className="font-medium" id="summary-subtotal">{formatPrice(price)}</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-on-surface-variant">Shipping Fee</span>
 <span className="font-medium text-primary" id="summary-shipping">Calculated at next step</span>
 </div>
 <div className="flex justify-between items-end pt-4 border-t border-border">
 <span className="font-black text-lg">Total Amount</span>
 <span className="text-2xl font-black text-primary" id="summary-total">{formatPrice(price)}</span>
 </div>
 </div>
 </div>

 <div className="p-4 bg-surface-container-lowest border-t border-border text-center">
 <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
 Secured by Allpanga Professional
 </p>
 </div>
 </div>

 {/* Trust Badge */}
 <div className="mt-6 flex items-center justify-center gap-6 text-on-surface-variant grayscale opacity-60">
 <div className="flex flex-col items-center gap-1">
 <span className="material-symbols-outlined text-3xl">verified_user</span>
 <span className="text-[10px] uppercase font-bold tracking-tighter">Secure Payments</span>
 </div>
 <div className="flex flex-col items-center gap-1">
 <span className="material-symbols-outlined text-3xl">local_shipping</span>
 <span className="text-[10px] uppercase font-bold tracking-tighter">Campus Delivery</span>
 </div>
 <div className="flex flex-col items-center gap-1">
 <span className="material-symbols-outlined text-3xl">headset_mic</span>
 <span className="text-[10px] uppercase font-bold tracking-tighter">Admin Support</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </main>
 );
}
