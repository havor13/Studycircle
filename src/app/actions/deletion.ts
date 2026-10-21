"use server";

import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import bcrypt from "bcryptjs";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { MAX_FAILED_PER_EMAIL, windowStart } from "@/lib/login-limits";
import { requireMember } from "@/lib/permissions";

export type DeleteState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

/** Removes stored files (uploads and profile pictures). A failure here is logged, never fatal: the database rows are already gone. */
async function removeBlobs(paths: (string | null | undefined)[]) {
  for (const path of paths) {
    if (!path) continue;
    try {
      await del(path);
    } catch (error) {
      console.error("Could not delete a stored file", error);
    }
  }
}

/** The OWNER deletes the whole circle: posts, chat, sessions, files, everything in it. Cannot be undone. */
export async function deleteGroup(groupId: string, _prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const { membership, groupName } = await requireMember(groupId);
  if (membership.role !== "OWNER") return { error: "Only the owner can delete a circle." };

  const typed = String(formData.get("confirm") ?? "").trim();
  if (typed !== groupName) {
    return { fieldErrors: { confirm: ["Type the circle name exactly as shown to confirm."] } };
  }

  const files = await db.resource.findMany({ where: { groupId, kind: "FILE" }, select: { url: true } });
  await db.group.delete({ where: { id: groupId } }); // posts, chat, sessions, resources, members go with it
  await removeBlobs(files.map((f) => f.url));

  redirect("/dashboard");
}

/**
 * Deletes the logged-in account and everything it created.
 * Circles the person owns that still have other members block this: they must hand the circle on first.
 */
export async function deleteAccount(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const password = String(formData.get("password") ?? "");
  const typed = String(formData.get("confirm") ?? "").trim();

  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, passwordHash: true, image: true } });
  if (!user) redirect("/login");

  // The same guessing limit as the login page, so a stolen session cannot be used to guess the password here.
  const recentFailures = await db.loginAttempt.count({
    where: { email: user.email, createdAt: { gt: windowStart() } },
  });
  if (recentFailures >= MAX_FAILED_PER_EMAIL) {
    return { error: "Too many wrong passwords. Wait 15 minutes and try again." };
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    await db.loginAttempt.create({ data: { email: user.email } }).catch(() => undefined);
    return { fieldErrors: { password: ["That is not your password."] } };
  }
  if (typed !== "DELETE") {
    return { fieldErrors: { confirm: ["Type DELETE in capital letters to confirm."] } };
  }

  const owned = await db.membership.findMany({
    where: { userId, role: "OWNER" },
    select: { group: { select: { id: true, name: true, _count: { select: { memberships: true } } } } },
  });
  const blocking = owned.filter((o) => o.group._count.memberships > 1).map((o) => o.group.name);
  if (blocking.length > 0) {
    const shown = blocking.slice(0, 3).join(", ") + (blocking.length > 3 ? ` and ${blocking.length - 3} more` : "");
    return {
      error: `You still own ${shown}, and other people are in it. Make another member the owner, or delete the circle, then try again.`,
    };
  }
  const aloneGroupIds = owned.map((o) => o.group.id); // circles where you are the only member

  // Collect stored files before the rows disappear.
  const files = await db.resource.findMany({
    where: {
      kind: "FILE",
      OR: [{ uploaderId: userId }, ...(aloneGroupIds.length ? [{ groupId: { in: aloneGroupIds } }] : [])],
    },
    select: { url: true },
  });

  await db.$transaction([
    db.group.deleteMany({ where: { id: { in: aloneGroupIds } } }),
    db.user.delete({ where: { id: userId } }), // everything else the person made goes with the account
  ]);
  await removeBlobs([user.image, ...files.map((f) => f.url)]);

  await signOut({ redirectTo: "/" });
  return {};
}
