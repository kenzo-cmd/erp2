import Link from "next/link";
import SignupForm from "./signup-form";

export default function SignupPage() {
  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <h1>Create an account</h1>
      <SignupForm />
      <p>
        Already have one? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
