-- ============================================================
-- stockroom - 001_schema.sql
--
-- The real schema. Run this ONCE in the Supabase SQL Editor.
-- It drops the Stage 1 practice tables and rebuilds cleanly, so it is
-- safe to re-run from scratch.
--
-- Sign convention: RECEIPT positive, ISSUE negative, TRANSFER is a pair
-- (negative at source, positive at destination). Enforced by a check
-- constraint, so stock on hand is always a plain sum(quantity).
--
-- DELIBERATELY NOT HERE: owner_id, and row level security.
-- Stage 4 adds both. The whole point of Stage 4 is to first PROVE that
-- this database is wide open, and you cannot prove that if it was never
-- open in the first place.
-- ============================================================


-- Drop children before parents: a table cannot be dropped while another
-- table's foreign key still points at it.
drop table if exists stock_movements;
drop table if exists stock;            -- Stage 1e practice table, not used
drop table if exists items;
drop table if exists warehouses;


-- ------------------------------------------------------------
-- items
-- ------------------------------------------------------------
create table items (
  id        bigint generated always as identity primary key,
  code      text    not null unique,
  name      text    not null,
  uom       text    not null default 'PCS',
  item_type text    not null,
  is_active boolean not null default true,

  constraint items_code_not_blank check (length(trim(code)) > 0),
  constraint items_name_not_blank check (length(trim(name)) > 0),
  constraint items_uom_known      check (uom       in ('PCS','LTR','KG')),
  constraint items_type_known     check (item_type in ('RAW_MATERIAL','WIP','FINISHED'))
);

-- Why items_code_not_blank exists on top of `not null`:
-- `not null` rejects NULL. It does NOT reject the empty string, or a string
-- of spaces. Those are perfectly good text values as far as Postgres is
-- concerned, and an HTML form that submits an untouched input sends exactly
-- that. trim() strips surrounding whitespace, length() counts what is left.
--
-- is_active supports SOFT DELETE. We never hard-delete an item, because
-- every historical movement references it and history has to stay true.


-- ------------------------------------------------------------
-- warehouses
-- ------------------------------------------------------------
create table warehouses (
  id        bigint generated always as identity primary key,
  code      text    not null unique,
  name      text    not null,
  is_active boolean not null default true,

  constraint warehouses_code_not_blank check (length(trim(code)) > 0),
  constraint warehouses_name_not_blank check (length(trim(name)) > 0)
);


-- ------------------------------------------------------------
-- stock_movements
--
-- This is the ONLY record of quantity in the system. There is no
-- stock-on-hand column and no running total anywhere. On-hand is always
-- DERIVED by summing movements.
--
-- That is a deliberate choice: one source of truth. A cached total is
-- faster to read and gives you two numbers that can disagree, with no way
-- to tell which one is lying.
-- ------------------------------------------------------------
create table stock_movements (
  id            bigint        generated always as identity primary key,
  item_id       bigint        not null references items(id),
  warehouse_id  bigint        not null references warehouses(id),
  movement_type text          not null,
  quantity      numeric(18,4) not null,
  created_at    timestamptz   not null default now(),

  constraint stock_movements_type_known check (
    movement_type in ('RECEIPT','ISSUE','TRANSFER')
  ),

  -- The sign convention, enforced. Nobody has to remember it.
  constraint stock_movements_sign_matches_type check (
    (movement_type = 'RECEIPT'  and quantity > 0) or
    (movement_type = 'ISSUE'    and quantity < 0) or
    (movement_type = 'TRANSFER' and quantity <> 0)
  )
);

-- The report groups by (item_id, warehouse_id) on every page load.
-- Without an index Postgres reads the whole table each time. With ten
-- seed rows that is irrelevant; with ten million it is the difference
-- between 5ms and 5 seconds.
create index stock_movements_item_warehouse_idx
  on stock_movements (item_id, warehouse_id);


-- ============================================================
-- SEED DATA - 5 items, 2 warehouses, 10 movements
-- ============================================================

insert into items (code, name, uom, item_type) values
  ('ITM-001', 'Steel Bracket',     'PCS', 'RAW_MATERIAL'),
  ('ITM-002', 'Wax Sprue',         'PCS', 'RAW_MATERIAL'),
  ('ITM-003', 'Ceramic Slurry',    'LTR', 'RAW_MATERIAL'),
  ('ITM-004', 'Investment Shell',  'PCS', 'WIP'),
  ('ITM-005', 'Finished Impeller', 'PCS', 'FINISHED');

insert into warehouses (code, name) values
  ('WH-SBY', 'Surabaya Main'),
  ('WH-JKT', 'Jakarta Depot');

-- Movements reference items and warehouses BY CODE rather than by hardcoded
-- id numbers. The ids are handed out by the database, so writing 1 and 2
-- here would be guessing at values we were told not to control.
insert into stock_movements (item_id, warehouse_id, movement_type, quantity)
select i.id, w.id, m.movement_type, m.quantity
from (values
  -- item     warehouse   type         qty
  ('ITM-001', 'WH-SBY', 'RECEIPT',   100),
  ('ITM-001', 'WH-SBY', 'ISSUE',     -30),
  ('ITM-001', 'WH-JKT', 'RECEIPT',    40),
  ('ITM-002', 'WH-SBY', 'RECEIPT',   200),
  ('ITM-002', 'WH-SBY', 'ISSUE',     -50),
  ('ITM-003', 'WH-SBY', 'RECEIPT',   500),
  ('ITM-004', 'WH-JKT', 'RECEIPT',    60),
  ('ITM-005', 'WH-JKT', 'RECEIPT',    25),
  -- a completed transfer: 20 units leave Surabaya and arrive in Jakarta.
  -- Two rows, and they only make sense as a pair. Stage 5 is about
  -- guaranteeing that both happen or neither does.
  ('ITM-001', 'WH-SBY', 'TRANSFER',  -20),
  ('ITM-001', 'WH-JKT', 'TRANSFER',   20)
) as m(item_code, warehouse_code, movement_type, quantity)
join items      i on i.code = m.item_code
join warehouses w on w.code = m.warehouse_code;


-- ============================================================
-- VERIFY - stock on hand, per item per warehouse.
-- This is the Stage 6 /report query.
--
-- PREDICT: 6 rows. Expected result:
--
--   ITM-001  Steel Bracket      Jakarta Depot    60
--   ITM-001  Steel Bracket      Surabaya Main    50
--   ITM-002  Wax Sprue          Surabaya Main   150
--   ITM-003  Ceramic Slurry     Surabaya Main   500
--   ITM-004  Investment Shell   Jakarta Depot    60
--   ITM-005  Finished Impeller  Jakarta Depot    25
--
-- Check ITM-001 by hand: Surabaya 100 - 30 - 20 = 50, Jakarta 40 + 20 = 60.
-- Note it is a plain sum(). No CASE, no sign juggling. That is the
-- constraint earning its keep.
-- ============================================================
select i.code, i.name, w.name as warehouse, sum(m.quantity) as on_hand
from stock_movements m
join items      i on i.id = m.item_id
join warehouses w on w.id = m.warehouse_id
group by i.code, i.name, w.name
order by i.code, w.name;
