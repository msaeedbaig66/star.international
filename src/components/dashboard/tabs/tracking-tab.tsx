'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { OrderStatusBadge } from '@/app/admin/orders/status-badge'

export function TrackingTab({ profile }: { profile: any }) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchOrders() {
      const { data, error } = await supabase
        .from('orders')
        .select('*, listing:listings(title, images)')
        .eq('buyer_id', profile.id)
        .order('created_at', { ascending: false })

      if (data) setOrders(data)
      setLoading(false)
    }
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id])

  const getTrackingLink = (service: string, number: string) => {
    if (!number) return '#'
    const courier = (service || '').toUpperCase()
    const trackNo = (number || '').trim()
    
    if (courier.includes('TCS')) return `https://www.trackcourier.pk/tcs-tracking?tracking_no=${trackNo}`
    if (courier.includes('LEOPARD')) return `https://www.trackcourier.pk/leopard-tracking?tracking_no=${trackNo}`
    if (courier.includes('MNP') || courier.includes('M&P')) return `https://www.trackcourier.pk/mnp-tracking?tracking_no=${trackNo}`
    
    return `https://www.trackcourier.pk/tcs-tracking?tracking_no=${trackNo}` // Default fallback
  }

  if (loading) return <div className="py-20 text-center animate-pulse">Loading orders...</div>

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight">Track My <span className="text-primary italic">Orders</span></h2>
        <p className="text-sm text-text-secondary mt-1 font-medium italic">Real-time status of your professional marketplace purchases.</p>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {orders.map((order) => (
          <div key={order.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group">
            <div className="p-5 sm:p-8 flex flex-col lg:flex-row gap-6 sm:gap-8 lg:items-center">
               {/* Item Info */}
               <div className="flex gap-4 sm:gap-6 items-center min-w-0 flex-1">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shrink-0">
                    <Image 
                      src={order.listing?.images?.[0] || 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=200'} 
                      alt="item"
                      fill 
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mb-1">
                      #{order.id.slice(0, 8).toUpperCase()} • {new Date(order.created_at).toLocaleDateString()}
                    </p>
                    <h3 className="text-sm sm:text-lg font-black text-slate-900 truncate leading-tight uppercase leading-none">{order.listing?.title}</h3>
                    <div className="mt-2 text-sm sm:text-base font-black text-emerald-600">
                      {formatPrice(order.total_amount)}
                    </div>
                  </div>
               </div>

               {/* Status and Tracking */}
               <div className="flex flex-col sm:flex-row lg:flex-col gap-5 sm:items-center lg:items-start w-full lg:w-auto lg:min-w-[240px] border-t lg:border-t-0 lg:border-l border-slate-50 pt-5 lg:pt-0 lg:pl-8">
                  <div className="flex flex-col gap-1.5 flex-1 w-full sm:w-auto">
                     <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Order Status</p>
                     <OrderStatusBadge status={order.status} />
                  </div>

                  {order.status === 'shipped' && order.tracking_number ? (
                    <div className="flex flex-col gap-2 flex-1 w-full sm:w-auto">
                       <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 px-1">Fulfillment Gateway</p>
                       <a 
                         href={getTrackingLink(order.courier_service, order.tracking_number)} 
                         target="_blank"
                         rel="noopener noreferrer"
                         className="flex items-center gap-2 group/btn w-full"
                       >
                          <div className="flex-1 bg-slate-50 border border-slate-100 p-3 sm:p-2 rounded-xl text-slate-900 font-mono text-[10px] font-black group-hover/btn:bg-slate-900 group-hover/btn:text-white transition-all text-center sm:text-left">
                             {order.courier_service.toUpperCase()}: {order.tracking_number}
                          </div>
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover/btn:bg-emerald-600 group-hover/btn:text-white transition-all">
                            <span className="material-symbols-outlined text-[18px]">track_changes</span>
                          </div>
                       </a>
                    </div>
                  ) : (
                    <div className="flex-1 w-full sm:w-auto text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/50 p-4 rounded-2xl border border-dashed border-slate-100 text-center">
                       {order.status === 'pending' ? 'Verification Pending' : 'Packing Logistics...'}
                    </div>
                  )}
               </div>
            </div>
          </div>
        ))}

        {!orders.length && (
          <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-border">
             <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center mx-auto mb-6 text-text-muted opacity-30">
                <span className="material-symbols-outlined text-5xl">package_2</span>
             </div>
             <p className="font-black text-text-primary uppercase tracking-widest">No orders found</p>
             <Link href="/marketplace" className="text-primary font-bold text-sm hover:underline mt-2 inline-block">Start shopping in the marketplace</Link>
          </div>
        )}
      </div>
    </div>
  )
}
