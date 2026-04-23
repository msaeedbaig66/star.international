'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'

export function CheckoutForm({ listing, profile, basePrice }: { listing: any, profile: any, basePrice: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    phoneNumber: profile?.phone_number || '',
    city: profile?.city || '',
    address: '',
    quantity: 1,
    comment: '',
    courier: 'TCS',
    paymentMethod: 'COD'
  })

  // Shipping & Payment Logic
  const isOfficePickup = formData.courier === 'OFFICE'
  const isOutsideFaisalabad = !isOfficePickup && formData.city.trim().toLowerCase() !== 'faisalabad' && formData.city.trim() !== ''
  const shippingCostBase = isOutsideFaisalabad ? 200 : 0
  const codSurcharge = (!isOfficePickup && formData.paymentMethod === 'COD') ? 50 : 0
  const totalShipping = shippingCostBase + codSurcharge
  
  const subtotal = basePrice * formData.quantity
  const total = subtotal + totalShipping

  // Sync with summary in parent
  useEffect(() => {
    const subtotalEl = document.getElementById('summary-subtotal')
    const shippingEl = document.getElementById('summary-shipping')
    const totalEl = document.getElementById('summary-total')
    
    if (subtotalEl) subtotalEl.innerText = formatPrice(subtotal)
    if (shippingEl) {
        let shipText = shippingCostBase > 0 ? formatPrice(shippingCostBase) : 'FREE'
        if (codSurcharge > 0) shipText += ` + ${formatPrice(codSurcharge)} COD Fee`
        shippingEl.innerText = shipText
    }
    if (totalEl) totalEl.innerText = formatPrice(total)
  }, [subtotal, shippingCostBase, codSurcharge, total])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          listingId: listing.id,
          sellerId: listing.seller_id,
          itemTitle: listing.title,
          quantity: formData.quantity,
          shippingAddress: formData.address,
          shippingCity: formData.city,
          shippingCost: shippingCostBase,
          codSurcharge: codSurcharge,
          courierService: formData.courier,
          paymentMethod: isOfficePickup ? 'PAY AT OFFICE' : formData.paymentMethod,
          totalPrice: basePrice, 
          totalAmount: total,      
          comment: formData.comment,
          buyerName: formData.fullName,
          buyerPhone: formData.phoneNumber
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to place order')
      
      router.push(`/orders/success/${data.orderId}`)
    } catch (error: any) {
      console.error(error)
      setLoading(false)
      alert(`Error: ${error.message}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-2xl border border-border shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
           <label className="block text-xs font-black uppercase tracking-widest text-on-surface-variant mb-3">Professional Item</label>
           <h2 className="text-xl font-bold text-on-surface">{listing.title}</h2>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-on-surface-variant mb-2">Quantity</label>
          <select 
            value={formData.quantity}
            onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
            className="w-full p-4 bg-surface rounded-xl border border-border font-bold focus:ring-2 focus:ring-primary outline-none"
          >
            {[1, 2, 3, 4, 5, 10].map(n => <option key={n} value={n}>{n} unit{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-on-surface-variant mb-2">Delivery Service</label>
          <select 
            value={formData.courier}
            onChange={(e) => setFormData({...formData, courier: e.target.value})}
            className="w-full p-4 bg-surface rounded-xl border border-border font-bold focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="TCS">TCS (Recommended)</option>
            <option value="Leopards">Leopards Courier</option>
            <option value="MNP">M&P Courier</option>
            <option value="OFFICE">Collect from Office (Free)</option>
          </select>
        </div>

        {!isOfficePickup && (
          <div className="md:col-span-2 border-t border-surface-container-high pt-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-6">Payment Method</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <button 
                 type="button"
                 onClick={() => setFormData({...formData, paymentMethod: 'COD'})}
                 className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${formData.paymentMethod === 'COD' ? 'border-primary bg-primary/5' : 'border-border bg-surface'}`}
               >
                 <span className="material-symbols-outlined text-primary">payments</span>
                 <div className="text-left">
                    <p className="font-bold text-sm">Cash on Delivery</p>
                    <p className="text-[10px] font-medium text-on-surface-variant">+ Rs 50 Surcharge</p>
                 </div>
               </button>
               <button 
                 type="button"
                 onClick={() => setFormData({...formData, paymentMethod: 'Bank'})}
                 className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${formData.paymentMethod === 'Bank' ? 'border-primary bg-primary/5' : 'border-border bg-surface'}`}
               >
                 <span className="material-symbols-outlined text-primary">account_balance</span>
                 <div className="text-left">
                    <p className="font-bold text-sm">Bank Transfer / JazzCash</p>
                    <p className="text-[10px] font-medium text-on-surface-variant">Recommended for Faster Ship</p>
                 </div>
               </button>
            </div>

            {formData.paymentMethod === 'Bank' && (
              <div className="mt-6 p-6 bg-slate-900 text-white rounded-2xl border border-white/10 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-4 mb-4 border-b border-white/10 pb-4">
                     <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">info</span>
                     </div>
                     <div>
                        <h4 className="font-bold">Account Information</h4>
                        <p className="text-xs text-white/60">Please transfer total amount to any account below.</p>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">MEEZAN BANK</p>
                        <p className="font-mono text-lg font-bold">00300114409569</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#F7931A]">JAZZCASH</p>
                        <p className="font-mono text-lg font-bold">03226622632</p>
                     </div>
                     <div className="pt-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Account Name</p>
                        <p className="font-bold">Muhammad Saeed Baig</p>
                     </div>
                  </div>
              </div>
            )}
          </div>
        )}

        <div className="md:col-span-2 border-t border-surface-container-high pt-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-6">Receiver Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
               <label className="text-sm font-bold text-on-surface-variant ml-1">Full Name</label>
               <input 
                 required
                 value={formData.fullName}
                 onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                 placeholder="Enter full name"
                 className="w-full p-4 bg-surface rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none"
               />
            </div>
            <div className="space-y-2">
               <label className="text-sm font-bold text-on-surface-variant ml-1">Phone Number</label>
               <input 
                 required
                 value={formData.phoneNumber}
                 onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                 placeholder="WhatsApp or Mobile"
                 className="w-full p-4 bg-surface rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none"
               />
            </div>
          </div>
        </div>

        <div className={`md:col-span-2 space-y-6 ${isOfficePickup ? 'opacity-60 pointer-events-none' : ''}`}>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface-variant ml-1">City</label>
                <input 
                  required={!isOfficePickup}
                  value={isOfficePickup ? 'Faisalabad (Office)' : formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="e.g. Faisalabad"
                  className="w-full p-4 bg-surface rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none font-bold"
                />
             </div>
             <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-on-surface-variant ml-1">Full Shipping Address</label>
                <input 
                  required={!isOfficePickup}
                  value={isOfficePickup ? 'COLLECT FROM OFFICE' : formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Hostel, Street, or Campus location"
                  className="w-full p-4 bg-surface rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none"
                />
             </div>
           </div>
           
           <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface-variant ml-1">Order Comments (Optional)</label>
              <textarea 
                value={formData.comment}
                onChange={(e) => setFormData({...formData, comment: e.target.value})}
                placeholder="Any special instructions for the Admin..."
                rows={3}
                className="w-full p-4 bg-surface rounded-xl border border-border focus:ring-2 focus:ring-primary outline-none resize-none"
              />
           </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-5 bg-gradient-to-r from-primary to-[#007f80] text-xl font-black text-white rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
      >
        <span className="material-symbols-outlined">shopping_cart_checkout</span>
        {loading ? 'Processing Order...' : 'Confirm Order Now'}
      </button>

      <p className="text-center text-[11px] text-on-surface-variant font-medium">
        By clicking confirm, you agree to the marketplace terms. The Admin will contact you via WhatsApp or In-app Chat for final approval.
      </p>
    </form>
  )
}
