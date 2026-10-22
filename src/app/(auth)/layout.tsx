import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Logo href="/" />
      </div>
      <main id="main" className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 sm:p-8">
        {children}
      </main>
    </div>
  );
}
