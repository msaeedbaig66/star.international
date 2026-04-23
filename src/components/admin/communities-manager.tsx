'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SafeTime, SafeDate, HydratedOnly } from '@/components/shared/safe-time';
import Image from 'next/image';
import { ApproveButton } from './approve-button';
import { RejectModal } from './reject-modal';
import { DetailPanel } from './detail-panel';
import { toast } from 'sonner';
import { parseSoftDeleteNote } from '@/lib/content-soft-delete';
import { uploadToCloudinary, getOptimizedImageUrl } from '@/lib/cloudinary';

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: 'field' | 'project';
  field: string;
  avatar_url: string;
  banner_url: string;
  is_official: boolean;
  rejection_note?: string | null;
  moderation: 'pending' | 'approved' | 'rejected';
  created_at: string;
  owner?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    university: string;
  };
}

interface CommunitiesManagerProps {
  initialCommunities: any[];
  stats: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
}

export function CommunitiesManager({ initialCommunities, stats }: CommunitiesManagerProps) {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>(initialCommunities);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'deleted'>('all');
  const [search, setSearch] = useState('');
  
  const [selectedItem, setSelectedItem] = useState<Community | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [itemToReject, setItemToReject] = useState<string | null>(null);
  const [loadingOfficial, setLoadingOfficial] = useState(false);
  const [isCreateOfficialOpen, setIsCreateOfficialOpen] = useState(false);
  const [creatingOfficial, setCreatingOfficial] = useState(false);
  const [createOfficialForm, setCreateOfficialForm] = useState({
    name: '',
    description: '',
    type: 'project' as 'field' | 'project',
    field: '',
    avatar_url: '',
    banner_url: '',
    rules: '',
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File, type: 'avatar' | 'banner') => {
    try {
      if (type === 'avatar') setUploadingAvatar(true);
      else setUploadingBanner(true);

      const url = await uploadToCloudinary(file, 'communities');
      
      setCreateOfficialForm(prev => ({
        ...prev,
        [type === 'avatar' ? 'avatar_url' : 'banner_url']: url
      }));
      toast.success(`${type === 'avatar' ? 'Avatar' : 'Banner'} uploaded!`);
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      if (type === 'avatar') setUploadingAvatar(false);
      else setUploadingBanner(false);
    }
  };

  // Improved filtering to prevent "hidden tasks"
  const filteredCommunities = useMemo(() => {
    return communities.filter(item => {
      const query = search.toLowerCase();
      const name = (item.name || '').toLowerCase();
      const slug = (item.slug || '').toLowerCase();
      const field = (item.field || '').toLowerCase();
      const isDeleted = !!parseSoftDeleteNote(item.rejection_note);

      let matchesFilter = true;
      if (filter === 'pending') matchesFilter = item.moderation === 'pending' && !isDeleted;
      else if (filter === 'approved') matchesFilter = item.moderation === 'approved' && !isDeleted;
      else if (filter === 'rejected') matchesFilter = item.moderation === 'rejected' && !isDeleted;
      else if (filter === 'deleted') matchesFilter = isDeleted;
      else if (filter === 'all') matchesFilter = true; // Show everything in ALL, including pending

      const matchesSearch = name.includes(query) || slug.includes(query) || field.includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [communities, filter, search]);

  const updateModerationLocally = (id: string, status: 'approved' | 'rejected') => {
    setCommunities(prev => prev.map(item => 
      item.id === id ? { ...item, moderation: status } : item
    ));
    if (id === selectedItem?.id) {
       setSelectedItem(prev => prev ? { ...prev, moderation: status } : null);
    }
    router.refresh(); // Sync sidebar counts
  };

  const updateCommunityLocally = (id: string, payload: Partial<Community>) => {
    setCommunities((prev) => prev.map((item) => (item.id === id ? { ...item, ...payload } : item)));
    if (id === selectedItem?.id) {
      setSelectedItem((prev) => (prev ? { ...prev, ...payload } : null));
    }
    router.refresh(); // Sync sidebar counts
  };

  const handleAdminDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/communities/${id}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || 'Failed to delete community');
      const next = result?.data || {};
      const current = communities.find((item) => item.id === id);
      updateCommunityLocally(id, {
        moderation: next.moderation || current?.moderation || 'rejected',
        rejection_note: next.rejection_note ?? current?.rejection_note ?? null,
      });
      toast.success(result?.already_deleted ? 'Already deleted. Undo is still available.' : 'Community deleted. Undo available for 2 days.');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to delete community');
    }
  };

  const handleAdminRecover = async (id: string) => {
    try {
      const response = await fetch(`/api/communities/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recover' }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || 'Failed to recover community');
      const next = result?.data || {};
      updateCommunityLocally(id, {
        moderation: next.moderation || 'approved',
        rejection_note: next.rejection_note || null,
      });
      toast.success('Community recovered successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to recover community');
    }
  };

  const toggleOfficialStatus = async (id: string, current: boolean) => {
    try {
      setLoadingOfficial(true);
      const res = await fetch(`/api/admin/communities/official`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_official: !current }),
      });
      if (!res.ok) throw new Error();
      
      setCommunities(prev => prev.map(item => 
        item.id === id ? { ...item, is_official: !current } : item
      ));
      if (id === selectedItem?.id) {
         setSelectedItem(prev => prev ? { ...prev, is_official: !current } : null);
      }
      toast.success(`Verification tick updated`);
    } catch (error) {
       toast.error('Failed to update status');
    } finally {
      setLoadingOfficial(false);
    }
  };

  const resetCreateOfficialForm = () => {
    setCreateOfficialForm({
      name: '',
      description: '',
      type: 'project',
      field: '',
      avatar_url: '',
      banner_url: '',
      rules: '',
    });
  };

  const handleCreateOfficial = async () => {
    if (!createOfficialForm.name.trim()) {
      toast.error('Community name is required');
      return;
    }

    try {
      setCreatingOfficial(true);
      const response = await fetch('/api/admin/communities/official', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: createOfficialForm.name.trim(),
          description: createOfficialForm.description.trim(),
          type: createOfficialForm.type,
          field: createOfficialForm.field.trim(),
          avatar_url: createOfficialForm.avatar_url.trim(),
          banner_url: createOfficialForm.banner_url.trim(),
          rules: createOfficialForm.rules.trim(),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to create official community');
      }

      const created = result?.data as any;
      if (created) {
        const normalizedCreated: Community = {
          ...created,
          description: created.description || '',
          field: created.field || '',
          avatar_url: created.avatar_url || '',
          banner_url: created.banner_url || '',
          owner: created.owner || {
            id: created.owner_id || '',
            username: 'unknown',
            full_name: 'Unknown Owner',
            avatar_url: '/images/default-avatar.svg',
            university: 'N/A',
          },
        };
        setCommunities((prev) => [normalizedCreated, ...prev]);
      }
      toast.success('Official community created');
      setIsCreateOfficialOpen(false);
      resetCreateOfficialForm();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create official community');
    } finally {
      setCreatingOfficial(false);
    }
  };

  const selectedDeleteMeta = parseSoftDeleteNote(selectedItem?.rejection_note);

  return (
    <div className="space-y-8 pb-32">
       {/* Heading */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold text-text-primary tracking-tight">Community Oversight</h2>
          <p className="text-text-secondary mt-1 text-lg">Validate emerging student communities and project groups</p>
        </div>
        <button
          onClick={() => setIsCreateOfficialOpen(true)}
          className="px-6 py-2.5 bg-primary text-white rounded-full font-bold text-sm shadow-lg hover:shadow-primary/20 flex items-center gap-2"
        >
           <span className="material-symbols-outlined text-sm">add</span>
           Create Official
        </button>
      </div>

       {/* Stats Grid */}
       <HydratedOnly>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-border">
            <p className="text-[10px] font-black uppercase text-text-muted">In Validation</p>
            <p className="text-3xl font-black text-amber-500 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-border">
            <p className="text-[10px] font-black uppercase text-text-muted">Total Live</p>
            <p className="text-3xl font-black text-primary mt-1">{communities.filter(c => c.moderation === 'approved').length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-border">
            <p className="text-[10px] font-black uppercase text-text-muted">Field Units</p>
            <p className="text-3xl font-black text-blue-500 mt-1">{communities.filter(c => c.type === 'field').length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-border">
            <p className="text-[10px] font-black uppercase text-text-muted">Official Org</p>
            <p className="text-3xl font-black text-purple-500 mt-1">{communities.filter(c => c.is_official).length}</p>
          </div>
        </div>
      </HydratedOnly>

      {/* Inline Create Official Form */}
      {isCreateOfficialOpen && (
        <div className="bg-white border-2 border-primary/20 rounded-3xl p-8 mb-10 shadow-xl shadow-primary/5 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-black text-text-primary tracking-tight">Create Official Community</h3>
              <p className="text-sm text-text-muted mt-1">This community will be managed by the system administrator email.</p>
            </div>
            <button
              onClick={() => {
                setIsCreateOfficialOpen(false);
                resetCreateOfficialForm();
              }}
              className="p-3 rounded-xl hover:bg-surface text-text-muted hover:text-text-primary transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Side: Images */}
            <div className="space-y-4">
               <div className="relative group aspect-square rounded-2xl border-2 border-dashed border-border bg-surface p-4 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-all cursor-pointer overflow-hidden" onClick={() => avatarInputRef.current?.click()}>
                 <input ref={avatarInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) handleImageUpload(e.target.files[0], 'avatar') }} />
                 {createOfficialForm.avatar_url ? (
                   <Image src={createOfficialForm.avatar_url} alt="Avatar" fill className="object-cover" unoptimized />
                 ) : (
                   <>
                      <span className="material-symbols-outlined text-4xl text-primary/40 mb-2">{uploadingAvatar ? 'hourglass_empty' : 'add_photo_alternate'}</span>
                      <span className="text-xs font-black uppercase tracking-widest text-text-primary">Logo / DP</span>
                   </>
                 )}
                 {uploadingAvatar && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><span className="material-symbols-outlined animate-spin">sync</span></div>}
               </div>

               <div className="relative group aspect-video rounded-2xl border-2 border-dashed border-border bg-surface p-4 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-all cursor-pointer overflow-hidden" onClick={() => bannerInputRef.current?.click()}>
                 <input ref={bannerInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => { if(e.target.files?.[0]) handleImageUpload(e.target.files[0], 'banner') }} />
                 {createOfficialForm.banner_url ? (
                   <Image src={createOfficialForm.banner_url} alt="Banner" fill className="object-cover" unoptimized />
                 ) : (
                   <>
                      <span className="material-symbols-outlined text-4xl text-primary/40 mb-2">{uploadingBanner ? 'hourglass_empty' : 'wallpaper'}</span>
                      <span className="text-xs font-black uppercase tracking-widest text-text-primary">Cover Image</span>
                   </>
                 )}
                 {uploadingBanner && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><span className="material-symbols-outlined animate-spin">sync</span></div>}
               </div>
            </div>

            {/* Right Side: Details */}
            <div className="lg:col-span-2 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Community Name</label>
                  <input
                    value={createOfficialForm.name}
                    onChange={(e) => setCreateOfficialForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-2xl border border-border bg-surface px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="e.g. Computer Science Central"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Type of Space</label>
                  <select
                    value={createOfficialForm.type}
                    onChange={(e) => setCreateOfficialForm((prev) => ({ ...prev, type: e.target.value as 'field' | 'project' }))}
                    className="w-full rounded-2xl border border-border bg-surface px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="project">Project Community</option>
                    <option value="field">Academic Field</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Academic Field (Tags)</label>
                <input
                  value={createOfficialForm.field}
                  onChange={(e) => setCreateOfficialForm((prev) => ({ ...prev, field: e.target.value }))}
                  className="w-full rounded-2xl border border-border bg-surface px-5 py-3 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="e.g. Engineering, Arts, Business"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">About this community</label>
                <textarea
                  value={createOfficialForm.description}
                  onChange={(e) => setCreateOfficialForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-2xl border border-border bg-surface px-5 py-3 text-sm font-medium min-h-[100px] focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Describe the purpose of this official community..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Rules & Guidelines</label>
                <textarea
                  value={createOfficialForm.rules}
                  onChange={(e) => setCreateOfficialForm((prev) => ({ ...prev, rules: e.target.value }))}
                  className="w-full rounded-2xl border border-border bg-surface px-5 py-3 text-sm font-medium min-h-[80px] focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Set expectations for behavior..."
                />
              </div>

              <button
                onClick={handleCreateOfficial}
                disabled={creatingOfficial || !createOfficialForm.name}
                className="w-full rounded-2xl bg-primary text-white py-4 text-sm font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {creatingOfficial ? 'Deploying Community...' : 'Launch Official Community'}
              </button>
            </div>
          </div>
        </div>
      )}

       {/* Filter and Table */}
       <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex bg-surface p-1 rounded-xl w-fit border border-border">
              {['all', 'pending', 'approved', 'rejected', 'deleted'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={cn(
                    "px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest",
                    filter === f ? "bg-white text-text-primary shadow-sm" : "text-text-muted hover:text-text-primary"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            
            <div className="relative flex-1 group">
               <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors">hub</span>
               <input 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full bg-white border border-border rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/10 transition-all font-medium" 
                 placeholder="Search by community name, slug or field..."
               />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-surface border-b border-border">
                   <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] pl-8">Community Identity</th>
                   <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Context</th>
                   <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Ownership</th>
                   <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-center">Status</th>
                   <th className="p-5 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-right pr-8">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border">
                 {filteredCommunities.map((item) => {
                   const deleteMeta = parseSoftDeleteNote(item.rejection_note);
                   const isDeleted = !!deleteMeta;
                   const canRecover = isDeleted;
                   return (
                   <tr 
                     key={item.id} 
                     className="hover:bg-primary/[0.01] transition-colors"
                   >
                     <td className="p-5 pl-8">
                       <div className="flex items-center gap-4">
                          <Image 
                            src={getOptimizedImageUrl(item.avatar_url || '/images/default-avatar.svg', 80, 80)} 
                            className="w-10 h-10 rounded-xl bg-surface object-cover border border-border" 
                            alt="" 
                            width={40} 
                            height={40} 
                          />
                          <div>
                            <p className="font-bold text-text-primary text-sm flex items-center gap-1.5 leading-none">
                              {item.name}
                              {item.is_official && <span className="material-symbols-outlined text-blue-500 text-sm shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>}
                            </p>
                            <p className="text-[10px] text-text-muted mt-1 uppercase font-black">/c/{item.slug}</p>
                          </div>
                       </div>
                     </td>
                     <td className="p-5">
                        <p className="text-xs font-bold text-text-primary capitalize">{item.type} Space</p>
                        <p className="text-[10px] text-text-muted font-black uppercase mt-1 tracking-wider">{item.field || 'General'}</p>
                     </td>
                      <td className="p-5">
                        <div className="text-sm">
                           <p className="font-bold text-text-primary truncate max-w-[120px]">{item.owner?.full_name || 'Unknown Owner'}</p>
                           <p className="text-[10px] text-text-muted mt-0.5">{item.owner?.university || 'N/A'}</p>
                        </div>
                      </td>
                     <td className="p-5">
                        <div className="flex justify-center">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                            isDeleted && "bg-surface text-text-muted border border-border",
                            item.moderation === 'pending' && "bg-amber-100 text-amber-700",
                            item.moderation === 'approved' && "bg-primary/10 text-primary",
                            item.moderation === 'rejected' && "bg-destructive/10 text-destructive",
                          )}>
                             {isDeleted ? 'deleted' : item.moderation}
                          </span>
                        </div>
                     </td>
                      <td className="p-5 pr-8 text-right" onClick={(e) => e.stopPropagation()}>
                        <HydratedOnly>
                          <div className="flex justify-end gap-3">
                            {canRecover ? (
                              <button
                                onClick={() => handleAdminRecover(item.id)}
                                className="text-primary font-black text-[10px] uppercase tracking-widest hover:underline"
                              >
                                Recover
                              </button>
                            ) : (
                              <>
                                <ApproveButton 
                                  id={item.id} 
                                  type="community" 
                                  variant="text" 
                                  label="Approve"
                                  onSuccess={() => updateModerationLocally(item.id, 'approved')}
                                />
                                <button 
                                  onClick={() => { setItemToReject(item.id); setIsRejectModalOpen(true); }}
                                  className="text-destructive font-black text-[10px] uppercase tracking-widest hover:underline"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => toggleOfficialStatus(item.id, item.is_official)}
                                  className={cn("font-black text-[10px] uppercase tracking-widest hover:underline", item.is_official ? "text-blue-500" : "text-text-secondary")}
                                >
                                  {item.is_official ? 'Remove Blue Tick' : 'Give Blue Tick'}
                                </button>
                                <button
                                  onClick={() => handleAdminDelete(item.id)}
                                  className="text-text-secondary font-black text-[10px] uppercase tracking-widest hover:underline"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </HydratedOnly>
                      </td>
                   </tr>
                   );
                 })}
                 {filteredCommunities.length === 0 && (
                   <tr>
                     <td colSpan={5} className="p-10 text-center text-sm text-text-secondary">
                       No communities found for this filter.
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
          </div>
       </div>




       {/* Reject Modal */}
       <RejectModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        id={itemToReject || ''}
        type="community"
        onSuccess={() => {
          if (itemToReject) updateModerationLocally(itemToReject, 'rejected');
          if (itemToReject === selectedItem?.id) setIsPanelOpen(false);
          setIsRejectModalOpen(false);
        }}
      />
    </div>
  );
}

