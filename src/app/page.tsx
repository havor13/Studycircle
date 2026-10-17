import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo href="/" />
        <nav className="flex items-center gap-3 text-sm font-semibold">
          <Link href="/login" className="rounded-lg px-3 py-1.5 hover:text-brand">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark"
          >
            Sign up
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="font-display text-5xl font-bold leading-tight sm:text-6xl">
          Study together, stay on track.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          Create a circle for your course, share notes and resources, chat with classmates
          and keep each other motivated.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
          >
            Start a circle
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-line bg-surface px-6 py-3 font-semibold hover:border-brand"
          >
            Log in
          </Link>
        </div>
      </main>
    </div>
  );
}
