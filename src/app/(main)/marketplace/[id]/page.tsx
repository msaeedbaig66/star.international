import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { formatRelativeTime, formatPrice } from '@/lib/utils';
import Image from 'next/image';
import { ListingActions } from '@/components/marketplace/listing-actions';
import { ListingMetaActions } from '@/components/marketplace/listing-meta-actions';
import { ListingRatingAction } from '@/components/marketplace/listing-rating-action';
import { ListingFeedbackSection } from '@/components/marketplace/listing-feedback-section';
import { ListingImageGallery } from '@/components/marketplace/listing-image-gallery';
import { FollowButton } from '@/components/shared/follow-button';
import { getAdminVisibleMessage, isUndoWindowOpen, parseAdminActionNote } from '@/lib/admin-report-action';
import { ViewTracker } from '@/components/shared/view-tracker';
import { ROUTES } from '@/lib/routes';
import { getOptimizedImageUrl } from '@/lib/cloudinary';
import { UserLink, CategoryBreadcrumb } from '@/components/shared/navigation-links';

import type { Profile } from '@/types/database';

const RELATED_ITEMS_SELECT = 'id, title, images, listing_type, rental_price, price, campus'
const RELATED_ITEMS_SELECT_FALLBACK = 'id, title, images, price, campus'
const RELATED_ITEMS_ADVANCED_COLUMNS = ['listing_type', 'rental_price'] as const

function isMissingRelatedItemsColumnError(error: any) {
 const message = String(error?.message || '').toLowerCase()
 return RELATED_ITEMS_ADVANCED_COLUMNS.some(
 (column) => message.includes('column') && message.includes(column)
 )
}

export const revalidate = 0; // Ensure fresh data for status/moderation checks

export default async function ListingDetailPage({ 
  params,
  searchParams
}: { 
  params: { id: string },
  searchParams: { variant?: string }
}) {

 const supabase = await createClient();
 const { data: { user } } = await supabase.auth.getUser();
 
 const [listingRes, viewerRes] = await Promise.all([
 supabase
 .from('listings')
 .select('*, seller:profiles!seller_id(id,username,full_name,avatar_url,university,bio,follower_count,following_count,rating_avg,rating_count,role)')
 .eq('id', params.id)
 .single(),
 user 
 ? supabase.from('profiles').select('*').eq('id', user.id).maybeSingle() 
 : Promise.resolve({ data: null })
 ]);

 const listing = listingRes.data;
 const listingError = listingRes.error;
 const currentUserProfile = viewerRes.data;

 if (listingError || !listing) {
 if (listingError) {
 console.error('Listing Fetch Error:', listingError);
 }
 return notFound();
 }

 // Allow owner, admin, or buyer (if approved) to view
 const isOwner = user?.id === listing.seller_id;
 const isAdmin = currentUserProfile?.role === 'admin';

 const canView = isOwner || isAdmin || (listing.moderation === 'approved' && listing.status === 'available');

 if (!canView) {
 return notFound();
 }

 const listingType = (listing.listing_type || 'sell') as 'sell' | 'rent' | 'both';

 // Construct comment filter: approved OR authored by current user (if any)
 // Admins see all comments
 let commentsQuery = supabase
 .from('comments')
 .select('id, content, created_at, moderation, author_id, author:profiles!author_id(full_name, avatar_url, username)')
 .eq('listing_id', listing.id)
 .is('parent_id', null);

 if (isAdmin) {
 // No extra filter
 } else if (user) {
 commentsQuery = commentsQuery.or(`moderation.eq.approved,author_id.eq.${user.id}`);
 } else {
 commentsQuery = commentsQuery.eq('moderation', 'approved');
 }

 const [
 relatedItemsRes,
 { count: sellerListingsCount },
 { data: listingRatings },
 { data: comments },
 { count: sellerFollowerCount },
 { data: sellerRatingsRaw },
 userWishlistRes,
 userFollowRes,
 userRatingRes
 ] = await Promise.all([
 supabase.from('listings').select(RELATED_ITEMS_SELECT).eq('category', listing.category).neq('id', listing.id).eq('moderation', 'approved').eq('status', 'available').limit(3),
 supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', listing.seller_id),
 supabase.from('ratings').select('id, score, created_at, reviewer:profiles!reviewer_id(full_name, avatar_url, username)').eq('listing_id', listing.id).order('created_at', { ascending: false }),
 commentsQuery.order('created_at', { ascending: false }),
 supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', listing.seller_id),
 supabase.from('ratings').select('score').eq('subject_id', listing.seller_id),
 user ? supabase.from('wishlist').select('user_id').eq('user_id', user.id).eq('listing_id', listing.id).maybeSingle() : Promise.resolve({ data: null }),
 user && user.id !== listing.seller_id ? supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('following_id', listing.seller_id).maybeSingle() : Promise.resolve({ data: null }),
 user && user.id !== listing.seller_id ? supabase.from('ratings').select('id').eq('reviewer_id', user.id).eq('listing_id', listing.id).maybeSingle() : Promise.resolve({ data: null })
 ]);

 const relatedItems = relatedItemsRes.data || [];
 const isSaved = !!userWishlistRes.data;
 const sellerIsFollowing = !!userFollowRes.data;
 const hasRatedSeller = !!userRatingRes.data;
 const isOwnListing = user?.id === listing.seller_id;

 const images = (listing.images as string[]) || [];
 const variants = (listing.variants as {name: string, price: number}[]) || [];
 const selectedVariantName = searchParams.variant;
 const selectedVariant = variants.find(v => v.name === selectedVariantName);

 const displayPrice = selectedVariant 
    ? selectedVariant.price 
    : (listingType === 'rent' ? Number(listing.rental_price || 0) : Number(listing.price || 0));

 const listingTypeLabel = listingType === 'sell' ? 'For Sale' : listingType === 'rent' ? 'For Rent' : 'Sale or Rent';
 const rentalPeriodLabel = listing.rental_period === 'monthly' ? 'per month' : listing.rental_period === 'weekly' ? 'per week' : listing.rental_period === 'semester' ? 'per semester' : 'per day';
 
 const seller = listing.seller as unknown as Profile;
 const sellerRatingAvg = (seller?.rating_avg || 0).toFixed(1);
 const listingRatingAvg = (listing.rating_avg || 0).toFixed(1);
 const listingRatingCount = listing.rating_count || 0;
 const sellerFollowers = seller?.follower_count || 0;

 const adminActionMeta = parseAdminActionNote(listing.rejection_note || null);
 const warningMessage =
 adminActionMeta?.action === 'warn' && isUndoWindowOpen(adminActionMeta)
 ? getAdminVisibleMessage(listing.rejection_note)
 : null;

 return (
 <main className="pt-8 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-screen">
 {warningMessage && (
 <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-900">
 <p className="text-xs font-black uppercase tracking-[0.2em]">Admin Warning</p>
 <p className="text-sm mt-1">{warningMessage}</p>
 </div>
 )}
 <div className="flex flex-col lg:flex-row gap-10">
 <div className="flex-1 space-y-8">
 <CategoryBreadcrumb 
 crumbs={[
 { label: 'Marketplace', href: ROUTES.marketplace.list() },
 { label: listing.category || 'General', href: ROUTES.marketplace.list() + `?category=${listing.category}` },
 { label: listing.title, href: '#' }
 ]} 
 className="mb-8"
 />
 <ListingImageGallery images={images} title={listing.title} />
 <div className="bg-surface-container-lowest p-10 rounded-lg shadow-sm border border-border">
 <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
 <div>
 <span className="text-primary font-bold text-xs tracking-widest uppercase mb-2 block">{listing.category || 'General'}</span>
 <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2 break-words">{listing.title}</h1>
 <div className="flex items-center gap-3">
 <div className="flex items-center text-primary">
 <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
 <span className="font-bold ml-1 text-on-surface">{sellerRatingAvg}</span>
 </div>
 <span className="text-outline-variant">&bull;</span>
 <span className="text-sm text-on-surface-variant font-medium">
 Item {listingRatingAvg} ({listingRatingCount})
 </span>
 <span className="text-outline-variant">&bull;</span>
 <span className="text-sm text-on-surface-variant font-medium">{listing.view_count || 0} views</span>
 <span className="text-outline-variant">&bull;</span>
 <span className="text-sm text-on-surface-variant font-medium">ID #{listing.id.slice(0, 8).toUpperCase()}</span>
 </div>
 </div>
 <div className="sm:text-right">
 <div className="text-3xl font-extrabold text-primary">{formatPrice(displayPrice)}</div>
 <div className="text-[11px] font-black uppercase tracking-widest text-text-muted mt-2">{listingTypeLabel}</div>
 </div>
 </div>
 <div className="flex items-center gap-6 mt-8 pt-8 border-t border-surface-container-high text-sm text-on-surface-variant flex-wrap">
 <div className="flex items-center gap-2">
 <span className="material-symbols-outlined text-primary">location_on</span>
 <span>{listing.campus || 'NTU Faisalabad'}</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="material-symbols-outlined text-primary">schedule</span>
 <span>Posted {formatRelativeTime(new Date(listing.created_at))}</span>
 </div>
 </div>
 </div>
 <div className="space-y-12 py-4">
 <section>
 <h3 className="text-xl font-bold mb-6 flex items-center gap-2">Description</h3>
 <p className="text-on-surface-variant leading-loose text-lg font-body whitespace-pre-wrap">
 {listing.description}
 </p>
 </section>

  {variants.length > 0 && (
    <section className="bg-surface-container-low p-8 rounded-2xl border border-border/50">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">sell</span>
        Select Option
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {variants.map((v) => (
          <Link
            key={v.name}
            href={`?variant=${encodeURIComponent(v.name)}`}
            scroll={false}
            className={`flex flex-col p-5 rounded-2xl border-2 transition-all group ${
              selectedVariantName === v.name 
                ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' 
                : 'border-border bg-surface hover:border-primary/30 hover:bg-surface-container-high'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className={`font-black uppercase tracking-wider text-xs ${selectedVariantName === v.name ? 'text-primary' : 'text-text-muted'}`}>
                {v.name}
              </span>
              {selectedVariantName === v.name && (
                <span className="material-symbols-outlined text-primary text-xl animate-in zoom-in duration-300">check_circle</span>
              )}
            </div>
            <span className="text-xl font-black text-on-surface">
              {formatPrice(v.price)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )}

 <section>
 <h3 className="text-xl font-bold mb-6">Item Details</h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12 text-sm">
 <div className="flex justify-between">
 <span className="text-on-surface-variant">Condition</span>
 <span className="font-semibold text-on-surface">{listing.condition || 'Used'}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-on-surface-variant">Category</span>
 <span className="font-semibold text-on-surface">{listing.category || 'General'}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-on-surface-variant">Campus</span>
 <span className="font-semibold text-on-surface">{listing.campus || 'NTU Faisalabad'}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-on-surface-variant">Listing Type</span>
 <span className="font-semibold text-on-surface">{listingTypeLabel}</span>
 </div>
 {(listingType === 'rent' || listingType === 'both') && (
 <>
 <div className="flex justify-between">
 <span className="text-on-surface-variant">Rental Price</span>
 <span className="font-semibold text-on-surface">{formatPrice(Number(listing.rental_price || 0))}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-on-surface-variant">Rental Period</span>
 <span className="font-semibold text-on-surface">{rentalPeriodLabel}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-on-surface-variant">Refundable Deposit</span>
 <span className="font-semibold text-on-surface">{formatPrice(Number(listing.rental_deposit || 0))}</span>
 </div>
 </>
 )}
 <div className="flex justify-between">
 <span className="text-on-surface-variant">Contact Preference</span>
 <span className="font-semibold text-on-surface">{listing.contact_preference === 'phone' ? 'Phone + In-App' : 'In-App Chat'}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-on-surface-variant">Listed On</span>
  <span className="font-semibold text-on-surface">{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(listing.created_at))}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-on-surface-variant">Availability</span>
 <span className="font-semibold text-on-surface capitalize">{listing.status || 'available'}</span>
 </div>
 </div>
 </section>
 <ListingFeedbackSection
 listingId={listing.id}
 canComment={!!user}
 ratings={listingRatings || []}
 comments={comments || []}
 viewerRole={currentUserProfile?.role}
 currentUser={currentUserProfile}
 />
 </div>
 </div>
 <div className="w-full lg:w-[30%] lg:min-w-[340px] lg:max-w-[440px] space-y-6 flex-shrink-0">
 <div className="sticky top-24 space-y-6">
 <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm border border-border">
 <div className="mb-6">
 <span className="text-on-surface-variant text-sm block mb-1">Price</span>
 <div className="text-4xl font-black text-primary tracking-tight">{formatPrice(displayPrice)}</div>
 {(listingType === 'rent' || listingType === 'both') && (
 <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted mt-2">{rentalPeriodLabel}</p>
 )}
 </div>
 {!isOwnListing ? (
 <>
 <ListingActions
 listingId={listing.id}
 sellerId={seller.id}
 initialIsSaved={isSaved}
 isAdminSeller={listing.is_official || seller.role === 'admin'}
 price={displayPrice}
 itemTitle={listing.title}
 selectedVariantName={selectedVariantName}
 hasVariants={variants.length > 0}
 />
 <ListingRatingAction
 listingId={listing.id}
 sellerId={seller.id}
 sellerName={seller?.full_name || 'Seller'}
 hasRated={hasRatedSeller}
 />
 </>
 ) : (
 <div className="space-y-3">
 <div className="w-full py-4 bg-surface text-text-secondary rounded-full font-bold flex items-center justify-center gap-2 border border-border">
 <span className="material-symbols-outlined">inventory_2</span>
 This is your listing
 </div>
 </div>
 )}
 <ListingMetaActions title={listing.title} listingId={listing.id} />
 <div className="mt-8 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-4">
 <div className="flex gap-3">
 <span className="material-symbols-outlined text-amber-700">gpp_maybe</span>
 <div>
 <h4 className="text-sm font-black uppercase tracking-wider text-amber-800 mb-2">Scam Safety Notice</h4>
 <p className="text-xs text-amber-900 leading-relaxed">
 Allpanga is not responsible for losses from scam deals. Please inspect the item before payment, verify seller details,
 and build trust step-by-step before completing the transaction.
 </p>
 <div className="mt-3 space-y-1.5 text-xs font-semibold text-amber-800">
 <p className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">check_circle</span>Meet in a safe public campus spot</p>
 <p className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">check_circle</span>Test or inspect item before paying</p>
 <p className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">check_circle</span>Keep chat history and receipts</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
 <div className="h-16 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent"></div>
 <div className="px-6 pb-6 -mt-8">
 {listing.is_official ? (
 <div className="flex items-center gap-4 bg-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-500/20">
 <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
 <span className="material-symbols-outlined text-white text-3xl">verified</span>
 </div>
 <div>
 <h4 className="text-xl font-black text-white tracking-tight uppercase">Official Store</h4>
 <p className="text-emerald-100 text-xs font-bold tracking-widest mt-0.5">PLATFORM VERIFIED</p>
 </div>
 </div>
 ) : (
 <div className="flex items-start gap-4">
 <div className="relative shrink-0">
 <UserLink user={seller} size="lg" showName={false} className="hover:opacity-90 transition-opacity" viewerRole={currentUserProfile?.role} />
 <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-border">
 <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
 </div>
 </div>
 <div className="min-w-0 flex-1 pt-1">
 <UserLink user={seller} showAvatar={false} size="lg" className="text-on-surface hover:text-primary transition-colors block text-xl font-extrabold leading-tight" viewerRole={currentUserProfile?.role} />
 <p className="text-primary text-[11px] font-black uppercase tracking-[0.18em] mt-1">Student Seller</p>
 <Link href={ROUTES.profile.view(seller?.username || 'user')} className="text-on-surface-variant text-sm hover:text-primary transition-colors inline-block mt-0.5">
 @{seller?.username || 'user'}
 </Link>
 </div>
 </div>
 )}
 
 <div className="grid grid-cols-2 gap-3 mt-6">
 <div className="rounded-xl border border-border bg-surface px-3 py-3">
 <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Campus</p>
 <p className="text-sm font-bold text-on-surface truncate">{listing.is_official ? 'Allpanga Platform' : (seller?.university || 'NTU Faisalabad')}</p>
 </div>
 <div className="rounded-xl border border-border bg-surface px-3 py-3">
 <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Status</p>
 <div className="flex items-center text-emerald-600 font-black">
 <span className="material-symbols-outlined text-sm mr-1">check_circle</span>
 VERIFIED
 </div>
 </div>
 {!listing.is_official && (
 <>
 <div className="rounded-xl border border-border bg-surface px-3 py-3">
 <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Active Listings</p>
 <p className="text-sm font-bold text-on-surface">{sellerListingsCount || 0} items</p>
 </div>
 <div className="rounded-xl border border-border bg-surface px-3 py-3">
 <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">Followers</p>
 <p className="text-sm font-bold text-on-surface">{sellerFollowers}</p>
 </div>
 </>
 )}
 </div>
 
 {!isOwnListing && !listing.is_official && (
 <div className="mt-5">
 <FollowButton
 userId={seller.id}
 initialIsFollowing={sellerIsFollowing}
 initialFollowerCount={sellerFollowers}
 showFollowerCount
 compact
 />
 </div>
 )}
 
 {!listing.is_official && (
 <Link href={ROUTES.profile.view(seller?.username)}>
 <button className="w-full mt-5 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container-high transition-colors rounded-full border border-outline-variant/30">
 View Profile
 </button>
 </Link>
 )}
 </div>
 </div>
 {relatedItems.length > 0 && (
 <div className="space-y-4">
 <h4 className="text-lg font-bold px-2">Similar Items</h4>
 <div className="grid grid-cols-1 gap-4">
 {relatedItems.map((item: any) => (
 <Link key={item.id} href={ROUTES.marketplace.detail(item.id)} className="group flex gap-4 bg-surface-container-lowest p-3 rounded-lg hover:shadow-md transition-shadow cursor-pointer border border-border">
 <div className="relative w-24 h-24 rounded-md overflow-hidden flex-shrink-0">
  <Image 
    className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
    src={getOptimizedImageUrl(item.images?.[0], 300, 300) || 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=200'} 
    alt={item.title}
    fill
  />
 </div>
 <div className="flex flex-col justify-center min-w-0">
 <h5 className="text-sm font-bold text-on-surface line-clamp-1">{item.title}</h5>
 <p className="text-primary font-bold mt-1">
 {formatPrice(Number((item as any).listing_type === 'rent' ? ((item as any).rental_price || item.price || 0) : (item.price || 0)))}
 </p>
 <span className="text-[10px] text-on-surface-variant mt-1 truncate">{item.campus || 'NTU Faisalabad'}</span>
 </div>
 </Link>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 <ViewTracker targetId={listing.id} type="listing" />
 </main>
 );
}
