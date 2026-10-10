import Link from "next/link";

// Placeholder. The real landing page, with store badges and the public
// checklists, is Phase 8 of the web plan.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold">Coin Odyssey</h1>
      <p className="text-muted-foreground">
        Photograph a coin, learn its story, and catalog your collection.
      </p>
      <div>
        <Link href="/auth/signin" className="underline">
          Sign in
        </Link>
      </div>
    </main>
  );
}
