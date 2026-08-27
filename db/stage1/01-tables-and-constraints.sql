-- ============================================================
-- STAGE 1, PART A-C: a table is a promise, and it defends itself
-- Run these in the Supabase SQL Editor, IN ORDER, one block at a time.
-- Highlight a block and press Ctrl+Enter to run just that block.
--
-- THE HABIT: before every SELECT, say out loud how many rows you expect.
-- Every time. When the number is wrong you are already debugging
-- instead of shrugging.
-- ============================================================


-- ------------------------------------------------------------
-- 1a. A table is a promise about the shape of your data
-- ------------------------------------------------------------

create table items (
  id   bigint generated always as identity primary key,
  code text,
  name text,
  uom  text
);

-- Line by line:
--   id ....... bigint = a big whole number.
--              "generated always as identity" = the DATABASE assigns it.
--              "always" means you are FORBIDDEN from supplying it yourself.
--              primary key = unique + not null + this is how rows are identified.
--   code ..... text, no rules yet. Deliberately weak. We break this in 1c.
--   name ..... same.
--   uom ...... "unit of measure": PCS, LTR, KG.

insert into items (code, name, uom) values
  ('ITM-001', 'Steel Bracket',  'PCS'),
  ('ITM-002', 'Wax Sprue',      'PCS'),
  ('ITM-003', 'Ceramic Slurry', 'LTR');

-- PREDICT: how many rows? ................................ 3
select * from items;

-- Look at the id column. You never supplied one. Every row has one anyway.
-- QUESTION TO SIT WITH: why let the database pick ids instead of picking
-- them yourself? (You find out for real in Stage 5. Short version: two people
-- inserting at the same moment must never receive the same number, and only
-- the database can guarantee that.)


-- ------------------------------------------------------------
-- 1b. Getting things back out. PREDICT THE COUNT FIRST.
-- ------------------------------------------------------------

-- PREDICT: ............................................... 2  (Bracket, Sprue)
select * from items where uom = 'PCS';

-- PREDICT: 3 rows, but how many COLUMNS? ................. 3 rows, 2 columns
select code, name from items;

-- PREDICT: ............................................... 1
-- "like" does pattern matching. % means "any run of characters".
select * from items where name like '%Wax%';

-- PREDICT: 3 rows. In what order? ........ Ceramic, Steel, Wax (alphabetical)
select * from items order by name;

-- PREDICT: ............................................... 2
-- desc = descending. limit 2 = stop after two rows.
select * from items order by code desc limit 2;

-- Notice what you are doing: describing WHAT YOU WANT, not HOW TO GET IT.
-- There is no loop anywhere. You have spent years writing loops. This is a
-- genuinely different way to think and it takes a few hours to settle.


-- --- Now break it ON PURPOSE. Read the error, do not skim it. ---

select * from items where nmae = 'Wax Sprue';

-- EXPECT: ERROR: column "nmae" does not exist
-- It names the exact problem in five words and points at the character.
-- SQL errors are the best you will get in your career. Enjoy them.


-- ------------------------------------------------------------
-- 1c. The table currently accepts garbage. PROVE IT.
-- ------------------------------------------------------------

insert into items (code, name, uom) values (null, null, null);
insert into items (code, name, uom) values ('ITM-001', 'Duplicate!', 'PCS');

-- PREDICT: ............................................... 5
select * from items;

-- Both inserts WORKED. You now have a nameless item, and two different rows
-- both claiming to be ITM-001.
--
-- STOP AND ANSWER BEFORE READING ON: which of those two is worse?
--
--
--
-- The duplicate. A blank row is OBVIOUSLY broken - someone will spot it in
-- five seconds. Two rows claiming the same code is QUIETLY broken. Every
-- report from now on is wrong by an amount nobody can see, and it stays
-- wrong for months.


-- --- Rebuild it with rules ---

drop table items;

create table items (
  id        bigint generated always as identity primary key,
  code      text not null unique,
  name      text not null,
  uom       text not null default 'PCS',
  item_type text not null check (item_type in ('RAW_MATERIAL','WIP','FINISHED')),
  is_active boolean not null default true
);

-- The four kinds of rule, and this is worth knowing by name:
--   not null ..... this column must have a value. No blanks.
--   unique ....... no two rows may share this value.
--   default ...... if the insert omits it, use this instead.
--   check ........ an arbitrary condition every row must satisfy.
--                  Here: item_type must be one of exactly three strings.

insert into items (code, name, uom, item_type) values
  ('ITM-001', 'Steel Bracket',  'PCS', 'RAW_MATERIAL'),
  ('ITM-002', 'Wax Sprue',      'PCS', 'RAW_MATERIAL'),
  ('ITM-003', 'Ceramic Slurry', 'LTR', 'RAW_MATERIAL');


-- --- Now attack it. ALL THREE must fail. Read each error. ---

-- Attacks the UNIQUE on code.
insert into items (code, name, item_type) values ('ITM-001','Dup','RAW_MATERIAL');
-- EXPECT: duplicate key value violates unique constraint "items_code_key"

-- Attacks the NOT NULL on name.
insert into items (code, name, item_type) values ('ITM-009', null, 'RAW_MATERIAL');
-- EXPECT: null value in column "name" ... violates not-null constraint

-- Attacks the CHECK on item_type.
insert into items (code, name, item_type) values ('ITM-009','Mystery','BANANA');
-- EXPECT: new row for relation "items" violates check constraint

-- PREDICT: ............................................... 3  (all attacks bounced)
select * from items;

-- ============================================================
-- WHY THIS MATTERS MORE THAN CHECKING IN YOUR APP CODE:
--
-- Your app is only ONE of the things that touches this database. There is
-- also a script, a CSV import, a support person with a SQL console, and next
-- year, some other developer who never read your code.
--
-- A check in your application protects one door.
-- A constraint on the table protects the building.
--
-- Remember that sentence. Stage 4 is the other half of it - same idea,
-- applied to WHO IS ALLOWED rather than WHAT IS VALID.
-- ============================================================
