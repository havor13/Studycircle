"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { canModerate, requireMember } from "@/lib/permissions";
import type { LogState } from "@/lib/progress";

const MAX_MINUTES = 720; // 12 hours in one session

export async function logSession(
  groupId: string,
  _prev: LogState,
  formData: FormData,
): Promise<LogState> {
  const { userId, slug } = await requireMember(groupId);

  const minutes = Number(formData.get("minutes"));
  const topic = String(formData.get("topic") ?? "").trim().slice(0, 80);

  if (!Number.isInteger(minutes) || minutes < 1) {
    return { fieldErrors: { minutes: ["Enter a whole number of minutes (at least 1)."] } };
  }
  if (minutes > MAX_MINUTES) {
    return { fieldErrors: { minutes: ["A single session can be at most 12 hours (720 minutes)."] } };
  }

  await db.studySession.create({
    data: { userId, groupId, minutes, topic: topic || null },
  });

  revalidatePath(`/groups/${slug}/progress`);
  return { saved: Date.now() };
}

export async function deleteSession(sessionId: string) {
  const session = await db.studySession.findUnique({ where: { id: sessionId } });
  if (!session) return;

  const { userId, membership, slug } = await requireMember(session.groupId);
  const allowed = session.userId === userId || canModerate(membership.role);
  if (!allowed) return;

  await db.studySession.delete({ where: { id: session.id } });
  revalidatePath(`/groups/${slug}/progress`);
}
