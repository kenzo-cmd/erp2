"use client";

// 'use client' is here because this file needs useState (to hold what you
// typed and any error) and onSubmit (to react to a click). Those only exist
// in the browser. The PAGE that renders this stays a Server Component -
// the interactivity is quarantined to this one small file.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Without this the browser does a full page reload and we never see
    // the result of the request.
    event.preventDefault();
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setPending(false);

    if (error) {
      // The user MUST see this. A form that silently does nothing on failure
      // is worse than one that crashes - you cannot tell if it worked.
      setError(error.message);
      return;
    }

    router.push("/dashboard");
    // Server Components cached the logged-out state. refresh() makes them
    // re-run on the server so they see the session cookie we just received.
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8, maxWidth: 320 }}>
      <label>
        Email
        <br />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <label>
        Password
        <br />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      <button type="submit" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </button>

      {error && (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      )}
    </form>
  );
}
