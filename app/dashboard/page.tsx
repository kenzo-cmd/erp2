import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppNav from "@/components/app-nav";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Server Component, and an async one. It can await a database call directly -
// that is the thing a Client Component cannot do.
export default async function DashboardPage() {
  const supabase = await createClient();

  // This is the SECURITY BOUNDARY. proxy.ts also checks, but that is a
  // convenience: it redirects early so the user does not watch a protected
  // page flash before bouncing. If you deleted the proxy check, this page
  // would still be safe. If you deleted THIS check and trusted only the
  // proxy, any request that the matcher does not cover reaches the page with
  // no auth check at all.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    redirect("/login");
  }

  // head: true returns the count with no rows - we want the number, not the
  // data. RLS means these are THIS user's counts, not everyone's.
  const [items, warehouses, movements] = await Promise.all([
    supabase.from("items").select("id", { count: "exact", head: true }),
    supabase.from("warehouses").select("id", { count: "exact", head: true }),
    supabase.from("stock_movements").select("id", { count: "exact", head: true }),
  ]);

  const itemCount = items.count ?? 0;
  const warehouseCount = warehouses.count ?? 0;
  const movementCount = movements.count ?? 0;

  // A brand new account owns nothing, because every policy is keyed on
  // owner_id. That is correct behaviour, but an empty app with no
  // instructions is a dead end - so tell them what order to do things in.
  const isNewAccount = itemCount === 0 || warehouseCount === 0;

  const stats = [
    { label: "Items", value: itemCount, href: "/items" },
    { label: "Warehouses", value: warehouseCount, href: "/warehouses" },
    { label: "Stock movements", value: movementCount, href: "/report" },
  ];

  const steps = [
    {
      done: warehouseCount > 0,
      body: (
        <>
          <Link href="/warehouses" className="underline underline-offset-4">
            Create a warehouse
          </Link>{" "}
          &mdash; make two if you want to try a transfer
        </>
      ),
    },
    {
      done: itemCount > 0,
      body: (
        <Link href="/items" className="underline underline-offset-4">
          Create an item
        </Link>
      ),
    },
    {
      done: movementCount > 0,
      body: (
        <>
          On{" "}
          <Link href="/items" className="underline underline-offset-4">
            Items
          </Link>
          , press <strong>Movements</strong> and record a receipt, so there is
          stock to move
        </>
      ),
    },
    {
      done: false,
      body: (
        <>
          <Link href="/transfers" className="underline underline-offset-4">
            Transfer
          </Link>{" "}
          some of it to your second warehouse
        </>
      ),
    },
    {
      done: false,
      body: (
        <>
          Confirm the{" "}
          <Link href="/report" className="underline underline-offset-4">
            report
          </Link>{" "}
          reflects it
        </>
      ),
    },
  ];

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {String(claims.email)}
          </p>
        </div>

        {isNewAccount ? (
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Start here</CardTitle>
              <CardDescription>
                This account is empty. You only ever see your own data, so a new
                account starts with nothing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                {steps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                      {step.done ? "✓" : index + 1}
                    </span>
                    <span
                      className={
                        step.done ? "text-muted-foreground line-through" : ""
                      }
                    >
                      {step.body}
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="pb-2">
                  <CardDescription>{stat.label}</CardDescription>
                  <CardTitle className="text-3xl tabular-nums">
                    {stat.value}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" size="sm">
                    <Link href={stat.href}>View</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
