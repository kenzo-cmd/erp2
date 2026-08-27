"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AppNav from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Warehouses</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add a warehouse</CardTitle>
            <CardDescription>
              You need at least two to move stock between them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wh-code">Code</Label>
                  <Input
                    id="wh-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="WH-BDG"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wh-name">Name</Label>
                  <Input
                    id="wh-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Bandung Transit"
                    required
                  />
                </div>
              </div>

              {formError && (
                <Alert variant="destructive">
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={pending}>
                {pending ? "Adding…" : "Add warehouse"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {loadError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              Could not load warehouses: {loadError}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>All warehouses</CardTitle>
            <CardDescription>
              {loading ? "Loading…" : `${warehouses.length} warehouse(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!loading && warehouses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No warehouses yet. Add one above.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouses.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="font-mono text-xs">
                          {w.code}
                        </TableCell>
                        <TableCell className="font-medium">{w.name}</TableCell>
                        <TableCell>
                          <Badge variant={w.is_active ? "secondary" : "outline"}>
                            {w.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
