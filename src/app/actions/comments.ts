"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { canModerate, requireMember } from "@/lib/permissions";

export type CommentState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment first.").max(500, "Keep it under 500 characters."),
});

const MAX_COMMENTS_PER_MINUTE = 10;

export async function createComment(postId: string, _prev: CommentState, formData: FormData): Promise<CommentState> {
  const parsed = commentSchema.safeParse({ body: formData.get("body") ?? "" });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const post = await db.post.findUnique({ where: { id: postId }, select: { groupId: true, authorId: true } });
  if (!post) return { error: "That post no longer exists." };
  const { userId, userName, groupName, slug } = await requireMember(post.groupId);

  const recent = await db.comment.count({
    where: { authorId: userId, createdAt: { gt: new Date(Date.now() - 60_000) } },
  });
  if (recent >= MAX_COMMENTS_PER_MINUTE) return { error: "You are commenting very fast. Wait a minute and try again." };

  await db.comment.create({ data: { postId, authorId: userId, body: parsed.data.body } });

  // Tell the post's author, but not about their own comments.
  if (post.authorId !== userId) {
    await notify([
      {
        userId: post.authorId,
        actorId: userId,
        groupId: post.groupId,
        kind: "NEW_COMMENT" as const,
        message: `${userName} commented on your post in ${groupName}`,
        link: `/groups/${slug}`,
      },
    ]);
  }

  revalidatePath(`/groups/${slug}`);
  return {};
}

/** The comment's author, or a moderator, can delete a comment. */
export async function deleteComment(commentId: string) {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, post: { select: { groupId: true } } },
  });
  if (!comment) return;

  const { userId, membership, slug } = await requireMember(comment.post.groupId);
  if (comment.authorId !== userId && !canModerate(membership.role)) return;

  await db.comment.delete({ where: { id: comment.id } });
  revalidatePath(`/groups/${slug}`);
}
