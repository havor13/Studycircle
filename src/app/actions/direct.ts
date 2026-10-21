"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { MAX_DM_LENGTH, MAX_DM_PER_MINUTE, sharesCircle } from "@/lib/direct";
import { pingUser } from "@/lib/pusher-server";
import type { FormState } from "@/lib/validations";

const bodySchema = z.object({
  body: z.string().trim().min(1, "Type a message first.").max(MAX_DM_LENGTH, `Keep it under ${MAX_DM_LENGTH} characters.`),
});

export async function sendDirectMessage(otherId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = session.user.id;

  const parsed = bodySchema.safeParse({ body: formData.get("body") ?? "" });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  if (!(await sharesCircle(me, otherId))) {
    return { error: "You can only message people you share a circle with." };
  }

  const recent = await db.directMessage.count({
    where: { senderId: me, createdAt: { gt: new Date(Date.now() - 60_000) } },
  });
  if (recent >= MAX_DM_PER_MINUTE) return { error: "You are sending very fast. Wait a minute and try again." };

  await db.directMessage.create({ data: { senderId: me, recipientId: otherId, body: parsed.data.body } });
  revalidatePath(`/messages/${otherId}`);
  await Promise.all([pingUser(otherId), pingUser(me)]);
  return {};
}

/** You can delete your own private messages; it removes them for both people. */
export async function deleteDirectMessage(messageId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const message = await db.directMessage.findUnique({ where: { id: messageId } });
  if (!message || message.senderId !== session.user.id) return;

  await db.directMessage.delete({ where: { id: message.id } });
  revalidatePath(`/messages/${message.recipientId}`);
  await Promise.all([pingUser(message.recipientId), pingUser(message.senderId)]);
}
