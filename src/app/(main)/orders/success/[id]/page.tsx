import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import Image from 'next/image';

export default async function OrderSuccessPage({ params }: { params: { id: string } }) {

 const supabase = await createClient();
 
 const { data: order, error } = await supabase
 .from('orders')
 .select('*, listing:listings(title, images)')
 .eq('id', params.id)
 .single();

 if (error || !order) {
 return notFound();
 }

 return (
 <main className="min-h-screen py-20 px-6 bg-surface flex items-center justify-center">
 <div className="max-w-2xl w-full bg-surface-container-lowest rounded-3xl border border-border overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-500">
 {/* Confetti/Success Header */}
 <div className="bg-gradient-to-br from-primary to-[#007f80] py-12 text-center text-white relative">
 <div className="absolute inset-0 opacity-10 pointer-events-none">
 {/* Simple decorative pattern */}
 <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
 </div>
 
 <div className="relative z-10">
 <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-white/30">
 <span className="material-symbols-outlined text-5xl text-white font-black">check</span>
 </div>
 <h1 className="text-3xl font-black tracking-tight">Order Confirmed!</h1>
 <p className="mt-2 text-white/80 font-medium">Order ID: #{order.id.slice(0, 8).toUpperCase()}</p>
 </div>
 </div>

 <div className="p-10 space-y-8">
 <div className="text-center">
 <h2 className="text-xl font-bold text-on-surface">Thank you for your purchase!</h2>
 <p className="text-on-surface-variant mt-2">
 The Admin has been notified. You will receive a message in your 
 <Link href="/dashboard?tab=messages" className="text-primary font-bold hover:underline mx-1">Inbox</Link> 
 for final approval and delivery coordination.
 </p>
 </div>

 <div className="bg-surface p-6 rounded-2xl border border-border">
 <div className="flex items-center gap-4">
 <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-border">
 <Image 
 src={order.listing?.images?.[0] || 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=200'} 
 alt={order.listing?.title}
 fill
 className="object-cover"
 />
 </div>
 <div className="flex-1 min-w-0">
 <h3 className="font-bold truncate">{order.listing?.title}</h3>
 <div className="flex justify-between items-center mt-1">
 <span className="text-sm text-on-surface-variant">Qty: {order.quantity}</span>
 <span className="font-black text-primary">{formatPrice(order.total_amount)}</span>
 </div>
 </div>
 </div>
 </div>

 <div className="space-y-4">
 <Link 
 href={`https://wa.me/923226622632?text=${encodeURIComponent(`Hi, I just placed order #${order.id.slice(0, 8).toUpperCase()} on Allpanga. Please approve it.`)}`}
 target="_blank"
 >
 <button className="w-full py-4 bg-[#25D366] text-white font-black rounded-full shadow-lg shadow-green-500/20 hover:scale-[1.02] transition-transform active:scale-95 flex items-center justify-center gap-2">
 <div className="w-6 h-6 flex items-center justify-center">
 <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
 </div>
 Message Admin on WhatsApp
 </button>
 </Link>

 <div className="grid grid-cols-2 gap-4">
 <Link href="/dashboard?tab=tracking">
 <button className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95 flex items-center justify-center gap-2">
 <span className="material-symbols-outlined">analytics</span>
 Track Order
 </button>
 </Link>
 <Link href="/marketplace">
 <button className="w-full py-4 bg-surface text-on-surface font-bold rounded-2xl border border-border hover:bg-slate-100 transition-colors flex items-center justify-center gap-2">
 <span className="material-symbols-outlined">shopping_bag</span>
 Shop More
 </button>
 </Link>
 </div>

 <Link href={`/dashboard?tab=messages&threadId=${order.thread_id || ''}`}>
 <button className="w-full py-4 text-on-surface-variant font-medium hover:bg-surface-container-high transition-colors rounded-full flex items-center justify-center gap-2 underline text-xs">
 <span className="material-symbols-outlined text-sm">chat_bubble</span>
 Go to Messages
 </button>
 </Link>
 </div>
 </div>

 <div className="bg-surface-container-high/30 p-6 text-center border-t border-border">
 <p className="text-xs text-on-surface-variant font-medium">
 Need help? <Link href="/support" className="text-primary font-bold hover:underline">Contact Allpanga Support</Link>
 </p>
 </div>
 </div>
 </main>
 );
}
