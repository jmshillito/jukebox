-- Supabase schema: metadata only (no blobs)
create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  slot text,
  title text not null,
  artist text,
  r2_key text not null,
  created_at timestamptz not null default now()
);
