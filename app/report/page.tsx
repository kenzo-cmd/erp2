import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Row = {
  item_code: string;
  item_name: string;
  uom: string;
  warehouse_name: string;
  on_hand: number;
};

// A Server Component, and the only screen with no Client Component at all.
// It displays data and nothing else - no useState, no onClick - so every
// line of it runs on the server and the browser receives finished HTML.
export default async function ReportPage() {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  // Reading the view, not re-deriving the sum here. One definition of
  // "on hand", in the database, shared by every caller.
  const { data, error } = await supabase
    .from("stock_on_hand")
    .select("item_code, item_name, uom, warehouse_name, on_hand")
    .order("item_code")
    .order("warehouse_name");

  const rows = (data ?? []) as Row[];

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <h1>Stock on hand</h1>
      <p>
        <Link href="/dashboard">&larr; Dashboard</Link>
      </p>

      {error && (
        <p role="alert" style={{ color: "crimson" }}>
          Could not load the report: {error.message}
        </p>
      )}

      {!error && rows.length === 0 && (
        <p>
          Nothing in stock yet. Record a receipt from{" "}
          <Link href="/items">Items</Link>.
        </p>
      )}

      {rows.length > 0 && (
        <table border={1} cellPadding={6} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Item code</th>
              <th>Item</th>
              <th>Warehouse</th>
              <th>On hand</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.item_code}-${row.warehouse_name}`}>
                <td>{row.item_code}</td>
                <td>{row.item_name}</td>
                <td>{row.warehouse_name}</td>
                <td style={{ textAlign: "right" }}>{Number(row.on_hand)}</td>
                <td>{row.uom}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
