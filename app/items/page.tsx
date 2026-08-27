"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import NewItemForm from "./new-item-form";
import MovementPanel from "./movement-panel";

type Item = {
  id: number;
  code: string;
  name: string;
  item_type: string;
  uom: string;
  is_active: boolean;
};
type Warehouse = { id: number; code: string; name: string };
type Movement = {
  id: number;
  item_id: number;
  warehouse_id: number;
  movement_type: string;
  quantity: number;
  created_at: string;
};

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState({ name: "", item_type: "", uom: "" });
  const [rowError, setRowError] = useState<string | null>(null);
  const [openMovementsFor, setOpenMovementsFor] = useState<number | null>(null);

  // READS go straight to Supabase from the browser. That is not laziness:
  // RLS already restricts rows to their owner, so a route handler in front of
  // a plain SELECT would add a network hop and enforce nothing extra. WRITES
  // go through /api/* because that is where validation and business rules
  // live. This is the answer to "name two places the route handler is pure
  // overhead" - reads like this one, and the warehouse dropdown.
  const load = useCallback(async () => {
    const supabase = createClient();

    const [itemsResult, warehousesResult, movementsResult] = await Promise.all([
      supabase
        .from("items")
        .select("id, code, name, item_type, uom, is_active")
        .order("code"),
      supabase.from("warehouses").select("id, code, name").order("code"),
      supabase
        .from("stock_movements")
        .select("id, item_id, warehouse_id, movement_type, quantity, created_at")
        .order("created_at", { ascending: false }),
    ]);

    const firstError =
      itemsResult.error ?? warehousesResult.error ?? movementsResult.error;
    if (firstError) {
      setError(firstError.message);
    } else {
      setError(null);
      setItems(itemsResult.data ?? []);
      setWarehouses(warehousesResult.data ?? []);
      setMovements(movementsResult.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(item: Item) {
    setRowError(null);
    setEditingId(item.id);
    setDraft({ name: item.name, item_type: item.item_type, uom: item.uom });
  }

  async function saveEdit(itemId: number) {
    setRowError(null);
    const response = await fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const body = await response.json();
    if (!response.ok) {
      setRowError(body.message ?? "Could not update item.");
      return;
    }
    setEditingId(null);
    load();
  }

  async function setActive(itemId: number, active: boolean) {
    setRowError(null);
    // Deactivate uses DELETE; reactivate is a PATCH setting is_active true.
    const response = active
      ? await fetch(`/api/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: true }),
        })
      : await fetch(`/api/items/${itemId}`, { method: "DELETE" });

    const body = await response.json();
    if (!response.ok) {
      setRowError(body.message ?? "Could not change item status.");
      return;
    }
    load();
  }

  const totalOnHand = (itemId: number) =>
    movements
      .filter((m) => m.item_id === itemId)
      .reduce((sum, m) => sum + Number(m.quantity), 0);

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <h1>Items</h1>
      <p>
        <Link href="/dashboard">&larr; Dashboard</Link>
      </p>

      <NewItemForm onCreated={load} />

      {loading && <p>Loading...</p>}

      {error && (
        <p role="alert" style={{ color: "crimson" }}>
          Could not load items: {error}
        </p>
      )}

      {rowError && (
        <p role="alert" style={{ color: "crimson" }}>
          {rowError}
        </p>
      )}

      {!loading && !error && items.length === 0 && <p>No items yet.</p>}

      {items.length > 0 && (
        <table border={1} cellPadding={6} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Unit</th>
              <th>On hand</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) =>
              editingId === item.id ? (
                <tr key={item.id}>
                  {/* Code is not editable - other paperwork refers to it. */}
                  <td>{item.code}</td>
                  <td>
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      value={draft.item_type}
                      onChange={(e) => setDraft({ ...draft, item_type: e.target.value })}
                    >
                      <option value="RAW_MATERIAL">RAW_MATERIAL</option>
                      <option value="WIP">WIP</option>
                      <option value="FINISHED">FINISHED</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={draft.uom}
                      onChange={(e) => setDraft({ ...draft, uom: e.target.value })}
                    >
                      <option value="PCS">PCS</option>
                      <option value="LTR">LTR</option>
                      <option value="KG">KG</option>
                    </select>
                  </td>
                  <td style={{ textAlign: "right" }}>{totalOnHand(item.id)}</td>
                  <td>{item.is_active ? "yes" : "no"}</td>
                  <td>
                    <button type="button" onClick={() => saveEdit(item.id)}>
                      Save
                    </button>{" "}
                    <button type="button" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={item.id} style={{ opacity: item.is_active ? 1 : 0.5 }}>
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.item_type}</td>
                  <td>{item.uom}</td>
                  <td style={{ textAlign: "right" }}>{totalOnHand(item.id)}</td>
                  <td>{item.is_active ? "yes" : "no"}</td>
                  <td>
                    <button type="button" onClick={() => startEdit(item)}>
                      Edit
                    </button>{" "}
                    <button
                      type="button"
                      onClick={() => setActive(item.id, !item.is_active)}
                    >
                      {item.is_active ? "Deactivate" : "Reactivate"}
                    </button>{" "}
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMovementsFor(
                          openMovementsFor === item.id ? null : item.id,
                        )
                      }
                    >
                      Movements
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}

      {openMovementsFor !== null &&
        (() => {
          const item = items.find((i) => i.id === openMovementsFor);
          if (!item) return null;
          return (
            <MovementPanel
              itemId={item.id}
              itemCode={`${item.code} ${item.name}`}
              warehouses={warehouses}
              movements={movements.filter((m) => m.item_id === item.id)}
              onRecorded={load}
              onClose={() => setOpenMovementsFor(null)}
            />
          );
        })()}
    </main>
  );
}
