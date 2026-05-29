-- ============================================================
-- TokoAyu Supabase Database Schema
-- Jalankan SQL ini di Supabase > SQL Editor
-- ============================================================

-- PRODUCTS TABLE
create table if not exists public.products (
  id          text primary key,
  name        text not null,
  category    text not null default 'Lainnya',
  sku         text not null default '',
  barcode     text not null default '',
  buy_price   numeric not null default 0,
  retail_price  numeric not null default 0,
  wholesale_price numeric not null default 0,
  special_price numeric not null default 0,
  stock       integer not null default 0,
  min_stock   integer not null default 5,
  unit        text not null default 'pcs',
  expiry      text not null default '',
  sold        integer not null default 0,
  created_at  timestamptz default now()
);

alter table public.products enable row level security;
create policy "Allow all" on public.products for all using (true);

-- CUSTOMERS TABLE
create table if not exists public.customers (
  id          text primary key,
  name        text not null,
  whatsapp    text not null default '',
  type        text not null default 'eceran',
  address     text not null default '',
  debt_limit  numeric not null default 500000,
  total_spend numeric not null default 0,
  created_at  timestamptz default now()
);

alter table public.customers enable row level security;
create policy "Allow all" on public.customers for all using (true);

-- DEBTS TABLE
create table if not exists public.debts (
  id          text primary key,
  customer    text not null,
  amount      numeric not null default 0,
  due_date    text not null default '',
  status      text not null default 'belum lunas',
  note        text not null default '',
  created_at  timestamptz default now()
);

alter table public.debts enable row level security;
create policy "Allow all" on public.debts for all using (true);

-- TRANSACTIONS TABLE
create table if not exists public.transactions (
  id           text primary key,
  time         text not null default '',
  customer     text not null default 'Umum',
  items_count  integer not null default 0,
  total        numeric not null default 0,
  profit       numeric not null default 0,
  method       text not null default 'Tunai',
  status       text not null default 'Terbayar',
  created_at   timestamptz default now()
);

alter table public.transactions enable row level security;
create policy "Allow all" on public.transactions for all using (true);
