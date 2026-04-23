import { createAdminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/utils';
import Image from 'next/image';
import { OrderStatusBadge, OrderActions } from './status-badge';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  const supabase = createAdminClient();
  if (!supabase) return <div>Missing Admin Client Configuration</div>
  
  if (!supabase) return <div>Auth Secret Required</div>;

  // 1. Fetch all professional orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*, listing:listings(title, images), buyer:profiles!buyer_id(full_name, phone_number)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch orders error:', error);
    return <div className="p-10 text-center">Error loading orders</div>;
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary uppercase">Marketplace <span className="text-primary italic">Logistics</span></h1>
          <p className="text-text-secondary mt-1 font-medium italic">Manage shipping, payments, and order fulfillment.</p>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-high/30 border-b border-border">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-muted">Order ID / Date</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-muted">Item / Buyer</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-muted">Logistics</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-muted">Financials</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Fulfillment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders?.map((order) => (
                <tr key={order.id} className="hover:bg-surface/50 transition-colors group">
                  <td className="px-6 py-6">
                    <div className="font-mono text-[11px] font-bold text-text-primary">#{order.id.slice(0, 8).toUpperCase()}</div>
                    <div className="text-[10px] text-text-muted mt-1">{new Date(order.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border bg-surface shrink-0">
                        <Image 
                          src={order.listing?.images?.[0] || 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=100'} 
                          alt="item" 
                          fill 
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-text-primary truncate">{order.listing?.title}</p>
                        <p className="text-[10px] text-text-muted font-medium">{order.buyer_name || order.buyer?.full_name} • {order.shipping_city}</p>
                        {order.buyer_phone && <p className="text-[9px] font-bold text-primary mt-0.5">{order.buyer_phone}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">local_shipping</span>
                        {order.courier_service}
                      </span>
                      {order.tracking_number ? (
                        <span className="text-[10px] font-mono font-bold text-text-secondary bg-surface px-2 py-0.5 rounded truncate">
                          TRK: {order.tracking_number}
                        </span>
                      ) : (
                        <span className="text-[9px] text-text-muted italic">No Tracking Added</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="font-black text-text-primary">{formatPrice(order.total_amount)}</div>
                    <div className="text-[10px] font-bold uppercase text-text-muted mt-0.5">{order.payment_method}</div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center justify-end gap-3">
                      <OrderStatusBadge status={order.status} />
                      <OrderActions orderId={order.id} currentStatus={order.status} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!orders?.length && (
          <div className="py-20 text-center opacity-30">
            <span className="material-symbols-outlined text-6xl mb-4">shopping_cart</span>
            <p className="text-[10px] font-black uppercase tracking-widest">No professional orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}
