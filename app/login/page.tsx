import Link from "next/link";
import LoginForm from "./login-form";

// Server Component: it renders static text and one Client Component.
// It has no state and no event handlers of its own, so it needs no
// 'use client'.
export default function LoginPage() {
  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <h1>Sign in</h1>
      <LoginForm />
      <p>
        No account? <Link href="/signup">Create one</Link>
      </p>
    </main>
  );
}
