'use client'

import { useState } from 'react'
import { Modal, Button, Input, Textarea } from '@/components/ui'
import { toast } from 'sonner'

export function SourcingBanner() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ 
    productName: '', 
    productDetails: '',
    phoneNumber: ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/sourcing-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.details ? `${result.error}: ${result.details}` : (result.error || 'Submission failed'))
      }

      toast.success('Request Submitted Successfully!', {
        description: "Our team will check Lahore, Karachi, and China markets and get back to you soon.",
        duration: 5000,
      })
      setIsOpen(false)
      setFormData({ productName: '', productDetails: '', phoneNumber: '' })
    } catch (error: any) {
      toast.error('Submission Error', {
        description: error.message || 'Please try again later.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white py-4 px-6 rounded-2xl shadow-xl border border-emerald-400/20 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all duration-500 z-0 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl -ml-12 -mb-12 z-0 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md border border-white/30 shrink-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-white">package_2</span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-bold tracking-tight">Special Item Sourcing</h3>
              <p className="text-emerald-50/90 text-sm md:text-base max-w-2xl font-medium">
                Any item related to study you cannot find on our website? Please let us know! 
                We try our best to make it available for you from <span className="text-white font-bold">Lahore, Karachi,</span> or even <span className="text-white font-bold">China</span> as urgently as possible.
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => setIsOpen(true)}
            className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold px-8 h-12 rounded-xl shadow-lg transition-all active:scale-95 shrink-0 z-20"
          >
            Request Item
          </Button>
        </div>
      </div>

      <Modal 
        open={isOpen} 
        onClose={() => setIsOpen(false)}
        title="Request Special Item Sourcing"
      >
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex gap-3">
            <span className="material-symbols-outlined text-xl text-emerald-600 shrink-0 mt-0.5">info</span>
            <p className="text-sm text-emerald-800 leading-relaxed">
              Tell us what you&apos;re looking for. We&apos;ll check our partners in major cities and abroad to source it for you at the best price.
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="Product Name"
              placeholder="e.g. Specialized Medical Textbooks, Engineering Kits..."
              required
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
            />

            <Input
              label="Contact Number (WhatsApp Preferred)"
              placeholder="e.g. +92 300 1234567"
              required
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />

            <Textarea
              label="Product Details"
              placeholder="Please provide specifics like author, edition, or technical specifications..."
              required
              value={formData.productDetails}
              onChange={(e) => setFormData({ ...formData, productDetails: e.target.value })}
              className="min-h-[100px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={loading}
              className="px-6"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-10"
              loading={loading}
            >
              Send Request
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
