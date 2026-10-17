"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { canModerate, requireMember } from "@/lib/permissions";
import type { FormState } from "@/lib/validations";

const postSchema = z.object({
  body: z.string().trim().min(1, "Write something first.").max(2000, "Keep it under 2000 characters."),
});

export async function createPost(
  groupId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, userName, groupName, slug } = await requireMember(groupId);

  const parsed = postSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db.post.create({
    data: { groupId, authorId: userId, body: parsed.data.body },
  });

  // Tell everyone else in the circle.
  const others = await db.membership.findMany({
    where: { groupId, userId: { not: userId } },
    select: { userId: true },
  });
  await notify(
    others.map((other) => ({
      userId: other.userId,
      actorId: userId,
      groupId,
      kind: "NEW_POST" as const,
      message: `${userName} posted in ${groupName}`,
      link: `/groups/${slug}`,
    })),
  );

  revalidatePath(`/groups/${slug}`);
  return {};
}

export async function togglePin(postId: string) {
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) return;

  const { membership, slug } = await requireMember(post.groupId);
  if (!canModerate(membership.role)) return;

  await db.post.update({ where: { id: post.id }, data: { pinned: !post.pinned } });
  revalidatePath(`/groups/${slug}`);
}

export async function deletePost(postId: string) {
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) return;

  const { userId, membership, slug } = await requireMember(post.groupId);
  const allowed = post.authorId === userId || canModerate(membership.role);
  if (!allowed) return;

  await db.post.delete({ where: { id: post.id } });
  revalidatePath(`/groups/${slug}`);
}
