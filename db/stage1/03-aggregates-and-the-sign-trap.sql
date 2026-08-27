-- ============================================================
-- STAGE 1, PART F: counting things, and a trap that will bite you
--
-- Run in the Supabase SQL Editor, in order.
-- Continues from 02-relations-and-joins.sql.
--
-- This block contains the single most important thing in Stage 1.
-- It is not a syntax lesson. It is a lesson about being confidently wrong.
-- ============================================================


-- ------------------------------------------------------------
-- Aggregates: squash many rows into one number
-- ------------------------------------------------------------

-- PREDICT: how many rows come back? ......................... 1
-- (count returns ONE row containing the number 3 - not 3 rows)
select count(*) from items;

-- GROUP BY: squash rows into buckets, compute one number per bucket.
-- PREDICT: ................................ 2  (item 1 and item 2 have stock)
select item_id, sum(quantity) from stock group by item_id;

-- The rule that trips everyone: every column in the SELECT must either be
-- IN the group by, or be wrapped in an aggregate like sum()/count().
-- Postgres will refuse otherwise, because it genuinely cannot answer
-- "which name?" for a bucket containing three different names.

-- A stock-on-hand report, in four lines.
-- PREDICT: ................................................... 2
select i.code, i.name, sum(s.quantity) as on_hand
from stock s
join items i on s.item_id = i.id
group by i.code, i.name
order by on_hand desc;


-- ============================================================
-- NOW THE TRAP.
-- ============================================================

create table stock_movements (
  id            bigint generated always as identity primary key,
  item_id       bigint not null references items(id),
  warehouse_id  bigint not null references warehouses(id),
  movement_type text not null check (movement_type in ('RECEIPT','ISSUE','TRANSFER')),
  quantity      numeric(18,4) not null,
  created_at    timestamptz not null default now()
);

-- timestamptz = timestamp WITH TIME ZONE. Always use this, never plain
-- `timestamp`. now() records the moment the row was inserted.

insert into stock_movements (item_id, warehouse_id, movement_type, quantity) values
  (1, 1, 'RECEIPT', 100),
  (1, 1, 'ISSUE',    30),
  (1, 1, 'RECEIPT',  50);

-- 100 arrived. 30 went out. 50 arrived.
-- Work out the true answer on paper FIRST: ............ 100 - 30 + 50 = 120

-- Now ask the database:
select sum(quantity) from stock_movements
where item_id = 1 and warehouse_id = 1;


-- ============================================================
-- It says 180. You actually have 120.
--
-- The ISSUE got ADDED instead of SUBTRACTED.
--
-- No error. No crash. No warning. A confident, precise, WRONG number,
-- from a query that looks completely reasonable and that you would have
-- shipped without a second thought.
--
-- SIT WITH THAT. It is the most important thing in this stage.
-- Every constraint you wrote in 1c protects you from garbage going IN.
-- Nothing protects you from a sensible-looking question coming OUT wrong.
-- ============================================================


-- --- Three ways to fix it. They are NOT equally good. ---
--
-- OPTION A: store ISSUE as a negative number.
--   sum(quantity) just works, everywhere, forever.
--   OBJECTION: every writer has to remember the convention, forever.
--
-- OPTION B: sum(case when movement_type = 'RECEIPT' then quantity
--                    else -quantity end)
--   Works. But the rule now lives in EVERY query that touches this table,
--   and the day someone writes a plain sum() they get 180 again.
--
-- OPTION C: keep a running-total column on the item.
--   Fastest to read. And the one that will hurt you: now there are two
--   sources of truth, and the day they disagree - and they will - you have
--   no way to tell which is right.

-- Here is option B working, so you have seen it:
select sum(case when movement_type = 'RECEIPT' then quantity else -quantity end)
       as on_hand
from stock_movements
where item_id = 1 and warehouse_id = 1;
-- EXPECT: 120


-- ============================================================
-- OUR DECISION: OPTION A, PLUS A CHECK CONSTRAINT.
--
-- Read Option A's objection again: "every writer has to remember the
-- convention, forever."
--
-- A check constraint is the ANSWER to that objection. Nobody has to
-- remember, because the database REFUSES the row. The convention stops
-- being a thing people know and becomes a thing the table enforces.
--
-- Back in 1c: a check in your code protects one door, a constraint on the
-- table protects the building. This is that same idea, applied to a rule
-- about SIGNS instead of a rule about item_type.
-- ============================================================

drop table stock_movements;

create table stock_movements (
  id            bigint generated always as identity primary key,
  item_id       bigint not null references items(id),
  warehouse_id  bigint not null references warehouses(id),
  movement_type text not null check (movement_type in ('RECEIPT','ISSUE','TRANSFER')),
  quantity      numeric(18,4) not null,
  created_at    timestamptz not null default now(),

  -- the sign convention, enforced:
  constraint stock_movements_sign_matches_type check (
    (movement_type = 'RECEIPT'  and quantity > 0) or
    (movement_type = 'ISSUE'    and quantity < 0) or
    (movement_type = 'TRANSFER' and quantity <> 0)
  )
);

-- RECEIPT  must be positive .... stock coming in
-- ISSUE    must be negative .... stock going out
-- TRANSFER is a PAIR of rows ... negative at the source, positive at the
--                                destination. Never zero, either way.
--
-- `constraint <name> check (...)` names the constraint, so the error message
-- says stock_movements_sign_matches_type instead of a generated name like
-- stock_movements_check1. Name your constraints. Future-you reading an error
-- at 2am will thank you.

insert into stock_movements (item_id, warehouse_id, movement_type, quantity) values
  (1, 1, 'RECEIPT', 100),
  (1, 1, 'ISSUE',   -30),
  (1, 1, 'RECEIPT',  50);


-- --- Attack the convention. BOTH must fail. ---

insert into stock_movements (item_id, warehouse_id, movement_type, quantity)
values (1, 1, 'ISSUE', 30);
-- EXPECT: violates check constraint "stock_movements_sign_matches_type"
-- A positive ISSUE is now IMPOSSIBLE. Not discouraged. Impossible.

insert into stock_movements (item_id, warehouse_id, movement_type, quantity)
values (1, 1, 'RECEIPT', -10);
-- EXPECT: same constraint. A negative RECEIPT is impossible too.


-- --- And now the naive query is CORRECT ---

-- PREDICT: ................................................. 120
select sum(quantity) as on_hand
from stock_movements
where item_id = 1 and warehouse_id = 1;

-- That is the point. Not that we found a clever query - that we made the
-- OBVIOUS query the RIGHT one. Every future developer who writes the
-- naive sum() now gets the truth, without knowing any of this.
--
-- Stage 6's /report page is exactly this query, grouped by item and
-- warehouse. Because of this constraint it stays four lines long.
