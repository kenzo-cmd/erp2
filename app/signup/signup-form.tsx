"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    setPending(false);

    if (error) {
      setError(error.message);
      return;
    }

    // If the project requires email confirmation, signUp succeeds but returns
    // NO session - the account exists and is not yet usable. Without this
    // branch the user gets bounced back to /login with no explanation and
    // assumes signup failed.
    if (!data.session) {
      setNotice(
        "Account created. Check your email for a confirmation link, then sign in.",
      );
      return;
    }

    router.push("/dashboard");
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
          minLength={6}
          required
        />
      </label>

      <button type="submit" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
      </button>

      {error && (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </form>
  );
}
