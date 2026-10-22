"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { isManager, requireMember } from "@/lib/permissions";
import { groupSchema } from "@/lib/validations";

export type GroupSettingsState = {
  done?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

/** Owner and admins change the circle's name, subject and description. The web address (slug) stays the same, so links keep working. */
export async function updateGroup(
  groupId: string,
  _prev: GroupSettingsState,
  formData: FormData,
): Promise<GroupSettingsState> {
  const { membership, slug } = await requireMember(groupId);
  if (!isManager(membership.role)) return { error: "Only the owner and admins can change circle settings." };

  const parsed = groupSchema.safeParse({
    name: formData.get("name") ?? "",
    subject: formData.get("subject") ?? "",
    description: formData.get("description") ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const { name, subject, description } = parsed.data;

  await db.group.update({
    where: { id: groupId },
    data: { name, subject: subject || null, description: description || null },
  });

  revalidatePath(`/groups/${slug}`, "layout");
  revalidatePath("/dashboard");
  revalidatePath("/discover");
  return { done: true };
}

/** Makes a new invite link. Every older link and code stops working at once. */
export async function resetInviteCode(groupId: string): Promise<GroupSettingsState> {
  const { membership, slug } = await requireMember(groupId);
  if (!isManager(membership.role)) return { error: "Only the owner and admins can do this." };

  await db.group.update({ where: { id: groupId }, data: { inviteCode: randomBytes(16).toString("base64url") } });
  revalidatePath(`/groups/${slug}`);
  revalidatePath(`/groups/${slug}/settings`);
  return { done: true };
}
