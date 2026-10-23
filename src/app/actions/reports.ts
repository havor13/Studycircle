"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { z } from "zod";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { canModerate, requireMember } from "@/lib/permissions";
import { pingChat } from "@/lib/pusher-server";

export type ReportState = {
  done?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

const reasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Tell the moderators briefly what is wrong.")
    .max(500, "Keep it under 500 characters."),
});

const MAX_REPORTS_PER_HOUR = 10;

/** Tells the circle's owner, admins and moderators (not the reporter, not the author). */
async function alertModerators(groupId: string, groupName: string, slug: string, what: string, skip: string[]) {
  const staff = await db.membership.findMany({
    where: { groupId, role: { in: ["OWNER", "ADMIN", "MODERATOR"] }, userId: { notIn: skip } },
    select: { userId: true },
  });
  await notify(
    staff.map((m) => ({
      userId: m.userId,
      groupId,
      kind: "CONTENT_REPORT" as const,
      message: `${what} was reported in ${groupName}. Please take a look.`,
      link: `/groups/${slug}/reports`,
    })),
  );
}

async function tooManyReports(userId: string) {
  const recent = await db.contentReport.count({
    where: { reporterId: userId, createdAt: { gt: new Date(Date.now() - 3600_000) } },
  });
  return recent >= MAX_REPORTS_PER_HOUR;
}

export async function reportPost(postId: string, _prev: ReportState, formData: FormData): Promise<ReportState> {
  const parsed = reasonSchema.safeParse({ reason: formData.get("reason") ?? "" });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const post = await db.post.findUnique({ where: { id: postId }, select: { groupId: true, authorId: true } });
  if (!post) return { error: "That post no longer exists." };
  const { userId, groupName, slug } = await requireMember(post.groupId);

  if (post.authorId === userId) return { error: "You cannot report your own post." };
  if (await tooManyReports(userId)) return { error: "You have sent several reports. Try again later." };
  if (await db.contentReport.findFirst({ where: { reporterId: userId, postId }, select: { id: true } })) {
    return { done: true }; // already reported: say thanks again, create nothing
  }

  await db.contentReport.create({ data: { groupId: post.groupId, reporterId: userId, postId, reason: parsed.data.reason } });
  await alertModerators(post.groupId, groupName, slug, "A post", [userId, post.authorId]);
  return { done: true };
}

export async function reportMessage(messageId: string, _prev: ReportState, formData: FormData): Promise<ReportState> {
  const parsed = reasonSchema.safeParse({ reason: formData.get("reason") ?? "" });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const message = await db.message.findUnique({ where: { id: messageId }, select: { groupId: true, authorId: true } });
  if (!message) return { error: "That message no longer exists." };
  const { userId, groupName, slug } = await requireMember(message.groupId);

  if (message.authorId === userId) return { error: "You cannot report your own message." };
  if (await tooManyReports(userId)) return { error: "You have sent several reports. Try again later." };
  if (await db.contentReport.findFirst({ where: { reporterId: userId, messageId }, select: { id: true } })) {
    return { done: true };
  }

  await db.contentReport.create({
    data: { groupId: message.groupId, reporterId: userId, messageId, reason: parsed.data.reason },
  });
  await alertModerators(message.groupId, groupName, slug, "A chat message", [userId, message.authorId]);
  return { done: true };
}

export async function reportComment(commentId: string, _prev: ReportState, formData: FormData): Promise<ReportState> {
  const parsed = reasonSchema.safeParse({ reason: formData.get("reason") ?? "" });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, post: { select: { groupId: true } } },
  });
  if (!comment) return { error: "That comment no longer exists." };
  const groupId = comment.post.groupId;
  const { userId, groupName, slug } = await requireMember(groupId);

  if (comment.authorId === userId) return { error: "You cannot report your own comment." };
  if (await tooManyReports(userId)) return { error: "You have sent several reports. Try again later." };
  if (await db.contentReport.findFirst({ where: { reporterId: userId, commentId }, select: { id: true } })) {
    return { done: true };
  }

  await db.contentReport.create({ data: { groupId, reporterId: userId, commentId, reason: parsed.data.reason } });
  await alertModerators(groupId, groupName, slug, "A comment", [userId, comment.authorId]);
  return { done: true };
}

/** Moderators: "I looked at it, nothing more to do." */
export async function resolveReport(reportId: string) {
  const report = await db.contentReport.findUnique({ where: { id: reportId }, select: { groupId: true } });
  if (!report) return;
  const { userId, membership, slug } = await requireMember(report.groupId);
  if (!canModerate(membership.role)) return;

  await db.contentReport.update({
    where: { id: reportId },
    data: { status: "RESOLVED", resolvedById: userId, resolvedAt: new Date() },
  });
  revalidatePath(`/groups/${slug}/reports`);
  revalidatePath(`/groups/${slug}`);
}

/** Moderators: delete the reported post or message (the report goes with it). */
export async function removeReportedContent(reportId: string) {
  const report = await db.contentReport.findUnique({
    where: { id: reportId },
    select: { groupId: true, postId: true, messageId: true, commentId: true, message: { select: { attachmentPath: true } } },
  });
  if (!report) return;
  const { membership, slug } = await requireMember(report.groupId);
  if (!canModerate(membership.role)) return;

  if (report.postId) {
    await db.post.delete({ where: { id: report.postId } });
  } else if (report.commentId) {
    await db.comment.delete({ where: { id: report.commentId } });
  } else if (report.messageId) {
    await db.message.delete({ where: { id: report.messageId } });
    if (report.message?.attachmentPath) {
      try {
        await del(report.message.attachmentPath);
      } catch (error) {
        console.error("Could not delete a reported attachment", error);
      }
    }
    await pingChat(report.groupId);
  }
  revalidatePath(`/groups/${slug}/reports`);
  revalidatePath(`/groups/${slug}`);
  revalidatePath(`/groups/${slug}/chat`);
}
