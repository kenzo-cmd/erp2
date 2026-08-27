import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Server Component. No 'use client': this page only displays text and links,
// it has no useState and no onClick, so it renders on the server.
export default function Home() {
  const features = [
    {
      title: "Items and warehouses",
      body: "Create items, edit them, and deactivate them without losing their history.",
    },
    {
      title: "Stock movements",
      body: "Record receipts and issues. Stock on hand is derived from movements, never cached.",
    },
    {
      title: "Atomic transfers",
      body: "Moving stock writes two rows through a database function — both happen, or neither does.",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-16">
      <p className="text-sm text-muted-foreground">Kenzo Changrawinata</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">stockroom</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        A small inventory system. Items, warehouses, and stock movements, with
        every row owned by the person who created it.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/signup">Create an account</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardContent className="pt-6">
              <h2 className="font-medium">{feature.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{feature.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
