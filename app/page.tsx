// Server Component. No 'use client' here: this page only displays text,
// it has no useState and no onClick, so it renders on the server.
export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <h1>Kenzo Changrawinata</h1>
      <p>stockroom &mdash; a small inventory system.</p>

      <h2>Stages</h2>
      <ol>
        <li>Stage 0 &mdash; deployed (you are looking at it)</li>
        <li>Stage 1 &mdash; schema</li>
        <li>Stage 2 &mdash; login</li>
        <li>Stage 3 &mdash; items list</li>
        <li>Stage 4 &mdash; row level security</li>
        <li>Stage 5 &mdash; transfers</li>
        <li>Stage 6 &mdash; report</li>
      </ol>
    </main>
  );
}
