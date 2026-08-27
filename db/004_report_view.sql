-- ============================================================
-- stockroom - 004_report_view.sql
--
-- Stage 6: stock on hand, per item per warehouse.
--
-- This is the group-by from Stage 1f, stored in the database as a view so
-- every caller gets the same definition of "on hand".
--
-- Run once in the Supabase SQL Editor, after 003_functions.sql.
-- ============================================================

drop view if exists stock_on_hand;

create view stock_on_hand
-- ============================================================
-- security_invoker = true IS NOT OPTIONAL. Read this before changing it.
--
-- By DEFAULT a Postgres view runs with the permissions of whoever CREATED
-- it, not whoever queries it. That means a default view over these tables
-- would return EVERY user's rows to EVERY caller - quietly undoing all
-- twelve policies from Stage 4, with no error and no warning.
--
-- security_invoker = true makes the view run as the CALLER, so RLS applies
-- exactly as it does on the underlying tables. (Postgres 15+.)
--
-- This is the same trap as `security definer` on a function, wearing a
-- different hat: a thing that bypasses your policies by default.
-- ============================================================
with (security_invoker = true)
as
select
  i.id            as item_id,
  i.code          as item_code,
  i.name          as item_name,
  i.uom           as uom,
  w.id            as warehouse_id,
  w.code          as warehouse_code,
  w.name          as warehouse_name,
  sum(m.quantity) as on_hand
from stock_movements m
join items      i on i.id = m.item_id
join warehouses w on w.id = m.warehouse_id
group by i.id, i.code, i.name, i.uom, w.id, w.code, w.name;

-- Note the aggregate is a plain sum(quantity). No CASE, no sign juggling.
-- That is the check constraint from 001_schema.sql earning its keep: ISSUE
-- rows are already negative because the database refuses to store them any
-- other way, so the naive query is the correct query.
--
-- This is the 180-vs-120 problem, solved at the schema level rather than
-- remembered in every query that touches the table.


-- ============================================================
-- VERIFY
--
--   select * from stock_on_hand order by item_code, warehouse_name;
--
-- Cross-check one row by hand against the raw movements:
--
--   select movement_type, quantity
--   from stock_movements
--   where item_id = 1 and warehouse_id = 1
--   order by created_at;
--
-- The on_hand figure must equal the sum of that column. If it does not,
-- something has written a row with the wrong sign - which the constraint
-- should have made impossible.
-- ============================================================
