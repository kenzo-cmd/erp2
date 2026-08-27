-- ============================================================
-- stockroom - 002_policies.sql
--
-- Stage 4: ownership and row level security.
--
-- FINDING FIRST: this project's tables already had RLS enabled by default -
-- Supabase turns it on for new tables now. Anonymous AND authenticated REST
-- requests both returned `[]`, which is the signature of "RLS on, no
-- policies": Postgres denies everything by default and you allow things back
-- one policy at a time.
--
-- So `[]` was never security working. It was the app being broken for
-- everybody, including its owner. This file is what makes it work again -
-- for the right person only.
--
-- Run once in the Supabase SQL Editor, after 001_schema.sql.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Who owns a row?
--
-- Until now nothing recorded WHO created an item. Without that there is no
-- question to ask - "is this row yours?" has no answer if the row does not
-- know whose it is.
--
-- auth.users is a table Supabase maintains. auth.uid() returns the `sub`
-- claim out of the caller's JWT - the same UUID you saw when you decoded
-- your token in DevTools.
-- ------------------------------------------------------------

-- Added NULLABLE first, deliberately. The obvious one-liner
--     alter table items add column owner_id uuid not null default auth.uid();
-- FAILS on a table that already has rows: the SQL Editor has no JWT, so
-- auth.uid() returns null, and null violates not null. Three steps instead -
-- add nullable, backfill, then tighten.
alter table items            add column if not exists owner_id uuid references auth.users(id) default auth.uid();
alter table warehouses       add column if not exists owner_id uuid references auth.users(id) default auth.uid();
alter table stock_movements  add column if not exists owner_id uuid references auth.users(id) default auth.uid();

-- Backfill the seed rows to the first registered user - you.
update items           set owner_id = (select id from auth.users order by created_at limit 1) where owner_id is null;
update warehouses      set owner_id = (select id from auth.users order by created_at limit 1) where owner_id is null;
update stock_movements set owner_id = (select id from auth.users order by created_at limit 1) where owner_id is null;

-- Now the column can be made mandatory, because every row has a value.
alter table items            alter column owner_id set not null;
alter table warehouses       alter column owner_id set not null;
alter table stock_movements  alter column owner_id set not null;

-- Every policy below filters on owner_id, so every query filters on it.
-- Without an index that means a full table scan on each one.
create index if not exists items_owner_idx           on items (owner_id);
create index if not exists warehouses_owner_idx      on warehouses (owner_id);
create index if not exists stock_movements_owner_idx on stock_movements (owner_id);


-- ------------------------------------------------------------
-- 2. Row level security on. (Already on here by default - this is
--    written explicitly so the file works on a fresh project too.)
-- ------------------------------------------------------------
alter table items           enable row level security;
alter table warehouses      enable row level security;
alter table stock_movements enable row level security;


-- ------------------------------------------------------------
-- 3. The policies.
--
-- USING vs WITH CHECK - the difference will bite you if you skim it:
--
--   using ....... a filter on rows that ALREADY EXIST. "Which rows am I
--                 allowed to see / update / delete?" Rows failing it are
--                 invisible - not an error, just absent.
--
--   with check .. a test on the row VALUES BEING WRITTEN. "Am I allowed to
--                 save this?" Failing it IS an error.
--
--   select needs only `using`      - nothing is being written
--   insert needs only `with check` - no existing row to filter
--   update needs BOTH              - `using` picks which rows you may touch,
--                                    `with check` stops you handing the row
--                                    to somebody else on the way out
--   delete needs only `using`      - nothing is being written
--
-- Why (select auth.uid()) rather than bare auth.uid():
-- wrapping it in a subquery lets Postgres evaluate it ONCE per statement
-- instead of once per row. On a large table that is a very large difference.
-- ------------------------------------------------------------

-- Re-runnable: drop before create.
drop policy if exists "read own items"   on items;
drop policy if exists "insert own items" on items;
drop policy if exists "update own items" on items;
drop policy if exists "delete own items" on items;

create policy "read own items"
on items for select
to authenticated
using ( owner_id = (select auth.uid()) );

create policy "insert own items"
on items for insert
to authenticated
with check ( owner_id = (select auth.uid()) );

create policy "update own items"
on items for update
to authenticated
using      ( owner_id = (select auth.uid()) )
with check ( owner_id = (select auth.uid()) );

create policy "delete own items"
on items for delete
to authenticated
using ( owner_id = (select auth.uid()) );


drop policy if exists "read own warehouses"   on warehouses;
drop policy if exists "insert own warehouses" on warehouses;
drop policy if exists "update own warehouses" on warehouses;
drop policy if exists "delete own warehouses" on warehouses;

create policy "read own warehouses"
on warehouses for select
to authenticated
using ( owner_id = (select auth.uid()) );

create policy "insert own warehouses"
on warehouses for insert
to authenticated
with check ( owner_id = (select auth.uid()) );

create policy "update own warehouses"
on warehouses for update
to authenticated
using      ( owner_id = (select auth.uid()) )
with check ( owner_id = (select auth.uid()) );

create policy "delete own warehouses"
on warehouses for delete
to authenticated
using ( owner_id = (select auth.uid()) );


drop policy if exists "read own movements"   on stock_movements;
drop policy if exists "insert own movements" on stock_movements;
drop policy if exists "update own movements" on stock_movements;
drop policy if exists "delete own movements" on stock_movements;

create policy "read own movements"
on stock_movements for select
to authenticated
using ( owner_id = (select auth.uid()) );

-- Note this one carries a SECOND condition beyond ownership: you may only
-- record a movement against an item and warehouse that are also yours.
-- Without it, you could file movements against another user's warehouse -
-- you would not be able to READ the result, but you would have written a row
-- into their data. Owning the movement row is not the same as being allowed
-- to point it at someone else's things.
create policy "insert own movements"
on stock_movements for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (select 1 from items      i where i.id = item_id      and i.owner_id = (select auth.uid()))
  and exists (select 1 from warehouses w where w.id = warehouse_id and w.owner_id = (select auth.uid()))
);

create policy "update own movements"
on stock_movements for update
to authenticated
using      ( owner_id = (select auth.uid()) )
with check ( owner_id = (select auth.uid()) );

create policy "delete own movements"
on stock_movements for delete
to authenticated
using ( owner_id = (select auth.uid()) );


-- ============================================================
-- VERIFY
--
-- 1. Every table has RLS on:
--      select relname, relrowsecurity from pg_class
--      where relname in ('items','warehouses','stock_movements');
--    -> all true
--
-- 2. Twelve policies exist:
--      select tablename, policyname, cmd from pg_policies
--      where schemaname = 'public' order by tablename, cmd;
--    -> 4 rows per table
--
-- 3. The curl attack, with no authorization header, returns []
--
-- 4. Signed in to the app, /items shows YOUR rows again
--
-- 5. As a SECOND user, /items shows only THEIR rows - same app, same key,
--    same code, different data.
--
-- WHAT MAKES THIS DIFFERENT FROM A CHECK IN YOUR CODE:
-- the permission test lives IN THE TABLE. It runs for every query from every
-- client, forever - your app, a script, a curl, a support engineer, or
-- somebody who found your publishable key in a JavaScript bundle. There is
-- no code path that skips it, because it is not in the code.
-- ============================================================
