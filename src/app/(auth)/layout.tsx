import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="rounded-2xl border border-line bg-surface p-8">{children}</div>
    </main>
  );
}
