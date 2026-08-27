# stockroom

A small inventory system: items, warehouses, and stock movements. Users sign
up, and each user sees only their own data.

**Live:** https://erp2-psi.vercel.app/

Built with Next.js 16 (App Router), Supabase (Postgres + Auth), and Vercel.

---

## Screens

| Route | What it does |
|---|---|
| `/signup`, `/login` | Create an account, sign in, sign out |
| `/dashboard` | Landing page after login. Logged-out visitors are redirected. |
| `/items` | Table of items; create, edit, deactivate, and record stock movements |
| `/warehouses` | Table of warehouses, and a form to add one |
| `/transfers` | Move quantity of an item from one warehouse to another |
| `/report` | Stock on hand, per item per warehouse |

---

## Running it yourself

You need Node 22+ and a free Supabase project.

```bash
git clone https://github.com/kenzo-cmd/erp2.git
cd erp2
npm install
```

Create `.env.local` in the project root (see `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Both values come from your Supabase dashboard under **Project Settings → API
Keys**. Use the **publishable** key. Never put the service role key in a
`NEXT_PUBLIC_*` variable — anything with that prefix is compiled into the
JavaScript every visitor downloads.

Then run the SQL files **in order**, in the Supabase SQL Editor:

| File | What it does |
|---|---|
| `db/001_schema.sql` | Tables, constraints, seed data |
| `db/002_policies.sql` | `owner_id` columns, RLS, and 12 policies |
| `db/003_functions.sql` | `transfer_stock()` |
| `db/004_report_view.sql` | `stock_on_hand` view |

```bash
npm run dev
```

`db/stage1/` holds the SQL practice drills used to build up to the schema.
They are not needed to run the app.

---

## Schema

Three tables. Every foreign key is declared; every quantity is
`numeric(18,4)`, never a float.

```
items                        warehouses
  id            bigint pk      id            bigint pk
  code          text uniq      code          text uniq
  name          text           name          text
  uom           text           is_active     boolean
  item_type     text           owner_id      uuid -> auth.users
  is_active     boolean
  owner_id      uuid -> auth.users

stock_movements
  id            bigint pk
  item_id       bigint -> items(id)
  warehouse_id  bigint -> warehouses(id)
  movement_type text          RECEIPT | ISSUE | TRANSFER
  quantity      numeric(18,4) signed - see below
  created_at    timestamptz
  owner_id      uuid -> auth.users
```

**There is no stock-on-hand column and no running total anywhere.** On hand
is always derived by summing movements. A cached total would be faster to
read and would give you two numbers that can disagree, with no way to tell
which one is lying.

Items and warehouses are never hard-deleted, only flagged `is_active = false`.
A hard delete is refused by the foreign key once movements exist, and where it
succeeded it would silently rewrite every historical report mentioning that
row.

---

## The sign convention

**RECEIPT is positive. ISSUE is negative. TRANSFER is a pair** — negative at
the source, positive at the destination.

It is enforced by a check constraint, not by convention:

```sql
constraint stock_movements_sign_matches_type check (
  (movement_type = 'RECEIPT'  and quantity > 0) or
  (movement_type = 'ISSUE'    and quantity < 0) or
  (movement_type = 'TRANSFER' and quantity <> 0)
)
```

**Why this way.** Storing the sign has one classic objection: every writer has
to remember the convention forever. The constraint is the answer to that
objection — nobody has to remember, because the database refuses the row. A
positive `ISSUE` is not discouraged, it is impossible.

The alternative — `sum(case when movement_type = 'RECEIPT' then quantity else
-quantity end)` — puts the rule in every query that ever touches the table, so
the first person to write a plain `sum()` gets a wrong number with no error.

The payoff is that stock on hand is a plain `sum(quantity)`, and the naive
query is the correct one:

```sql
select item_code, warehouse_name, on_hand from stock_on_hand;
```

Users never type a minus sign. Forms collect a positive quantity and the
server applies the sign from the movement type.

---

## Security model

Every table has row level security enabled, with four policies each
(select / insert / update / delete), all keyed on `owner_id = auth.uid()`.

The publishable key is public by design — it is visible in the JavaScript
bundle of the deployed site. That is safe **because** of the policies: the key
grants only what a policy allows. Without them, anyone holding it can read
every row, which is demonstrably true and was verified with `curl`.

Three things that bypass policies unless you stop them, all of which bit or
nearly bit this project:

- **`security definer` on a function** runs as the function's owner. Use
  `security invoker`, as `transfer_stock()` does.
- **A Postgres view** runs as its *creator* by default. `stock_on_hand` is
  declared `with (security_invoker = true)`; without it the report would
  return every user's rows to every caller, with no error.
- **The service role key** bypasses RLS entirely. It is not used anywhere in
  this project.

Route handlers check authentication themselves and return `401`, rather than
relying on `proxy.ts`. The proxy runs on a path matcher; anything the matcher
does not cover reaches the handler with no proxy involvement.

---

## Transfers, and why they need a backend

A transfer is two rows — quantity leaving one warehouse and arriving at
another — and **both must happen or neither must**.

Two inserts from a browser are two separate round trips with no transaction
spanning them. If the second fails, the first has already committed and the
stock has been deleted from reality.

`transfer_stock()` does both inserts in one function body, which commits or
rolls back as a unit. It also refuses transfers that would take the source
below zero, and takes an advisory lock first so two concurrent transfers
cannot both pass that check and overdraw.

`POST /api/transfers` validates the request and calls the function. It does
not do the inserts itself — that is the entire point.

All route handlers return the same shape:

```json
{ "success": true, "data": { }, "message": "Transfer completed." }
```

`4xx` means the caller got it wrong; `5xx` means the server did. Running out
of stock is a `400`, not a `500`.

---

## What I would do differently

<!--
TODO (Kenzo): this section is yours and the brief asks for it specifically.
A few honest candidates, pick one and write it in your own words:

  - The below-zero check on a plain ISSUE (app/api/movements/route.ts) is a
    read-then-write in JavaScript, so it has the same race that
    transfer_stock() solves with an advisory lock. It should be a database
    function too.
  - /items grew into one large Client Component doing reads, edits and
    movement recording. The table could be a Server Component with the
    interactive parts split out.
  - There is no pagination anywhere. Every screen fetches all rows.
  - No automated tests. Every error path was checked by hand.
-->
