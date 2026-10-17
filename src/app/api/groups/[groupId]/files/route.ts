import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  FILE_TYPES,
  MAX_FILE_BYTES,
  extensionOf,
  parseTags,
  safeFileName,
} from "@/lib/files";

export const runtime = "nodejs";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const { groupId } = await params;

  // 1. Logged in AND a member of this circle.
  const session = await auth();
  if (!session?.user?.id) return fail("Please log in again.", 401);
  const membership = await db.membership.findUnique({
    where: { userId_groupId: { userId: session.user.id, groupId } },
    include: { group: { select: { slug: true } } },
  });
  if (!membership) return fail("You are not a member of this circle.", 403);

  // 2. Cheap size check before reading the whole body.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_FILE_BYTES + 100_000) return fail("That file is too large. The limit is 4 MB.", 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("The upload could not be read. Try a smaller file.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file to upload.", 400);
  if (file.size > MAX_FILE_BYTES) return fail("That file is too large. The limit is 4 MB.", 413);

  const ext = extensionOf(file.name);
  const contentType = FILE_TYPES[ext];
  if (!contentType) {
    return fail("That file type is not allowed. Use PDF, images, text, Word, PowerPoint or Excel.", 400);
  }

  const rawTitle = String(form.get("title") ?? "").trim();
  const title = (rawTitle || file.name.replace(/\.[^.]+$/, "")).slice(0, 100);
  if (title.length < 2) return fail("Give the file a title (at least 2 characters).", 400);
  const tags = parseTags(String(form.get("tags") ?? ""));

  // 3. Store it. The random suffix means two files with the same name never collide.
  let pathname: string;
  try {
    const blob = await put(`circles/${groupId}/${safeFileName(file.name)}`, file, {
      access: "private",
      addRandomSuffix: true,
      contentType,
    });
    pathname = blob.pathname;
  } catch (error) {
    console.error("Blob upload failed", error);
    return fail("The file could not be stored. Check that BLOB_READ_WRITE_TOKEN is set.", 500);
  }

  await db.resource.create({
    data: {
      groupId,
      uploaderId: session.user.id,
      title,
      kind: "FILE",
      url: pathname, // for files, `url` holds the storage path, not a web link
      sizeBytes: file.size,
      tags,
    },
  });

  revalidatePath(`/groups/${membership.group.slug}`);
  return NextResponse.json({ ok: true });
}
