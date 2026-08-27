"use client";

// ============================================================
// STAGE 3: the easy way. Deliberately.
//
// This is a CLIENT Component that queries the database straight from the
// visitor's browser. No API route. No server code. About ten lines of real
// work, and it just... works.
//
// It should feel like cheating. Hold onto that feeling - Stage 4 is about
// exactly this page.
//
// (In Stage 5 the create form arrives and this page grows a POST. The table
// itself stays as it is.)
// ============================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Item = {
  id: number;
  code: string;
  name: string;
  item_type: string;
  uom: string;
  is_active: boolean;
};

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // useEffect runs AFTER the component renders in the browser. This is the
    // browser talking to Supabase directly - open the Network tab and you
    // will see the request leave your machine.
    async function loadItems() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("items")
        .select("id, code, name, item_type, uom, is_active")
        .order("code");

      if (error) {
        setError(error.message);
      } else {
        setItems(data ?? []);
      }
      setLoading(false);
    }

    loadItems();
  }, []);
  // The empty [] means "run this once, after the first render". Without it
  // the effect runs after EVERY render, each fetch causes a re-render, and
  // you have an infinite loop hammering your database.

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <h1>Items</h1>
      <p>
        <Link href="/dashboard">&larr; Dashboard</Link>
      </p>

      {loading && <p>Loading...</p>}

      {error && (
        <p role="alert" style={{ color: "crimson" }}>
          Could not load items: {error}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <p>No items yet.</p>
      )}

      {items.length > 0 && (
        <table border={1} cellPadding={6} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Unit</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              // key lets React tell rows apart between renders. Without it
              // React warns, and list updates can reorder or lose state.
              <tr key={item.id}>
                <td>{item.code}</td>
                <td>{item.name}</td>
                <td>{item.item_type}</td>
                <td>{item.uom}</td>
                <td>{item.is_active ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
