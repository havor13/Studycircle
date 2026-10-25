"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { canModerate, requireMember } from "@/lib/permissions";
import type { FormState } from "@/lib/validations";

export type PollFormState = FormState & { done?: boolean };

const MAX_OPEN_POLLS = 10;

const pollSchema = z.object({
  question: z.string().trim().min(3, "Ask a question (at least 3 characters).").max(150, "Keep it under 150 characters."),
  options: z
    .array(z.string().trim().min(1).max(80, "Keep each choice under 80 characters."))
    .min(2, "Give at least two choices.")
    .max(6, "Six choices at most."),
});

export async function createPoll(
  groupId: string,
  _prev: PollFormState,
  formData: FormData,
): Promise<PollFormState> {
  const { userId, slug } = await requireMember(groupId);

  // Empty boxes are ignored, repeated choices are merged.
  const raw = formData
    .getAll("option")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const options = raw.filter((v, i) => raw.findIndex((w) => w.toLowerCase() === v.toLowerCase()) === i);

  const parsed = pollSchema.safeParse({ question: String(formData.get("question") ?? ""), options });
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const issues = parsed.error.issues;
    return {
      fieldErrors: {
        question: flat.fieldErrors.question,
        options: issues.filter((i) => i.path[0] === "options").map((i) => i.message),
      },
    };
  }

  const open = await db.poll.count({ where: { groupId, closed: false } });
  if (open >= MAX_OPEN_POLLS) {
    return { error: "This circle already has 10 open polls. Close one first." };
  }

  await db.poll.create({
    data: {
      groupId,
      creatorId: userId,
      question: parsed.data.question,
      options: { create: parsed.data.options.map((text, position) => ({ text, position })) },
    },
  });

  revalidatePath(`/groups/${slug}`);
  return { done: true };
}

/** One vote per person. Voting again for another choice moves your vote. */
export async function votePoll(pollId: string, optionId: string) {
  const poll = await db.poll.findUnique({
    where: { id: pollId },
    select: { groupId: true, closed: true, options: { where: { id: optionId }, select: { id: true } } },
  });
  if (!poll || poll.closed || poll.options.length === 0) return;

  const { userId, slug } = await requireMember(poll.groupId);

  await db.pollVote.upsert({
    where: { pollId_userId: { pollId, userId } },
    create: { pollId, optionId, userId },
    update: { optionId },
  });

  revalidatePath(`/groups/${slug}`);
}

export async function closePoll(pollId: string) {
  const poll = await db.poll.findUnique({ where: { id: pollId } });
  if (!poll) return;
  const { userId, membership, slug } = await requireMember(poll.groupId);
  if (poll.creatorId !== userId && !canModerate(membership.role)) return;

  await db.poll.update({ where: { id: pollId }, data: { closed: true } });
  revalidatePath(`/groups/${slug}`);
}

export async function deletePoll(pollId: string) {
  const poll = await db.poll.findUnique({ where: { id: pollId } });
  if (!poll) return;
  const { userId, membership, slug } = await requireMember(poll.groupId);
  if (poll.creatorId !== userId && !canModerate(membership.role)) return;

  await db.poll.delete({ where: { id: pollId } });
  revalidatePath(`/groups/${slug}`);
}
