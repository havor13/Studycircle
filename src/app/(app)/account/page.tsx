import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Avatar } from "@/components/avatar";
import { AvatarForm } from "@/components/avatar-form";
import { ChangePasswordForm } from "@/components/change-password-form";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-3xl font-bold">Account</h1>
      <p className="mt-1 text-sm text-muted">
        {user.name} · {user.email}
      </p>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-bold">Profile picture</h2>
        <div className="mt-3 flex items-center gap-4">
          <Avatar userId={session.user.id} name={user.name} image={user.image} size={72} />
          <AvatarForm hasPicture={Boolean(user.image)} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-bold">Change password</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          You stay logged in on this device. Other devices stay logged in until they log out.
        </p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
