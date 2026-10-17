"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { requireMember } from "@/lib/permissions";
import { REACTION_EMOJIS } from "@/lib/reactions";

/** Adds the reaction if you haven't given it, removes it if you have. */
export async function togglePostReaction(postId: string, emoji: string) {
  if (!REACTION_EMOJIS.includes(emoji)) return;

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { groupId: true, authorId: true },
  });
  if (!post) return;

  const { userId, userName, groupName, slug } = await requireMember(post.groupId);

  const existing = await db.reaction.findFirst({ where: { userId, postId, emoji } });
  if (existing) {
    await db.reaction.delete({ where: { id: existing.id } });
  } else {
    await db.reaction.create({ data: { userId, postId, emoji } });

    // Tell the author, but not about reactions to your own post.
    if (post.authorId !== userId) {
      await notify([
        {
          userId: post.authorId,
          actorId: userId,
          groupId: post.groupId,
          kind: "POST_REACTION" as const,
          message: `${userName} reacted ${emoji} to your post in ${groupName}`,
          link: `/groups/${slug}`,
        },
      ]);
    }
  }

  revalidatePath(`/groups/${slug}`);
}

/** Same toggle, for a chat message. */
export async function toggleMessageReaction(messageId: string, emoji: string) {
  if (!REACTION_EMOJIS.includes(emoji)) return;

  const message = await db.message.findUnique({
    where: { id: messageId },
    select: { groupId: true },
  });
  if (!message) return;

  const { userId, slug } = await requireMember(message.groupId);

  const existing = await db.reaction.findFirst({ where: { userId, messageId, emoji } });
  if (existing) {
    await db.reaction.delete({ where: { id: existing.id } });
  } else {
    await db.reaction.create({ data: { userId, messageId, emoji } });
  }

  revalidatePath(`/groups/${slug}/chat`);
}
