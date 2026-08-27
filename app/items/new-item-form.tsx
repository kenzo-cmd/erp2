"use client";

import { useState } from "react";

export default function NewItemForm({ onCreated }: { onCreated: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [itemType, setItemType] = useState("RAW_MATERIAL");
  const [uom, setUom] = useState("PCS");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    // Note this posts to OUR route handler, not straight to Supabase.
    // The route handler validates, gives a 400 with a specific message, and
    // is the one place that decides what a valid item is.
    const response = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, item_type: itemType, uom }),
    });
    const body = await response.json();

    setPending(false);

    if (!response.ok) {
      // The API's message goes on the screen verbatim. A form that fails
      // silently is worse than one that crashes.
      setError(body.message ?? "Could not create item.");
      return;
    }

    setCode("");
    setName("");
    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-end",
        flexWrap: "wrap",
        margin: "16px 0",
        padding: 12,
        border: "1px solid #ccc",
      }}
    >
      <label>
        Code
        <br />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ITM-006"
          required
        />
      </label>

      <label>
        Name
        <br />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Brass Fitting"
          required
        />
      </label>

      <label>
        Type
        <br />
        <select value={itemType} onChange={(e) => setItemType(e.target.value)}>
          <option value="RAW_MATERIAL">RAW_MATERIAL</option>
          <option value="WIP">WIP</option>
          <option value="FINISHED">FINISHED</option>
        </select>
      </label>

      <label>
        Unit
        <br />
        <select value={uom} onChange={(e) => setUom(e.target.value)}>
          <option value="PCS">PCS</option>
          <option value="LTR">LTR</option>
          <option value="KG">KG</option>
        </select>
      </label>

      <button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add item"}
      </button>

      {error && (
        <p role="alert" style={{ color: "crimson", width: "100%", margin: 0 }}>
          {error}
        </p>
      )}
    </form>
  );
}
