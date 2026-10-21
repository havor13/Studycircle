import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pusher } from "@/lib/pusher-server";

export const runtime = "nodejs";

/**
 * Pusher calls this before letting a browser listen to a private channel.
 * We only say yes when the person is logged in AND a member of that circle.
 */
export async function POST(request: Request) {
  if (!pusher) return new NextResponse("Real-time is not configured", { status: 503 });

  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Please log in", { status: 401 });

  const form = await request.formData();
  const socketId = String(form.get("socket_id") ?? "");
  const channel = String(form.get("channel_name") ?? "");

  // Your own private-message channel: only you may listen to it.
  const mine = /^private-user-([A-Za-z0-9_-]+)$/.exec(channel);
  if (socketId && mine) {
    if (mine[1] !== session.user.id) return new NextResponse("Forbidden", { status: 403 });
    return NextResponse.json(pusher.authorizeChannel(socketId, channel));
  }

  const match = /^private-circle-([A-Za-z0-9_-]+)$/.exec(channel);
  if (!socketId || !match) return new NextResponse("Bad request", { status: 400 });

  const membership = await db.membership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId: match[1] } },
    select: { id: true },
  });
  if (!membership) return new NextResponse("Forbidden", { status: 403 });

  return NextResponse.json(pusher.authorizeChannel(socketId, channel));
}
