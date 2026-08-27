"use client";

// ============================================================
// STAGE 3 built the table here, reading straight from Supabase in the
// browser. Stage 5 added the create form and the row actions, which go
// through /api/* so validation lives in one place.
//
// READS still go direct: RLS already restricts rows to their owner, so a
// route handler in front of a plain SELECT would add a hop and enforce
// nothing. WRITES go through the API.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppNav from "@/components/app-nav";
import NewItemForm from "./new-item-form";
import MovementPanel from "./movement-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

  const openItem = items.find((i) => i.id === openMovementsFor);

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Items</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add an item</CardTitle>
            <CardDescription>
              Code must be unique and cannot be changed afterwards.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NewItemForm onCreated={load} />
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>Could not load items: {error}</AlertDescription>
          </Alert>
        )}
        {rowError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{rowError}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All items</CardTitle>
            <CardDescription>
              {loading ? "Loading…" : `${items.length} item(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!loading && items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No items yet. Add one above.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">On hand</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) =>
                      editingId === item.id ? (
                        <TableRow key={item.id}>
                          {/* Code is not editable - other paperwork refers
                              to items by it. */}
                          <TableCell className="font-mono text-xs">
                            {item.code}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={draft.name}
                              onChange={(e) =>
                                setDraft({ ...draft, name: e.target.value })
                              }
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={draft.item_type}
                              onValueChange={(v) =>
                                setDraft({ ...draft, item_type: v })
                              }
                            >
                              <SelectTrigger className="h-8 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="RAW_MATERIAL">
                                  RAW_MATERIAL
                                </SelectItem>
                                <SelectItem value="WIP">WIP</SelectItem>
                                <SelectItem value="FINISHED">FINISHED</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={draft.uom}
                              onValueChange={(v) => setDraft({ ...draft, uom: v })}
                            >
                              <SelectTrigger className="h-8 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PCS">PCS</SelectItem>
                                <SelectItem value="LTR">LTR</SelectItem>
                                <SelectItem value="KG">KG</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {totalOnHand(item.id)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.is_active ? "secondary" : "outline"}
                            >
                              {item.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="space-x-2 text-right">
                            <Button size="sm" onClick={() => saveEdit(item.id)}>
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow
                          key={item.id}
                          className={item.is_active ? "" : "opacity-55"}
                        >
                          <TableCell className="font-mono text-xs">
                            {item.code}
                          </TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.item_type}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.uom}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {totalOnHand(item.id)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.is_active ? "secondary" : "outline"}
                            >
                              {item.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="space-x-1 text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(item)}
                            >
                              Edit
                            </Button>

                            {item.is_active ? (
                              // AlertDialog, not Dialog: this is a
                              // destructive-shaped action and deserves an
                              // explicit confirmation.
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    Deactivate
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Deactivate {item.code}?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      The row is kept and its stock history stays
                                      intact &mdash; it is flagged inactive, not
                                      deleted. You can reactivate it at any time.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => setActive(item.id, false)}
                                    >
                                      Deactivate
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setActive(item.id, true)}
                              >
                                Reactivate
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setOpenMovementsFor(
                                  openMovementsFor === item.id ? null : item.id,
                                )
                              }
                            >
                              Movements
                            </Button>
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {openItem && (
          <MovementPanel
            itemId={openItem.id}
            itemCode={`${openItem.code} — ${openItem.name}`}
            warehouses={warehouses}
            movements={movements.filter((m) => m.item_id === openItem.id)}
            onRecorded={load}
            onClose={() => setOpenMovementsFor(null)}
          />
        )}
      </main>
    </>
  );
}
