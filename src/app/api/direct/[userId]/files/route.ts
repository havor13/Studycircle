import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { blockState, sharesCircle } from "@/lib/direct";
import { FILE_TYPES, MAX_FILE_BYTES, extensionOf, safeFileName } from "@/lib/files";
import { pingUser } from "@/lib/pusher-server";

export const runtime = "nodejs";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/** Sends a private message that carries an image or document (and optional text). */
export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId: otherId } = await params;

  const session = await auth();
  if (!session?.user?.id) return fail("Please log in again.", 401);
  const me = session.user.id;

  if (!(await sharesCircle(me, otherId))) return fail("You can only message people you share a circle with.", 403);
  const blocks = await blockState(me, otherId);
  if (blocks.iBlocked) return fail("You blocked this person. Unblock them to send messages.", 403);
  if (blocks.blockedMe) return fail("You can't send messages to this person right now.", 403);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_FILE_BYTES + 100_000) return fail("That file is too large. The limit is 4 MB.", 413);

  const recent = await db.directMessage.count({
    where: { senderId: me, attachmentPath: { not: null }, createdAt: { gt: new Date(Date.now() - 3600_000) } },
  });
  if (recent >= 20) return fail("You have sent a lot of files. Try again in a while.", 429);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("The upload could not be read. Try a smaller file.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file to send.", 400);
  if (file.size > MAX_FILE_BYTES) return fail("That file is too large. The limit is 4 MB.", 413);

  const ext = extensionOf(file.name);
  const contentType = FILE_TYPES[ext];
  if (!contentType) return fail("That file type is not allowed. Use PDF, images, text, Word, PowerPoint or Excel.", 400);

  const body = String(form.get("body") ?? "").trim();
  if (body.length > 1000) return fail("Keep the message under 1000 characters.", 400);

  let pathname: string;
  try {
    const blob = await put(`direct/${[me, otherId].sort().join("-")}/${safeFileName(file.name)}`, file, {
      access: "private",
      addRandomSuffix: true,
      contentType,
    });
    pathname = blob.pathname;
  } catch (error) {
    console.error("Private file upload failed", error);
    return fail("The file could not be stored. Check that BLOB_READ_WRITE_TOKEN is set.", 500);
  }

  await db.directMessage.create({
    data: {
      senderId: me,
      recipientId: otherId,
      body,
      attachmentPath: pathname,
      attachmentName: file.name.slice(-100),
      attachmentSize: file.size,
    },
  });
  await Promise.all([pingUser(otherId), pingUser(me)]);
  return NextResponse.json({ ok: true });
}
