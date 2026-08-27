"use client";

// Client Component because it needs usePathname() to highlight the current
// page. That is the only reason - the links themselves are plain markup.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import SignOutButton from "@/app/sign-out-button";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/items", label: "Items" },
  { href: "/warehouses", label: "Warehouses" },
  { href: "/transfers", label: "Transfers" },
  { href: "/report", label: "Report" },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-6 py-3">
        <Link href="/dashboard" className="mr-4 font-semibold tracking-tight">
          stockroom
        </Link>

        <nav className="flex flex-wrap items-center gap-1">
          {LINKS.map((link) => (
            <Button
              key={link.href}
              asChild
              variant="ghost"
              size="sm"
              className={cn(
                pathname === link.href &&
                  "bg-accent text-accent-foreground font-medium",
              )}
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="ml-auto">
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
