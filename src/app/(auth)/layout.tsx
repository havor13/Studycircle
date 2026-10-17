import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-8">
        <Logo href="/" />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8">
        {children}
      </div>
    </div>
  );
}
