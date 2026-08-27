"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Item = { id: number; code: string; name: string };
type Warehouse = { id: number; code: string; name: string };
type Movement = { item_id: number; warehouse_id: number; quantity: number };

export default function TransfersPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  const [itemId, setItemId] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [itemsResult, warehousesResult, movementsResult] = await Promise.all([
      supabase.from("items").select("id, code, name").eq("is_active", true).order("code"),
      supabase.from("warehouses").select("id, code, name").order("code"),
      supabase.from("stock_movements").select("item_id, warehouse_id, quantity"),
    ]);

    setItems(itemsResult.data ?? []);
    setWarehouses(warehousesResult.data ?? []);
    setMovements(movementsResult.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Shown next to the source dropdown so the user knows what they can move
  // before they are told off for asking too much.
  const onHandAtSource =
    itemId && fromId
      ? movements
          .filter(
            (m) => m.item_id === Number(itemId) && m.warehouse_id === Number(fromId),
          )
          .reduce((sum, m) => sum + Number(m.quantity), 0)
      : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    const response = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: Number(itemId),
        from_warehouse_id: Number(fromId),
        to_warehouse_id: Number(toId),
        quantity: Number(quantity),
      }),
    });
    const body = await response.json();

    setPending(false);

    if (!response.ok) {
      setError(body.message ?? "Transfer failed.");
      return;
    }

    setNotice(body.message);
    setQuantity("");
    load();
  }

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <h1>Transfer stock</h1>
      <p>
        <Link href="/dashboard">&larr; Dashboard</Link>
      </p>

      <p style={{ maxWidth: 560 }}>
        Moves quantity from one warehouse to another. This writes two rows
        &mdash; one leaving, one arriving &mdash; through a database function,
        so both happen or neither does.
      </p>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{ display: "grid", gap: 8, maxWidth: 360, padding: 12, border: "1px solid #ccc" }}
        >
          <label>
            Item
            <br />
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} required>
              <option value="">-- choose --</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.code} &mdash; {i.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            From warehouse
            <br />
            <select value={fromId} onChange={(e) => setFromId(e.target.value)} required>
              <option value="">-- choose --</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            {onHandAtSource !== null && (
              <span style={{ marginLeft: 8 }}>on hand: {onHandAtSource}</span>
            )}
          </label>

          <label>
            To warehouse
            <br />
            <select value={toId} onChange={(e) => setToId(e.target.value)} required>
              <option value="">-- choose --</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Quantity
            <br />
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </label>

          <button type="submit" disabled={pending}>
            {pending ? "Transferring..." : "Transfer"}
          </button>

          {error && (
            <p role="alert" style={{ color: "crimson" }}>
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
        </form>
      )}
    </main>
  );
}
