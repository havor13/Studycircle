import { createHash, createHmac } from "crypto";

/**
 * Two ways to run a call, chosen by one setting:
 * - DAILY_API_KEY set: calls run inside the page on Daily (daily.co): private rooms, a personal pass per member.
 * - No key (default while developing): the Call button opens a Jitsi room (meet.jit.si) in a new tab. The room
 *   name is a long code made with a server secret, so it cannot be guessed, but anyone who is given the link can join.
 * Moving to Daily later needs no code change: add the key and redeploy.
 */
const API = "https://api.daily.co/v1";

export function dailyConfigured() {
  return Boolean(process.env.DAILY_API_KEY?.trim());
}

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.DAILY_API_KEY?.trim()}`,
});

/** One fixed room per circle. Room names only use letters, numbers and dashes. */
export const circleRoomName = (groupId: string) => `sc-c-${groupId.replace(/[^A-Za-z0-9]/g, "")}`;

/** One fixed room per pair of people, the same whichever of them starts the call. The ids are hashed so they are not exposed. */
export const directRoomName = (a: string, b: string) =>
  `sc-d-${createHash("sha256").update([a, b].sort().join(":")).digest("hex").slice(0, 28)}`;

/** Finds the room, creating it (private: nobody can join without a token we hand out) when it does not exist yet. */
async function ensureRoom(name: string): Promise<string> {
  const find = async () => {
    const res = await fetch(`${API}/rooms/${name}`, { headers: headers(), cache: "no-store" });
    if (res.ok) return ((await res.json()) as { url: string }).url;
    return null;
  };

  const existing = await find();
  if (existing) return existing;

  const created = await fetch(`${API}/rooms`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name,
      privacy: "private",
      properties: { enable_prejoin_ui: true, enable_chat: true },
    }),
    cache: "no-store",
  });
  if (created.ok) return ((await created.json()) as { url: string }).url;

  // Two people pressing Call at the same moment: the other request created it first.
  const again = await find();
  if (again) return again;

  throw new Error(`Daily could not create the room (status ${created.status})`);
}

/** A personal pass for one person, valid for this room only and for two hours. */
async function createToken(roomName: string, userName: string, userId: string): Promise<string> {
  const res = await fetch(`${API}/meeting-tokens`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: userName.slice(0, 60),
        user_id: userId.slice(0, 36),
        is_owner: false,
        exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
        eject_at_token_exp: true,
      },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Daily could not create a pass (status ${res.status})`);
  return ((await res.json()) as { token: string }).token;
}

export type Call = { mode: "embed"; src: string } | { mode: "link"; href: string };

/** An unguessable Jitsi room name: a keyed hash, so knowing a circle's id is not enough to find its room. */
function jitsiRoom(roomName: string) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return `StudyCircle${createHmac("sha256", secret).update(`call:${roomName}`).digest("hex").slice(0, 32)}`;
}

/** What to show for a call, or null when it cannot be set up right now. */
export async function getCall(roomName: string, userName: string, userId: string): Promise<Call | null> {
  try {
    if (dailyConfigured()) {
      const url = await ensureRoom(roomName);
      const token = await createToken(roomName, userName, userId);
      return { mode: "embed", src: `${url}?t=${encodeURIComponent(token)}` };
    }
    const name = encodeURIComponent(JSON.stringify(userName.slice(0, 60)));
    return { mode: "link", href: `https://meet.jit.si/${jitsiRoom(roomName)}#userInfo.displayName=${name}` };
  } catch (error) {
    console.error("Call setup failed", error);
    return null;
  }
}
