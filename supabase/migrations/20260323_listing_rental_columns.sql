alter table listings
  add column if not exists listing_type text not null default 'sell'
    check (listing_type in ('sell', 'rent', 'both')),
  add column if not exists rental_price numeric(12,2),
  add column if not exists rental_period text
    check (rental_period in ('day', 'week', 'month', 'semester')),
  add column if not exists rental_deposit numeric(12,2),
  add column if not exists contact_preference text not null default 'chat'
    check (contact_preference in ('chat', 'phone'));

create index if not exists idx_listings_listing_type on listings(listing_type);
create index if not exists idx_listings_condition on listings(condition);
create index if not exists idx_listings_price on listings(price);
