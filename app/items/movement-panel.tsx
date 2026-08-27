"use client";

import { useState } from "react";

type Warehouse = { id: number; code: string; name: string };
type Movement = {
  id: number;
  warehouse_id: number;
  movement_type: string;
  quantity: number;
  created_at: string;
};

export default function MovementPanel({
  itemId,
  itemCode,
  warehouses,
  movements,
  onRecorded,
  onClose,
}: {
  itemId: number;
  itemCode: string;
  warehouses: Warehouse[];
  movements: Movement[];
  onRecorded: () => void;
  onClose: () => void;
}) {
  const [warehouseId, setWarehouseId] = useState(
    warehouses[0] ? String(warehouses[0].id) : "",
  );
  const [movementType, setMovementType] = useState("RECEIPT");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const warehouseName = (id: number) =>
    warehouses.find((w) => w.id === id)?.name ?? `#${id}`;

  // On hand per warehouse is a plain SUM, with no CASE and no sign juggling,
  // because the database guarantees ISSUE rows are already negative.
  const onHandByWarehouse = warehouses.map((w) => ({
    warehouse: w,
    onHand: movements
      .filter((m) => m.warehouse_id === w.id)
      .reduce((sum, m) => sum + Number(m.quantity), 0),
  }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    const response = await fetch("/api/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: itemId,
        warehouse_id: Number(warehouseId),
        movement_type: movementType,
        quantity: Number(quantity),
      }),
    });
    const body = await response.json();

    setPending(false);

    if (!response.ok) {
      setError(body.message ?? "Could not record movement.");
      return;
    }

    setNotice(body.message);
    setQuantity("");
    onRecorded();
  }

  return (
    <div style={{ border: "2px solid #333", padding: 12, margin: "8px 0" }}>
      <h3 style={{ marginTop: 0 }}>
        Stock movements &mdash; {itemCode}{" "}
        <button type="button" onClick={onClose} style={{ marginLeft: 8 }}>
          close
        </button>
      </h3>

      <h4>On hand</h4>
      <table border={1} cellPadding={4} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Warehouse</th>
            <th>On hand</th>
          </tr>
        </thead>
        <tbody>
          {onHandByWarehouse.map(({ warehouse, onHand }) => (
            <tr key={warehouse.id}>
              <td>{warehouse.name}</td>
              <td style={{ textAlign: "right" }}>{onHand}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4>Record a movement</h4>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label>
          Warehouse
          <br />
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Type
          <br />
          <select value={movementType} onChange={(e) => setMovementType(e.target.value)}>
            <option value="RECEIPT">RECEIPT (in)</option>
            <option value="ISSUE">ISSUE (out)</option>
          </select>
        </label>

        <label>
          Quantity
          <br />
          {/* Always a positive number. The server applies the sign from the
              type - a user should never type a minus to mean "out". */}
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
          {pending ? "Recording..." : "Record"}
        </button>
      </form>

      {error && (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}

      <h4>History</h4>
      {movements.length === 0 ? (
        <p>No movements recorded for this item.</p>
      ) : (
        <table border={1} cellPadding={4} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>When</th>
              <th>Warehouse</th>
              <th>Type</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.created_at).toLocaleString()}</td>
                <td>{warehouseName(m.warehouse_id)}</td>
                <td>{m.movement_type}</td>
                <td style={{ textAlign: "right" }}>{Number(m.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
