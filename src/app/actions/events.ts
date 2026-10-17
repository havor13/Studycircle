"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { canModerate, requireMember } from "@/lib/permissions";
import type { FormState } from "@/lib/validations";

export type EventFormState = FormState & { done?: boolean };

const DURATIONS = [30, 60, 90, 120, 180];

const eventSchema = z.object({
  title: z.string().trim().min(2, "Give the session a title (at least 2 characters).").max(100),
  // The browser sends the start time as an ISO string in UTC, so the server never has to guess a time zone.
  startsAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Pick a date and time."),
  durationMinutes: z.coerce
    .number()
    .int()
    .refine((v) => DURATIONS.includes(v), "Pick a length from the list.")
    .default(60),
  location: z.string().trim().max(200, "Keep it under 200 characters.").optional(),
  notes: z.string().trim().max(500, "Keep it under 500 characters.").optional(),
});

export async function createEvent(
  groupId: string,
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const { userId, userName, groupName, slug } = await requireMember(groupId);

  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { title, durationMinutes, location, notes } = parsed.data;
  const startsAt = new Date(parsed.data.startsAt);

  const now = Date.now();
  if (startsAt.getTime() < now - 5 * 60 * 1000) {
    return { fieldErrors: { startsAt: ["Pick a time in the future."] } };
  }
  if (startsAt.getTime() > now + 366 * 24 * 60 * 60 * 1000) {
    return { fieldErrors: { startsAt: ["Pick a date within the next year."] } };
  }

  await db.studyEvent.create({
    data: {
      groupId,
      creatorId: userId,
      title,
      startsAt,
      durationMinutes,
      location: location || null,
      notes: notes || null,
      // The organiser is going by default.
      rsvps: { create: { userId } },
    },
  });

  const others = await db.membership.findMany({
    where: { groupId, userId: { not: userId } },
    select: { userId: true },
  });
  await notify(
    others.map((other) => ({
      userId: other.userId,
      actorId: userId,
      groupId,
      kind: "NEW_EVENT" as const,
      message: `${userName} planned a study session in ${groupName}: ${title}`,
      link: `/groups/${slug}`,
    })),
  );

  revalidatePath(`/groups/${slug}`);
  return { done: true };
}

/** "I'm going" on or off. */
export async function toggleRsvp(eventId: string) {
  const event = await db.studyEvent.findUnique({ where: { id: eventId } });
  if (!event) return;

  const { userId, slug } = await requireMember(event.groupId);

  const removed = await db.eventRsvp.deleteMany({ where: { eventId, userId } });
  if (removed.count === 0) {
    try {
      await db.eventRsvp.create({ data: { eventId, userId } });
    } catch {
      // Two taps at once: the other one already added it.
    }
  }

  revalidatePath(`/groups/${slug}`);
}

export async function deleteEvent(eventId: string) {
  const event = await db.studyEvent.findUnique({ where: { id: eventId } });
  if (!event) return;

  const { userId, membership, slug } = await requireMember(event.groupId);
  const allowed = event.creatorId === userId || canModerate(membership.role);
  if (!allowed) return;

  await db.studyEvent.delete({ where: { id: event.id } });
  revalidatePath(`/groups/${slug}`);
}
