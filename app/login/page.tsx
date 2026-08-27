import Link from "next/link";
import LoginForm from "./login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Server Component: it renders static text and one Client Component.
// It has no state and no event handlers of its own, so it needs no
// 'use client'.
export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>
            Welcome back to stockroom.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          No account?
          <Link href="/signup" className="ml-1 underline underline-offset-4">
            Create one
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
