"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Warehouse = { id: number; code: string; name: string; is_active: boolean };

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("warehouses")
      .select("id, code, name, is_active")
      .order("code");

    if (error) setLoadError(error.message);
    else {
      setLoadError(null);
      setWarehouses(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setPending(true);

    const response = await fetch("/api/warehouses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name }),
    });
    const body = await response.json();

    setPending(false);

    if (!response.ok) {
      setFormError(body.message ?? "Could not create warehouse.");
      return;
    }

    setCode("");
    setName("");
    load();
  }

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <h1>Warehouses</h1>
      <p>
        <Link href="/dashboard">&larr; Dashboard</Link>
      </p>

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
            placeholder="WH-BDG"
            required
          />
        </label>

        <label>
          Name
          <br />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bandung Transit"
            required
          />
        </label>

        <button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add warehouse"}
        </button>

        {formError && (
          <p role="alert" style={{ color: "crimson", width: "100%", margin: 0 }}>
            {formError}
          </p>
        )}
      </form>

      {loading && <p>Loading...</p>}
      {loadError && (
        <p role="alert" style={{ color: "crimson" }}>
          Could not load warehouses: {loadError}
        </p>
      )}
      {!loading && !loadError && warehouses.length === 0 && <p>No warehouses yet.</p>}

      {warehouses.length > 0 && (
        <table border={1} cellPadding={6} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.map((w) => (
              <tr key={w.id}>
                <td>{w.code}</td>
                <td>{w.name}</td>
                <td>{w.is_active ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
