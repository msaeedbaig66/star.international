'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NetflixRow, NetflixCard } from '@/components/shared/netflix-row'
import { ListingCard } from '@/components/shared/listing-card'
import type { Listing, Profile } from '@/types/database'

type ListingWithSeller = Listing & { seller?: Pick<Profile, 'username' | 'avatar_url' | 'full_name'> }

export function RecentlyViewed() {
  const [items, setItems] = useState<ListingWithSeller[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true;
    async function fetchRecentlyViewed() {
      try {
        const stored = localStorage.getItem('allpanga_recently_viewed');
        if (!stored) {
          if (isMounted) setLoading(false);
          return;
        }

        let ids: string[] = [];
        try {
          ids = JSON.parse(stored);
        } catch {
          localStorage.removeItem('allpanga_recently_viewed');
          if (isMounted) setLoading(false);
          return;
        }
        if (!ids || !Array.isArray(ids) || !ids.length) {
          if (isMounted) setLoading(false);
          return;
        }

        const supabase = createClient();
        
        // Parallelize listing fetch and user session check
        const [listingsRes, authRes] = await Promise.all([
          supabase
            .from('listings')
            .select('*, seller:profiles!listings_seller_id_fkey(username, avatar_url, full_name, follower_count), wishlist_count:wishlist(count)')
            .in('id', ids.slice(0, 20))
            .eq('moderation', 'approved')
            .eq('status', 'available'),
          supabase.auth.getUser()
        ]);

        if (!isMounted) return;

        const data = listingsRes.data;
        const user = authRes.data.user;

        if (data) {
          const mapped = data.map((l: any) => ({
            ...l,
            seller: Array.isArray(l.seller) ? l.seller[0] : l.seller,
          })) as ListingWithSeller[];
          
          const ordered = ids
            .map((id) => mapped.find((item: ListingWithSeller) => item.id === id))
            .filter(Boolean) as ListingWithSeller[];
          setItems(ordered);

          if (user && ordered.length > 0) {
            const { data: wishlistRows } = await supabase
              .from('wishlist')
              .select('listing_id')
              .eq('user_id', user.id)
              .in('listing_id', ordered.map(i => i.id));
            
            if (isMounted && wishlistRows) {
              setSavedIds(new Set(wishlistRows.map((row: any) => row.listing_id)));
            }
          }
        }
      } catch (error) {
        console.error('Error in fetchRecentlyViewed:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchRecentlyViewed();
    return () => { isMounted = false; };
  }, []);

  // Hide entirely if no recently viewed items
  if (loading || items.length === 0) return null

  const cards = items.map((listing) => (
    <NetflixCard key={listing.id}>
      <ListingCard listing={listing} isSaved={savedIds.has(listing.id)} />
    </NetflixCard>
  ))

  return (
    <NetflixRow title='Recently Viewed' icon='🕐' seeAllContent={cards}>
      {cards}
    </NetflixRow>
  )
}
