-- ============================================================
-- STAGE 1, PART D-E: relationships, and the JOIN
--
-- Run in the Supabase SQL Editor, in order, one block at a time.
-- Continues from 01-tables-and-constraints.sql (items must already exist
-- with its constraints and 3 rows).
--
-- 1e is THE skill everything else rests on. Do not rush it.
-- Keep predicting the row count. Every single time.
-- ============================================================


-- ------------------------------------------------------------
-- 1d. Where does a warehouse go?
-- ------------------------------------------------------------
--
-- Your instinct is to add a `warehouse` column to items. Think it through
-- BEFORE you read the answer:
--
--   The Steel Bracket is in Surabaya AND Jakarta.
--     - Two rows for the same item? Then what is `unique (code)` protecting?
--     - A comma-separated list in the column? How do you search that?
--       How do you sum it?
--     - When Surabaya's address changes, how many rows do you edit?
--
-- An item is a thing. A warehouse is a thing.
-- BEING IN is a third thing, and it belongs to neither of them.
--
-- That is the whole idea, and it is why this is called a RELATIONAL
-- database: the relationships are data too. They get their own table.

create table warehouses (
  id        bigint generated always as identity primary key,
  code      text not null unique,
  name      text not null,
  is_active boolean not null default true
);

insert into warehouses (code, name) values
  ('WH-SBY', 'Surabaya Main'),
  ('WH-JKT', 'Jakarta Depot'),
  ('WH-BDG', 'Bandung Transit');

-- NOTE: the brief seeds two warehouses. I have added a third that will hold
-- NOTHING, on purpose. Drill 4 below asks for "warehouses holding nothing" -
-- with only two warehouses, both holding stock, the correct answer is zero
-- rows, and a query returning zero rows looks identical whether it is right
-- or completely broken. The third warehouse gives that drill a real answer
-- you can check.

-- PREDICT: .................................................. 3
select * from warehouses;


-- --- The join table: BEING IN, as data ---

create table stock (
  id           bigint generated always as identity primary key,
  item_id      bigint not null references items(id),
  warehouse_id bigint not null references warehouses(id),
  quantity     numeric(18,4) not null
);

-- Line by line, the new part:
--   references items(id) ...... a FOREIGN KEY. This column must point at a
--                               row that actually exists in items. The
--                               database enforces it on every insert and
--                               every update, forever.
--   numeric(18,4) ............. exact decimal: up to 18 digits total, 4 of
--                               them after the point. NOT float. Never store
--                               quantities or money as float - 0.1 + 0.2 does
--                               not equal 0.3 in floating point, and that
--                               error compounds across a million rows.

insert into stock (item_id, warehouse_id, quantity) values
  (1, 1, 25),   -- Steel Bracket  in Surabaya
  (1, 2, 40),   -- Steel Bracket  in Jakarta
  (2, 1, 15);   -- Wax Sprue      in Surabaya

-- Ceramic Slurry (item 3) deliberately has NO stock row.
-- Bandung (warehouse 3) deliberately has NO stock row.
-- Both of those absences are the lesson in drills 3 and 4.


-- --- Attack the foreign key. This MUST fail. ---

insert into stock (item_id, warehouse_id, quantity) values (999, 1, 5);
-- EXPECT: insert or update on table "stock" violates foreign key constraint
--         Key (item_id)=(999) is not present in table "items".
--
-- There is no item 999. The database refuses to record stock for an item
-- that does not exist. THAT is the difference between a database and a pile
-- of spreadsheets, and it is why a report can be trusted.


-- --- Now try the other direction. This MUST fail too. ---

delete from items where id = 1;
-- EXPECT: update or delete on table "items" violates foreign key constraint
--         Key (id)=(1) is still referenced from table "stock".
--
-- SIT WITH THIS ONE. What SHOULD happen when someone discontinues an item
-- that still has stock records?
--
-- It has no clean answer. Delete the stock rows too, and every historical
-- report that mentioned them silently changes. Refuse forever, and the item
-- list fills up with dead items.
--
-- The standard move is: you DO NOT DELETE IT. You set is_active = false.
-- A SOFT DELETE. That is what the is_active column is for.

update items set is_active = false where id = 1;

-- PREDICT: how many rows come back? ......................... 3
-- (the row is still there - it is just flagged)
select id, code, name, is_active from items;

-- Put it back before continuing:
update items set is_active = true where id = 1;

-- History has to stay true. The moment you hard-delete a row, every report
-- that ever mentioned it becomes a lie.


-- ------------------------------------------------------------
-- 1e. JOIN - the one to actually practise
-- ------------------------------------------------------------

-- PREDICT: .................................................. 3
select * from stock;

-- Read row two out loud: "item 1, warehouse 2, forty units."
-- But WHAT IS item 1? You cannot answer without looking it up in your head.
-- JOIN makes the database do that lookup.


-- Two tables, stitched together on the matching id.
-- PREDICT: how many rows, and how many columns?
--   3 rows, 10 columns - stock's 4 columns plus items' 6, glued side by side.
--   Note you get TWO columns called `id`. That is why aliases matter below.
select * from stock join items on stock.item_id = items.id;

-- Read the `on` clause as the rule for pairing rows:
--   "pair each stock row with the items row whose id matches its item_id"


-- Only the columns a human actually wants.
-- PREDICT: .................................................. 3 rows, 3 columns
select items.code, items.name, stock.quantity
from stock join items on stock.item_id = items.id;


-- All three tables. This is the real question, and this is a REPORT.
-- PREDICT: .................................................. 3
select i.code, i.name, w.name as warehouse, s.quantity
from stock s
join items      i on s.item_id      = i.id
join warehouses w on s.warehouse_id = w.id
order by i.code;

-- `s`, `i`, `w` are ALIASES - short nicknames for the table, so you write
-- s.quantity instead of stock.quantity. `as warehouse` renames a column in
-- the output only.
--
-- Every screen in every business system you will ever work on is this:
-- a join across a few tables and a filter. Not more complicated. Just more
-- tables.


-- ============================================================
-- THE FOUR DRILLS. Predict the row count BEFORE running each.
-- Answers are at the bottom of the block - cover them.
-- ============================================================

-- DRILL 1: all stock in Surabaya only.
-- PREDICT: ___
select i.code, i.name, s.quantity
from stock s
join items      i on s.item_id      = i.id
join warehouses w on s.warehouse_id = w.id
where w.code = 'WH-SBY';


-- DRILL 2: total quantity of ITM-001 across every warehouse.
-- PREDICT: ___ rows, and what number?
select sum(s.quantity) as total
from stock s
join items i on s.item_id = i.id
where i.code = 'ITM-001';


-- DRILL 3: every item and its stock, INCLUDING items with no stock rows.
-- PREDICT: ___
-- First, try it the obvious way:
select i.code, i.name, s.quantity
from items i
join stock s on s.item_id = i.id;

-- Now CHECK WHICH CODES CAME BACK before you move on.
-- Is ITM-003 (Ceramic Slurry) in there?
--
-- It is not. Your join silently dropped it. NOTHING ERRORED. The item just
-- is not in the answer.
--
-- The fix:
select i.code, i.name, coalesce(s.quantity, 0) as qty
from items i
left join stock s on s.item_id = i.id;

--   join ......... rows that MATCH, on both sides
--   left join .... EVERY row on the left, matched if possible; the right-hand
--                  columns come back null when there is no match
--   coalesce ..... "use the first of these that is not null" - turns that
--                  null quantity into a 0 so the report reads sensibly
--
-- Picking the wrong one DOES NOT ERROR. It quietly gives you a shorter
-- answer. That is the most common real bug in reporting code, and it is why
-- you predict the row count.


-- DRILL 4: warehouses currently holding nothing.
-- PREDICT: ___
select w.code, w.name
from warehouses w
left join stock s on s.warehouse_id = w.id
where s.id is null;

-- This pattern is worth learning by name: LEFT JOIN ... WHERE right side
-- IS NULL means "things on the left with no match on the right." It is how
-- you ask for an ABSENCE. You cannot do it with a plain join, because a
-- plain join has already thrown the unmatched rows away.


-- ------------------------------------------------------------
-- DRILL ANSWERS
--   1: 2 rows   (Steel Bracket 25, Wax Sprue 15)
--   2: 1 row, total = 65   (25 in Surabaya + 40 in Jakarta)
--   3: plain join = 3 rows (WRONG - Ceramic Slurry missing)
--      left join  = 4 rows (correct - Ceramic Slurry present with qty 0)
--   4: 1 row     (WH-BDG Bandung Transit)
-- ------------------------------------------------------------
