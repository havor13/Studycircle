import type { NotificationKind } from "@prisma/client";

/**
 * The notifications that can also arrive by email, with the words shown on the Account page.
 * Reactions, call announcements and others only ever appear in the bell.
 */
export const EMAIL_KIND_OPTIONS: { kind: NotificationKind; label: string; hint: string }[] = [
  { kind: "NEW_POST", label: "New posts", hint: "Someone posts in one of your circles." },
  { kind: "NEW_COMMENT", label: "Comments on your posts", hint: "Someone comments on a post you wrote." },
  { kind: "NEW_EVENT", label: "New study sessions", hint: "A study session is scheduled in one of your circles." },
  { kind: "EVENT_REMINDER", label: "Session reminders", hint: "A study session you are in starts soon." },
  { kind: "MEMBER_JOINED", label: "New members", hint: "Someone joins a circle you manage." },
  { kind: "ROLE_CHANGED", label: "Role changes", hint: "Your role in a circle changes." },
  { kind: "CONTENT_REPORT", label: "Reports to review", hint: "A post, comment or message was reported in a circle you moderate." },
];

export const EMAIL_KIND_VALUES = new Set<NotificationKind>(EMAIL_KIND_OPTIONS.map((o) => o.kind));
