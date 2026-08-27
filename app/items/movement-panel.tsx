"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
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
    <Card className="mt-6">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Stock movements</CardTitle>
          <CardDescription>{itemCode}</CardDescription>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <h4 className="mb-2 text-sm font-medium">On hand</h4>
          <div className="flex flex-wrap gap-2">
            {onHandByWarehouse.map(({ warehouse, onHand }) => (
              <Badge key={warehouse.id} variant="secondary" className="text-sm">
                {warehouse.name}
                <span className="ml-2 tabular-nums font-semibold">{onHand}</span>
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        <form onSubmit={handleSubmit} className="space-y-4">
          <h4 className="text-sm font-medium">Record a movement</h4>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="mv-warehouse">Warehouse</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger id="mv-warehouse" className="w-full">
                  <SelectValue placeholder="Choose" />
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
              <Label htmlFor="mv-type">Type</Label>
              <Select value={movementType} onValueChange={setMovementType}>
                <SelectTrigger id="mv-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEIPT">Receipt (in)</SelectItem>
                  <SelectItem value="ISSUE">Issue (out)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mv-qty">Quantity</Label>
              {/* Always a positive number. The server applies the sign from
                  the type - a user should never type a minus to mean "out". */}
              <Input
                id="mv-qty"
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
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

          <Button type="submit" disabled={pending}>
            {pending ? "Recording…" : "Record"}
          </Button>
        </form>

        <Separator />

        <div>
          <h4 className="mb-2 text-sm font-medium">History</h4>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No movements recorded for this item.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(m.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{warehouseName(m.warehouse_id)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            Number(m.quantity) >= 0 ? "secondary" : "outline"
                          }
                        >
                          {m.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(m.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
