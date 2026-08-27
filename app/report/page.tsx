import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppNav from "@/components/app-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

type Row = {
  item_code: string;
  item_name: string;
  uom: string;
  warehouse_name: string;
  on_hand: number;
};

// A Server Component, and the only screen with no Client Component of its own
// besides the shared nav. It displays data and nothing else - no useState, no
// onClick - so the browser receives finished HTML.
export default async function ReportPage() {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  // Reading the view, not re-deriving the sum here. One definition of
  // "on hand", in the database, shared by every caller.
  const { data, error } = await supabase
    .from("stock_on_hand")
    .select("item_code, item_name, uom, warehouse_name, on_hand")
    .order("item_code")
    .order("warehouse_name");

  const rows = (data ?? []) as Row[];
  const total = rows.reduce((sum, r) => sum + Number(r.on_hand), 0);

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">
          Stock on hand
        </h1>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              Could not load the report: {error.message}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Per item, per warehouse</CardTitle>
            <CardDescription>
              {rows.length} row(s)
              {rows.length > 0 && (
                <>
                  {" · "}
                  <span className="tabular-nums">{total}</span> units total
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!error && rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing in stock yet. Record a receipt from{" "}
                <Link href="/items" className="underline underline-offset-4">
                  Items
                </Link>
                .
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-right">On hand</TableHead>
                      <TableHead>Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={`${row.item_code}-${row.warehouse_name}`}>
                        <TableCell className="font-mono text-xs">
                          {row.item_code}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.item_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.warehouse_name}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(row.on_hand)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{row.uom}</Badge>
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
