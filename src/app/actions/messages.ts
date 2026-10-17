"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { canModerate, requireMember } from "@/lib/permissions";
import { pingChat } from "@/lib/pusher-server";
import type { FormState } from "@/lib/validations";

const messageSchema = z.object({
  body: z.string().trim().min(1, "Type a message first.").max(1000, "Keep it under 1000 characters."),
});

export async function sendMessage(
  groupId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, slug } = await requireMember(groupId);

  const parsed = messageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db.message.create({
    data: { groupId, authorId: userId, body: parsed.data.body },
  });

  revalidatePath(`/groups/${slug}/chat`);
  await pingChat(groupId);
  return {};
}

export async function deleteMessage(messageId: string) {
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message) return;

  const { userId, membership, slug } = await requireMember(message.groupId);
  const allowed = message.authorId === userId || canModerate(membership.role);
  if (!allowed) return;

  await db.message.delete({ where: { id: message.id } });
  revalidatePath(`/groups/${slug}/chat`);
  await pingChat(message.groupId);
}
