import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { announceCircleCall } from "@/app/actions/calls";
import { AnnounceCallButton, CallFrame, CallLink } from "@/components/call-frame";
import { getCall, circleRoomName } from "@/lib/calls";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Call" };

export default async function CircleCallPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const { slug } = await params;
  const group = await db.group.findUnique({ where: { slug } });
  if (!group) notFound();
  const membership = await db.membership.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
  });
  if (!membership) notFound(); // members only

  const call = await getCall(circleRoomName(group.id), session.user.name ?? "Member", userId);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href={`/groups/${group.slug}/chat`} className="text-sm font-semibold text-brand hover:underline">
        ← Back to {group.name} chat
      </Link>
      <h1 className="mt-2 font-display text-3xl font-bold">{group.name} call</h1>
      <p className="mb-4 mt-1 text-sm text-muted">
        Voice and video for this circle only. Everyone in the circle can join; nobody else can. Your browser will ask
        to use your camera and microphone.
      </p>

      {call ? (
        <>
          <div className="mb-4">
            <AnnounceCallButton action={announceCircleCall.bind(null, group.id)} label="Tell the circle I started a call" />
          </div>
          {call.mode === "embed" ? (
            <CallFrame src={call.src} title={`${group.name} call`} />
          ) : (
            <CallLink href={call.href} label="Join the call" />
          )}
        </>
      ) : (
        <p role="alert" className="rounded-2xl border border-line bg-surface p-6">
          The call could not be started right now. Try again in a minute.
        </p>
      )}
    </div>
  );
}
