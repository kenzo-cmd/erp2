"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppNav from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">
          Transfer stock
        </h1>

        <Card>
          <CardHeader>
            <CardTitle>Move stock between warehouses</CardTitle>
            <CardDescription>
              Writes two rows &mdash; one leaving, one arriving &mdash; through a
              database function, so both happen or neither does.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tr-item">Item</Label>
                  <Select value={itemId} onValueChange={setItemId}>
                    <SelectTrigger id="tr-item" className="w-full">
                      <SelectValue placeholder="Choose an item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items.map((i) => (
                        <SelectItem key={i.id} value={String(i.id)}>
                          {i.code} — {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="tr-from">From warehouse</Label>
                    {onHandAtSource !== null && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        on hand: {onHandAtSource}
                      </span>
                    )}
                  </div>
                  <Select value={fromId} onValueChange={setFromId}>
                    <SelectTrigger id="tr-from" className="w-full">
                      <SelectValue placeholder="Choose a source" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tr-to">To warehouse</Label>
                  <Select value={toId} onValueChange={setToId}>
                    <SelectTrigger id="tr-to" className="w-full">
                      <SelectValue placeholder="Choose a destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tr-qty">Quantity</Label>
                  <Input
                    id="tr-qty"
                    type="number"
                    min="0"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {notice && (
                  <Alert>
                    <AlertDescription>{notice}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={pending} className="w-full">
                  {pending ? "Transferring…" : "Transfer"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
