import Link from "next/link";
import { auth } from "@/auth";
import { Logo } from "@/components/logo";

const sampleCircles = [
  { name: "Organic Chemistry", members: 6, note: "Mechanisms quiz tomorrow, 7pm" },
  { name: "Calculus II", members: 4, note: "3 new notes shared today" },
  { name: "Data Structures", members: 9, note: "Mock interview on Friday" },
];

export default async function Home() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-6xl px-6">
      <header className="flex items-center justify-between py-6">
        <Logo />
        <nav className="flex items-center gap-3 text-sm font-semibold">
          {session ? (
            <Link href="/dashboard" className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark">
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="px-3 py-2 hover:text-brand">Log in</Link>
              <Link href="/register" className="rounded-lg bg-brand px-4 py-2 text-white hover:bg-brand-dark">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
        <div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Study with people who are studying the same thing.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
            Make a circle for your course, chat with your group, share notes in one place, and see how
            much time everyone is putting in.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark">
              Create your circle
            </Link>
            <Link href="/login" className="rounded-lg border border-line bg-surface px-6 py-3 font-semibold hover:border-brand">
              Log in
            </Link>
          </div>
        </div>

        <ul className="space-y-4" aria-label="Example study circles">
          {sampleCircles.map((c, i) => (
            <li
              key={c.name}
              className="rounded-2xl border border-line bg-surface p-5"
              style={{ marginLeft: `${i * 24}px` }}
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-xl font-bold">{c.name}</h2>
                <span className="text-sm text-muted">{c.members} members</span>
              </div>
              <p className="mt-2 inline rounded bg-mark/60 px-1.5 py-0.5 text-sm">{c.note}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
