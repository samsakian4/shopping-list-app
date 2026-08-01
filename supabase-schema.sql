-- ============================================================
-- اسکیمای Supabase برای «لیست خرید ما»
-- این فایل رو یک‌بار توی SQL Editor پروژه‌ی Supabase اجرا کن.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- خانواده‌ها ----------
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'خانواده',
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- پروفایل هر کاربر ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  household_id uuid references households(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- کاتالوگ محصولات سفارشی هر خانواده ----------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  brand text,
  package_size text,
  unit text default 'عدد',
  category text default 'سایر',
  base_price numeric default 0,
  created_at timestamptz not null default now()
);

-- ---------- آیتم‌های لیست خرید ----------
create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  custom_name text not null,
  brand text,
  package_size text,
  quantity numeric not null default 1,
  unit text default 'عدد',
  category text default 'سایر',
  estimated_price numeric default 0,
  is_purchased boolean not null default false,
  purchased_at timestamptz,
  purchased_by uuid references profiles(id),
  actual_price numeric,
  added_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- تاریخچه‌ی قیمت واقعی (برای دقیق‌ترشدن برآورد) ----------
create table if not exists price_history (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  item_key text not null,
  price numeric not null,
  recorded_at timestamptz not null default now()
);

-- ============================================================
-- تابع کمکی برای گرفتن household_id کاربر جاری بدون رکرشن در RLS
-- ============================================================
create or replace function get_my_household_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select household_id from profiles where id = auth.uid();
$$;

-- ============================================================
-- ساخت خودکار پروفایل موقع ثبت‌نام
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- فعال‌سازی RLS
-- ============================================================
alter table households enable row level security;
alter table profiles enable row level security;
alter table products enable row level security;
alter table shopping_items enable row level security;
alter table price_history enable row level security;

-- ---------- households ----------
drop policy if exists "households_select" on households;
create policy "households_select" on households for select
  to authenticated using (true); -- برای پیدا کردن با کد دعوت لازمه

drop policy if exists "households_insert" on households;
create policy "households_insert" on households for insert
  to authenticated with check (true);

drop policy if exists "households_update" on households;
create policy "households_update" on households for update
  to authenticated using (id = get_my_household_id());

-- ---------- profiles ----------
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select
  to authenticated using (id = auth.uid() or household_id = get_my_household_id());

drop policy if exists "profiles_insert" on profiles;
create policy "profiles_insert" on profiles for insert
  to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles for update
  to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------- products ----------
drop policy if exists "products_select" on products;
create policy "products_select" on products for select
  to authenticated using (household_id = get_my_household_id());

drop policy if exists "products_insert" on products;
create policy "products_insert" on products for insert
  to authenticated with check (household_id = get_my_household_id());

-- ---------- shopping_items ----------
drop policy if exists "items_select" on shopping_items;
create policy "items_select" on shopping_items for select
  to authenticated using (household_id = get_my_household_id());

drop policy if exists "items_insert" on shopping_items;
create policy "items_insert" on shopping_items for insert
  to authenticated with check (household_id = get_my_household_id());

drop policy if exists "items_update" on shopping_items;
create policy "items_update" on shopping_items for update
  to authenticated using (household_id = get_my_household_id());

drop policy if exists "items_delete" on shopping_items;
create policy "items_delete" on shopping_items for delete
  to authenticated using (household_id = get_my_household_id());

-- ---------- price_history ----------
drop policy if exists "price_select" on price_history;
create policy "price_select" on price_history for select
  to authenticated using (household_id = get_my_household_id());

drop policy if exists "price_insert" on price_history;
create policy "price_insert" on price_history for insert
  to authenticated with check (household_id = get_my_household_id());

-- ============================================================
-- فعال‌سازی Realtime برای همگام‌سازی زنده‌ی لیست خرید
-- ============================================================
alter publication supabase_realtime add table shopping_items;
