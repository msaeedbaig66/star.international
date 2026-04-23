'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';

interface Advertisement {
  id: string;
  title: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  display_order: number;
  meta?: Record<string, any> | null;
}

interface HeroMeta {
  subtitle: string;
  badgeText?: string;
  showButtons: boolean;
  showPrimaryCta: boolean;
  showSecondaryCta: boolean;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  imageFocus: 'left' | 'center' | 'right';
  overlayOpacity: number;
  bgType?: 'image' | 'solid' | 'gradient';
  bgColor?: string;
  bgGradient?: string;
  footerStats?: Array<{ icon: string; label: string }>;
}

const DEFAULT_HERO_META: HeroMeta = {
  subtitle: 'Allpanga is the free marketplace for students. Trade academic items, share projects, and collaborate with your peers at NTU.',
  badgeText: 'Student Marketplace',
  showButtons: false,
  showPrimaryCta: true,
  showSecondaryCta: true,
  primaryCtaLabel: 'Create Free Account',
  primaryCtaHref: '/signup',
  secondaryCtaLabel: 'Browse Items',
  secondaryCtaHref: '/marketplace',
  imageFocus: 'right',
  overlayOpacity: 35,
  bgType: 'image',
  bgColor: '#007f80',
  bgGradient: 'linear-gradient(135deg, #0d3d3d 0%, #007f80 100%)',
  footerStats: [
    { icon: 'verified', label: 'Free & Secure' },
    { icon: 'school', label: 'Students Only' },
    { icon: 'flash_on', label: 'Instant Chat' }
  ]
};

interface AdvertisementsManagerProps {
  initialAds: any[];
  stats: {
    active: number;
    inactive: number;
    total: number;
  };
}

export function AdvertisementsManager({ initialAds, stats }: AdvertisementsManagerProps) {
  const [ads, setAds] = useState<Advertisement[]>(initialAds);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
       const oldIndex = ads.findIndex(item => item.id === active.id);
       const newIndex = ads.findIndex(item => item.id === over.id);
      const newAds = arrayMove(ads, oldIndex, newIndex);
      setAds(newAds);
       
       // Save to DB
       try {
         let rowCounter = 1;
         const res = await fetch('/api/advertisements/reorder', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             items: newAds.map((ad) => {
               if ((ad.display_order || 0) === 0) {
                 return { id: ad.id, display_order: 0 };
               }
               const item = { id: ad.id, display_order: rowCounter };
               rowCounter += 1;
               return item;
             }),
           }),
         });
         if (!res.ok) throw new Error();
         toast.success('Display order saved');
       } catch (error) {
          toast.error('Failed to save order');
       }
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
     try {
       const res = await fetch(`/api/advertisements/${id}`, {
         method: 'PATCH',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ is_active: !current }),
       });
       if (!res.ok) throw new Error();
       setAds(prev => prev.map(ad => ad.id === id ? { ...ad, is_active: !current } : ad));
       toast.success('Status updated');
     } catch (error) {
        toast.error('Failed to update status');
     }
  };

  const handleDelete = async (id: string) => {
     if (!confirm('Are you sure you want to delete this ad?')) return;
     try {
       const res = await fetch(`/api/advertisements/${id}`, { method: 'DELETE' });
       if (!res.ok) throw new Error();
       setAds(prev => prev.filter(ad => ad.id !== id));
       toast.success('Ad deleted');
     } catch (error) {
        toast.error('Failed to delete ad');
     }
  };

  return (
    <div className="space-y-8 pb-20">
       <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-text-primary tracking-tight">Banner Ads Ecosystem</h2>
          <p className="text-text-secondary mt-1 text-lg">Manage homepage hero carousels and promotional content</p>
        </div>
        <button 
          onClick={() => { setEditingAd(null); setIsModalOpen(true); }}
          className="bg-primary text-white px-8 py-3 rounded-full font-black text-sm shadow-xl hover:shadow-primary/20 transition-all flex items-center gap-2 active:scale-95 leading-none"
        >
          <span className="material-symbols-outlined text-sm font-black">add</span>
          Deploy New Ad
        </button>
      </div>

       {/* Stats */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-primary text-white p-7 rounded-[2rem] shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-125 transition-transform">
               <span className="material-symbols-outlined text-6xl">campaign</span>
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Live Exposure</p>
             <p className="text-4xl font-black mt-2">{stats.active}</p>
             <p className="text-[10px] font-bold text-white/40 mt-3 truncate whitespace-nowrap overflow-hidden">Active Rotations across Allpanga</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-border">
             <p className="text-[10px] font-black uppercase text-text-muted">Draft Inventory</p>
             <p className="text-3xl font-black text-text-primary mt-1">{stats.inactive}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-border">
             <p className="text-[10px] font-black uppercase text-text-muted">Total Managed</p>
             <p className="text-3xl font-black text-text-primary mt-1">{stats.total}</p>
          </div>
          <div className="bg-surface p-6 rounded-2xl border border-border grayscale hover:grayscale-0 transition-all cursor-pointer flex flex-col items-center justify-center text-center">
             <p className="text-[10px] font-black uppercase text-text-muted tracking-widest">Rotation Speed</p>
             <p className="text-2xl font-black text-text-primary mt-1">5.2s</p>
          </div>
       </div>

       {/* Banner List */}
       <div className="bg-white rounded-[2rem] border border-border shadow-sm overflow-hidden p-2">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-surface/50 border-b border-border">
                      <th className="p-5 pl-8 w-16"></th>
                      <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Visual</th>
                      <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Asset Title & Link</th>
                      <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Lifecycle</th>
                      <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-center">Visibility</th>
                      <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-right pr-8">Actions</th>
                   </tr>
                </thead>
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={ads.map(item => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody className="divide-y divide-border">
                       {ads.map((item, index) => (
                         <SortableAdRow 
                          key={item.id} 
                          item={item} 
                          index={index} 
                          onToggle={() => toggleActive(item.id, item.is_active)}
                          onEdit={() => { setEditingAd(item); setIsModalOpen(true); }}
                          onDelete={() => handleDelete(item.id)}
                        />
                       ))}
                    </tbody>
                  </SortableContext>
                </DndContext>
             </table>
          </div>
       </div>

       {/* Ad Modal */}
       <AdModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={editingAd}
       onSuccess={(newAd) => {
           if (editingAd) {
             setAds(prev => prev.map(a => a.id === newAd.id ? newAd : a).sort((a, b) => a.display_order - b.display_order));
           } else {
             setAds(prev => [...prev, newAd].sort((a, b) => a.display_order - b.display_order));
           }
           setIsModalOpen(false);
        }}
      />
    </div>
  );
}

function SortableAdRow({ item, index, onToggle, onEdit, onDelete }: { item: Advertisement, index: number, onToggle: () => void, onEdit: () => void, onDelete: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "hover:bg-primary/[0.01] transition-colors group",
        !item.is_active && "bg-surface"
      )}
    >
      <td className="p-5 pl-8">
         <button {...attributes} {...listeners} className="p-2 text-text-muted hover:text-primary cursor-grab active:cursor-grabbing">
           <span className="material-symbols-outlined text-lg">drag_indicator</span>
         </button>
      </td>
      <td className="p-5">
         <div className="w-[180px] h-24 rounded-2xl bg-surface border border-border overflow-hidden relative shadow-sm group-hover:scale-[1.05] transition-transform">
            <Image src={item.image_url} className="w-full h-full object-cover" alt="" width={180} height={96} />
            {!item.is_active && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[2px]">
                 <span className="text-[9px] font-black tracking-widest text-text-muted uppercase border-2 border-text-muted px-2 py-1 rounded">Offline</span>
              </div>
            )}
         </div>
      </td>
      <td className="p-5">
         <p className="font-bold text-text-primary text-sm leading-tight">{item.title}</p>
         <p className="text-[10px] text-text-muted mt-1.5 truncate max-w-[200px] hover:text-primary transition-colors cursor-pointer">{item.link_url}</p>
      </td>
      <td className="p-5">
         <p className="text-xs font-bold text-text-primary">{item.display_order === 0 ? 'Placement: Hero Banner' : `Home Row: #${item.display_order || (index + 1)}`}</p>
         <p className="text-[10px] text-text-muted mt-1 uppercase font-black">Display Slot</p>
      </td>
      <td className="p-5">
         <div className="flex justify-center">
            <button 
              onClick={onToggle}
              className={cn(
                "w-12 h-6 rounded-full relative transition-all duration-500 shadow-inner",
                item.is_active ? "bg-primary" : "bg-border"
              )}
            >
               <div className={cn(
                 "w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-md transform",
                 item.is_active ? "translate-x-7" : "translate-x-1"
               )} />
            </button>
         </div>
      </td>
      <td className="p-5 pr-8 text-right">
         <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-2.5 bg-surface hover:bg-white text-text-muted hover:text-primary rounded-xl border border-transparent hover:border-border transition-all shadow-sm">
               <span className="material-symbols-outlined text-sm">edit</span>
            </button>
            <button onClick={onDelete} className="p-2.5 bg-surface hover:bg-destructive/5 text-text-muted hover:text-destructive rounded-xl border border-transparent hover:border-destructive/20 transition-all shadow-sm">
               <span className="material-symbols-outlined text-sm">delete</span>
            </button>
         </div>
      </td>
    </tr>
  );
}

function AdModal({ isOpen, onClose, initialData, onSuccess }: { isOpen: boolean, onClose: () => void, initialData: Advertisement | null, onSuccess: (ad: Advertisement) => void }) {
  const [formData, setFormData] = useState<Partial<Advertisement>>(
    initialData || { title: '', image_url: '', link_url: '', is_active: true, display_order: 1 }
  );
  const [heroMeta, setHeroMeta] = useState<HeroMeta>(DEFAULT_HERO_META);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData(initialData || { title: '', image_url: '', link_url: '', is_active: true, display_order: 1 });
    const rawMeta = initialData?.meta ?? {};
    setHeroMeta({
      subtitle: typeof rawMeta?.subtitle === 'string' ? rawMeta.subtitle : DEFAULT_HERO_META.subtitle,
      showButtons: typeof rawMeta?.showButtons === 'boolean' ? rawMeta.showButtons : DEFAULT_HERO_META.showButtons,
      showPrimaryCta: typeof rawMeta?.showPrimaryCta === 'boolean' ? rawMeta.showPrimaryCta : DEFAULT_HERO_META.showPrimaryCta,
      showSecondaryCta:
        typeof rawMeta?.showSecondaryCta === 'boolean' ? rawMeta.showSecondaryCta : DEFAULT_HERO_META.showSecondaryCta,
      primaryCtaLabel: typeof rawMeta?.primaryCtaLabel === 'string' ? rawMeta.primaryCtaLabel : DEFAULT_HERO_META.primaryCtaLabel,
      primaryCtaHref: typeof rawMeta?.primaryCtaHref === 'string' ? rawMeta.primaryCtaHref : DEFAULT_HERO_META.primaryCtaHref,
      secondaryCtaLabel: typeof rawMeta?.secondaryCtaLabel === 'string' ? rawMeta.secondaryCtaLabel : DEFAULT_HERO_META.secondaryCtaLabel,
      secondaryCtaHref:
        typeof rawMeta?.secondaryCtaHref === 'string'
          ? rawMeta.secondaryCtaHref
          : (initialData?.link_url || DEFAULT_HERO_META.secondaryCtaHref),
      imageFocus:
        rawMeta?.imageFocus === 'left' || rawMeta?.imageFocus === 'center' || rawMeta?.imageFocus === 'right'
          ? rawMeta.imageFocus
          : DEFAULT_HERO_META.imageFocus,
      overlayOpacity:
        typeof rawMeta?.overlayOpacity === 'number'
          ? Math.max(0, Math.min(75, rawMeta.overlayOpacity))
          : DEFAULT_HERO_META.overlayOpacity,
      badgeText: typeof rawMeta?.badgeText === 'string' ? rawMeta.badgeText : DEFAULT_HERO_META.badgeText,
      bgType: (rawMeta?.bgType === 'image' || rawMeta?.bgType === 'solid' || rawMeta?.bgType === 'gradient') ? rawMeta.bgType : DEFAULT_HERO_META.bgType,
      bgColor: typeof rawMeta?.bgColor === 'string' ? rawMeta.bgColor : DEFAULT_HERO_META.bgColor,
      bgGradient: typeof rawMeta?.bgGradient === 'string' ? rawMeta.bgGradient : DEFAULT_HERO_META.bgGradient,
      footerStats: Array.isArray(rawMeta?.footerStats) ? rawMeta.footerStats : DEFAULT_HERO_META.footerStats,
    });
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const isEdit = !!initialData?.id;
      const url = isEdit ? `/api/advertisements/${initialData.id}` : '/api/advertisements';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          display_order: formData.display_order === 0 ? 0 : Number(formData.display_order) || 1,
          meta: (formData.display_order === 0 ? heroMeta : {}),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to save advertisement');
      }
      const data = await res.json();
      onSuccess(data.data as Advertisement);
      toast.success(isEdit ? 'Ad updated' : 'Ad created');
    } catch (error) {
       toast.error(error instanceof Error ? error.message : 'Failed to save advertisement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-text-primary/40 backdrop-blur-md z-[100] flex items-start justify-center p-3 sm:p-4 overflow-y-auto">
       <form 
        onSubmit={handleSubmit}
        className="bg-white w-full max-w-3xl max-h-[92vh] rounded-[2rem] shadow-2xl transform animate-in zoom-in duration-300 overflow-hidden flex flex-col"
      >
          <div className="flex items-start justify-between gap-4 px-5 sm:px-8 py-5 sm:py-6 border-b border-border/80 bg-white">
             <div>
                <h3 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">{initialData ? 'Refine Asset' : 'New Ad Deployment'}</h3>
                <p className="text-sm text-text-secondary mt-1">Configure banner visuals and delivery parameters</p>
             </div>
             <button type="button" onClick={onClose} className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
             </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-5 sm:py-6 space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Campaign Title</label>
                   <input 
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-surface border-border rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-primary shadow-sm" 
                    placeholder="e.g. Smart Semester Sale" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Primary Link</label>
                  <input 
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    className="w-full bg-surface border-border rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-primary shadow-sm" 
                    placeholder="Optional fallback link" 
                  />
                </div>
             </div>

             <div>
                <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Display Placement</label>
                <select
                  value={formData.display_order ?? 1}
                  onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
                  className="w-full bg-surface border-border rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-primary shadow-sm"
                >
                  <option value={0}>Hero Banner (Top Level)</option>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>In-Feed Row {i + 1}</option>
                  ))}
                </select>
             </div>

             {(formData.display_order ?? 1) === 0 && (
               <div className="p-5 bg-surface rounded-3xl border border-border space-y-6">
                 <div>
                   <p className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em]">Poster Design Logic</p>
                   <p className="text-xs text-text-secondary mt-1">Configure text, buttons, and visual background.</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Badge Text</label>
                      <input
                        value={heroMeta.badgeText}
                        onChange={(e) => setHeroMeta((prev) => ({ ...prev, badgeText: e.target.value }))}
                        className="w-full bg-white border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary shadow-sm"
                        placeholder="e.g. STUDENT MARKETPLACE"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Subtitle</label>
                      <input
                        value={heroMeta.subtitle}
                        onChange={(e) => setHeroMeta((prev) => ({ ...prev, subtitle: e.target.value }))}
                        className="w-full bg-white border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary shadow-sm"
                      />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Background Configuration</label>
                    <div className="grid grid-cols-3 gap-2">
                       {['image', 'solid', 'gradient'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setHeroMeta(prev => ({ ...prev, bgType: t as any }))}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                              heroMeta.bgType === t ? "bg-primary text-white border-primary" : "bg-white text-text-secondary border-border hover:bg-surface"
                            )}
                          >
                            {t}
                          </button>
                       ))}
                    </div>

                    {heroMeta.bgType === 'image' && (
                       <div className="space-y-4">
                          <input 
                            value={formData.image_url}
                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                            className="w-full bg-white border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary shadow-sm" 
                            placeholder="Enter image URL..." 
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Focus</label>
                               <select
                                 value={heroMeta.imageFocus}
                                 onChange={(e) => setHeroMeta(prev => ({ ...prev, imageFocus: e.target.value as any }))}
                                 className="w-full bg-white border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary shadow-sm"
                               >
                                  <option value="left">Left</option>
                                  <option value="center">Center</option>
                                  <option value="right">Right</option>
                               </select>
                            </div>
                            <div>
                               <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">Overlay ({heroMeta.overlayOpacity}%)</label>
                               <input type="range" min="0" max="75" step="5" value={heroMeta.overlayOpacity} onChange={(e) => setHeroMeta(prev => ({ ...prev, overlayOpacity: Number(e.target.value) }))} className="w-full accent-primary" />
                            </div>
                          </div>
                       </div>
                    )}

                    {heroMeta.bgType === 'solid' && (
                       <input 
                        value={heroMeta.bgColor}
                        onChange={(e) => setHeroMeta(prev => ({ ...prev, bgColor: e.target.value }))}
                        className="w-full bg-white border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary shadow-sm" 
                        placeholder="e.g. #007f80" 
                      />
                    )}

                    {heroMeta.bgType === 'gradient' && (
                       <input 
                        value={heroMeta.bgGradient}
                        onChange={(e) => setHeroMeta(prev => ({ ...prev, bgGradient: e.target.value }))}
                        className="w-full bg-white border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary shadow-sm" 
                        placeholder="e.g. linear-gradient(...)" 
                      />
                    )}
                 </div>

                 <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
                    <div className="flex items-center justify-between">
                       <p className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em]">Visual CTA Buttons</p>
                       <button
                         type="button"
                         onClick={() => setHeroMeta((prev) => ({ ...prev, showButtons: !prev.showButtons }))}
                         className={cn("w-12 h-6 rounded-full relative transition-all", heroMeta.showButtons ? "bg-primary" : "bg-border")}
                       >
                         <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", heroMeta.showButtons ? "right-1" : "left-1")} />
                       </button>
                    </div>

                    {heroMeta.showButtons && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="p-4 bg-surface/50 rounded-2xl border border-border space-y-3">
                           <input
                             value={heroMeta.primaryCtaLabel}
                             onChange={(e) => setHeroMeta((prev) => ({ ...prev, primaryCtaLabel: e.target.value }))}
                             className="w-full bg-white border-border rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-primary"
                             placeholder="Primary Label"
                           />
                           <input
                             value={heroMeta.primaryCtaHref}
                             onChange={(e) => setHeroMeta((prev) => ({ ...prev, primaryCtaHref: e.target.value }))}
                             className="w-full bg-white border-border rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-primary"
                             placeholder="Primary Link"
                           />
                        </div>
                        <div className="p-4 bg-surface/50 rounded-2xl border border-border space-y-3">
                           <input
                             value={heroMeta.secondaryCtaLabel}
                             onChange={(e) => setHeroMeta((prev) => ({ ...prev, secondaryCtaLabel: e.target.value }))}
                             className="w-full bg-white border-border rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-primary"
                             placeholder="Secondary Label"
                           />
                           <input
                             value={heroMeta.secondaryCtaHref}
                             onChange={(e) => setHeroMeta((prev) => ({ ...prev, secondaryCtaHref: e.target.value }))}
                             className="w-full bg-white border-border rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-primary"
                             placeholder="Secondary Link"
                           />
                        </div>
                      </div>
                    )}
                 </div>

                 <div className="space-y-3">
                    <p className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em]">Footer Stats (Icon + Label)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                       {heroMeta.footerStats?.map((stat, i) => (
                          <div key={i} className="p-3 bg-white rounded-xl border border-border space-y-2">
                             <input 
                              value={stat.icon} 
                              onChange={(e) => {
                                 const next = [...(heroMeta.footerStats || [])];
                                 next[i].icon = e.target.value;
                                 setHeroMeta(prev => ({ ...prev, footerStats: next }));
                              }}
                              className="w-full text-[10px] border border-border rounded-lg p-1" placeholder="Icon (Material)"
                             />
                             <input 
                              value={stat.label} 
                              onChange={(e) => {
                                 const next = [...(heroMeta.footerStats || [])];
                                 next[i].label = e.target.value;
                                 setHeroMeta(prev => ({ ...prev, footerStats: next }));
                              }}
                              className="w-full text-[10px] border border-border rounded-lg p-1" placeholder="Label"
                             />
                          </div>
                       ))}
                    </div>
                 </div>
               </div>
             )}

             {(formData.display_order ?? 1) !== 0 && (
                <div className="space-y-4">
                   <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Banner Asset (URL)</label>
                   <input 
                     value={formData.image_url ?? ''}
                     onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                     className="w-full bg-surface border-border rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-primary shadow-sm" 
                     placeholder="Enter image asset URL..." 
                   />
                </div>
             )}

             <div className="flex items-center gap-6 p-6 bg-surface rounded-2xl border border-border">
                <div className="flex-1">
                   <p className="text-[10px] font-black text-text-primary uppercase tracking-widest">Immediate Activation</p>
                   <p className="text-xs text-text-secondary mt-1">Set as visible in the marketplace carousel</p>
                </div>
                <button 
                   type="button"
                   onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                   className={cn(
                    "w-12 h-6 rounded-full relative transition-all duration-300",
                    formData.is_active ? "bg-primary" : "bg-border"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full absolute top-1 transition-all",
                    formData.is_active ? "right-1" : "left-1"
                  )} />
                </button>
             </div>

          </div>
          <div className="border-t border-border/80 bg-white px-5 sm:px-8 py-4 sm:py-5">
             <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
                <button 
                  type="button"
                  onClick={onClose}
                  className="sm:w-auto w-full px-8 py-3.5 bg-surface text-text-secondary rounded-full font-bold hover:bg-border transition-all text-sm leading-none"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-primary text-white rounded-full font-black shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all text-sm uppercase tracking-widest leading-none disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (initialData ? 'Save Refinements' : 'Deploy To Production')}
                </button>
             </div>
          </div>
       </form>
    </div>
  );
}
