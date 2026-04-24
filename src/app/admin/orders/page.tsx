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
                        {order.buyer_phone && (
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[9px] font-bold text-primary">{order.buyer_phone}</p>
                            <a 
                              href={`https://wa.me/${order.buyer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${order.buyer_name || order.buyer?.full_name || ''}, I am from Allpanga regarding your order #${order.id.slice(0, 8).toUpperCase()}.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-5 h-5 bg-[#25D366] text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            </a>
                          </div>
                        )}
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
