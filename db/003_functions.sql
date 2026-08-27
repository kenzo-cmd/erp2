-- ============================================================
-- stockroom - 003_functions.sql
--
-- Stage 5: the transfer, and why it cannot live in the browser.
--
-- A transfer is TWO rows: quantity leaves one warehouse and the same
-- quantity arrives at another. BOTH must happen, or NEITHER.
--
-- Two separate inserts from JavaScript are two separate round trips. There
-- is no `begin` spanning them. If the second one fails - dropped connection,
-- closed tab, constraint violation - the first has already committed and the
-- stock has been deleted from reality.
--
-- A function body is atomic. It commits as a unit or rolls back as a unit.
-- That is the whole reason this is not two fetch() calls.
--
-- Run once in the Supabase SQL Editor, after 002_policies.sql.
-- ============================================================

create or replace function transfer_stock(
  p_item_id bigint,
  p_from    bigint,
  p_to      bigint,
  p_qty     numeric
)
returns void
language plpgsql
-- security invoker: the function runs as the CALLER, so row level security
-- still applies to everything below and owner_id still defaults to
-- auth.uid(). security definer would run as the function's owner and quietly
-- bypass every policy you wrote in Stage 4 - which is occasionally what you
-- want, and a catastrophe when it is not.
security invoker
as $$
declare
  v_on_hand numeric;
begin
  ----------------------------------------------------------------
  -- Validation. The route handler checks these too, so the user gets a
  -- readable 400 - but the function checks again because it is reachable
  -- from the SQL editor, a script, or any future caller that never went
  -- through the route handler.
  ----------------------------------------------------------------
  if p_qty is null or p_qty <= 0 then
    raise exception 'Quantity must be greater than zero.';
  end if;

  if p_from = p_to then
    raise exception 'Source and destination warehouses must be different.';
  end if;

  ----------------------------------------------------------------
  -- Serialise concurrent transfers of the SAME item out of the SAME
  -- warehouse.
  --
  -- Without this, two transfers can both read "50 on hand", both decide 40
  -- is fine, and both write - leaving -30. Checking then writing is only
  -- safe if nobody can slip between the two steps.
  --
  -- An advisory lock is held until the transaction ends and blocks only
  -- other callers using the same key, so unrelated transfers still run in
  -- parallel. (A plain `select sum(...) for update` is not an option -
  -- Postgres rejects FOR UPDATE alongside an aggregate.)
  --
  -- The ::int casts are REQUIRED. pg_advisory_xact_lock comes in exactly two
  -- forms - (bigint) and (int, int). There is no (bigint, bigint), so the
  -- uncast call fails at RUNTIME with "function ... does not exist". It does
  -- not fail at CREATE time, because plpgsql bodies are only parsed when
  -- executed - a create that "succeeds" proves nothing.
  ----------------------------------------------------------------
  perform pg_advisory_xact_lock(p_item_id::int, p_from::int);

  select coalesce(sum(quantity), 0)
    into v_on_hand
    from stock_movements
   where item_id = p_item_id
     and warehouse_id = p_from;

  if v_on_hand < p_qty then
    raise exception
      'Only % on hand at the source warehouse; cannot transfer %.',
      v_on_hand, p_qty;
  end if;

  ----------------------------------------------------------------
  -- The two rows. Note the signs: negative leaving, positive arriving.
  -- The check constraint from 001_schema.sql requires TRANSFER rows to be
  -- non-zero, and this pairing is what keeps sum(quantity) truthful.
  --
  -- owner_id is not supplied - it defaults to auth.uid(). The RLS insert
  -- policy also requires that the item and BOTH warehouses belong to the
  -- caller, so a transfer into someone else's warehouse fails here.
  ----------------------------------------------------------------
  insert into stock_movements (item_id, warehouse_id, movement_type, quantity)
  values (p_item_id, p_from, 'TRANSFER', -p_qty);

  insert into stock_movements (item_id, warehouse_id, movement_type, quantity)
  values (p_item_id, p_to,   'TRANSFER',  p_qty);

  -- No commit here. The function either returns, and both inserts commit
  -- together, or it raised, and neither exists.
end;
$$;


-- ============================================================
-- SEE IT FOR YOURSELF - run these in the SQL Editor
--
-- 1. FEEL THE PROBLEM. Insert only the first leg, by hand:
--
--      insert into stock_movements (item_id, warehouse_id, movement_type, quantity)
--      values (1, 1, 'TRANSFER', -50);
--
--    Now run the stock-on-hand report. The 50 units are not in Surabaya.
--    They are not in Jakarta either. They have been deleted from reality by
--    an operation that stopped halfway. Your logic was correct - it just did
--    not finish. Undo it:  delete from stock_movements where quantity = -50;
--
-- 2. BOTH OR NEITHER. Try a transaction and abandon it:
--
--      begin;
--        insert into stock_movements (item_id, warehouse_id, movement_type, quantity)
--        values (1, 1, 'TRANSFER', -50);
--        insert into stock_movements (item_id, warehouse_id, movement_type, quantity)
--        values (1, 2, 'TRANSFER',  50);
--      rollback;
--
--    Both rows vanish. Run it again ending in `commit;` and both stay.
--    Never half. That is the thing a database gives you that a file does not.
--
-- 3. THE FUNCTION REFUSES AN OVERDRAW, LEAVING NOTHING BEHIND:
--
--      select transfer_stock(1, 1, 2, 999999);
--
--    It raises. Then confirm zero rows were written:
--
--      select count(*) from stock_movements where quantity in (-999999, 999999);
--      -- expect 0
-- ============================================================
