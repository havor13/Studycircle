"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { cleanInviteCode } from "@/lib/invite";
import { notify } from "@/lib/notifications";
import { groupSchema, type FormState } from "@/lib/validations";

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "circle"
  );
}

export async function createGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const parsed = groupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { name, subject, description } = parsed.data;

  let slug = slugify(name);
  if (await db.group.findUnique({ where: { slug } })) {
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // The creator becomes OWNER in the same write.
  await db.group.create({
    data: {
      name,
      slug,
      subject: subject || null,
      description: description || null,
      memberships: { create: { userId: session.user.id, role: "OWNER" } },
    },
  });

  redirect(`/groups/${slug}`);
}

export async function joinGroup(inviteCode: string) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?redirectTo=/join/${inviteCode}`);

  const group = await db.group.findUnique({ where: { inviteCode } });
  if (!group) redirect("/dashboard");

  const userId = session.user.id;

  // Only create a membership if there is none, so an existing OWNER/ADMIN is
  // never downgraded to MEMBER and nobody is announced twice.
  const existing = await db.membership.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
  });

  if (!existing) {
    let created = true;
    try {
      await db.membership.create({ data: { userId, groupId: group.id, role: "MEMBER" } });
    } catch {
      created = false; // a double click joined first; nothing more to do
    }

    if (created) {
      const managers = await db.membership.findMany({
        where: { groupId: group.id, role: { in: ["OWNER", "ADMIN"] } },
        select: { userId: true },
      });
      await notify(
        managers.map((manager) => ({
          userId: manager.userId,
          actorId: userId,
          groupId: group.id,
          kind: "MEMBER_JOINED" as const,
          message: `${session.user.name ?? "Someone"} joined ${group.name}`,
          link: `/groups/${group.slug}`,
        })),
      );
    }
  }

  redirect(`/groups/${group.slug}`);
}

/**
 * For the "Join with an invite link" box on the dashboard. Accepts a full
 * link or just the code, checks it exists, then sends the person to the
 * normal join page where they confirm.
 */
export async function joinByCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const code = cleanInviteCode(String(formData.get("code") ?? ""));
  if (!code) {
    return {
      fieldErrors: { code: ["That does not look like an invite link or code. Paste the whole link or just the code."] },
    };
  }

  const group = await db.group.findUnique({ where: { inviteCode: code }, select: { id: true } });
  if (!group) {
    return { fieldErrors: { code: ["That invite was not found. Check the link and try again."] } };
  }

  redirect(`/join/${code}`);
}
