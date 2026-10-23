import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { announceDirectCall } from "@/app/actions/calls";
import { AnnounceCallButton, CallFrame, CallLink } from "@/components/call-frame";
import { getCall, directRoomName } from "@/lib/calls";
import { db } from "@/lib/db";
import { blockState, sharesCircle } from "@/lib/direct";

export const metadata: Metadata = { title: "Call" };

export default async function DirectCallPage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const me = session.user.id;

  const { userId: otherId } = await params;
  if (otherId === me) redirect("/messages");
  const other = await db.user.findUnique({ where: { id: otherId }, select: { id: true, name: true } });
  if (!other) notFound();

  // Same rules as private messages: you must share a circle, and neither of you has blocked the other.
  const [shares, blocks] = await Promise.all([sharesCircle(me, otherId), blockState(me, otherId)]);
  if (!shares) notFound();
  const allowed = !blocks.iBlocked && !blocks.blockedMe;

  const call = allowed ? await getCall(directRoomName(me, otherId), session.user.name ?? "Member", me) : null;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/messages/${other.id}`} className="text-sm font-semibold text-brand hover:underline">
        ← Back to the chat with {other.name}
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">Call with {other.name}</h1>
      <p className="mb-4 mt-1 text-sm text-muted">
        Private: only you and {other.name} can join. Your browser will ask to use your camera and microphone.
      </p>

      {call ? (
        <>
          <div className="mb-4">
            <AnnounceCallButton action={announceDirectCall.bind(null, other.id)} label={`Tell ${other.name} I started a call`} />
          </div>
          {call.mode === "embed" ? (
            <CallFrame src={call.src} title={`Call with ${other.name}`} />
          ) : (
            <CallLink href={call.href} label="Join the call" />
          )}
        </>
      ) : (
        <p role="alert" className="rounded-2xl border border-line bg-surface p-6">
          {!allowed
            ? "You cannot call this person right now."
            : "The call could not be started right now. Try again in a minute."}
        </p>
      )}
    </div>
  );
}
