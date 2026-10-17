import { NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AVATAR_TYPES, MAX_AVATAR_BYTES, matchesImageSignature } from "@/lib/avatar";
import { extensionOf } from "@/lib/files";

export const runtime = "nodejs";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/** Upload or replace my picture. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("Please log in again.", 401);
  const userId = session.user.id;

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_AVATAR_BYTES + 100_000) return fail("That picture is too large. The limit is 2 MB.", 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("The upload could not be read. Try a smaller picture.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a picture to upload.", 400);
  if (file.size > MAX_AVATAR_BYTES) return fail("That picture is too large. The limit is 2 MB.", 413);

  const ext = extensionOf(file.name);
  const contentType = AVATAR_TYPES[ext];
  if (!contentType) return fail("Use a PNG, JPG or WebP picture.", 400);

  // The file must really start like the image type its name claims.
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!matchesImageSignature(ext, head)) return fail("That file is not a valid picture.", 400);

  const existing = await db.user.findUnique({ where: { id: userId }, select: { image: true } });
  if (!existing) return fail("Account not found.", 404);

  let pathname: string;
  try {
    const blob = await put(`avatars/${userId}/avatar.${ext}`, file, {
      access: "private",
      addRandomSuffix: true,
      contentType,
    });
    pathname = blob.pathname;
  } catch (error) {
    console.error("Avatar upload failed", error);
    return fail("The picture could not be stored. Check that BLOB_READ_WRITE_TOKEN is set.", 500);
  }

  await db.user.update({ where: { id: userId }, data: { image: pathname } });

  // Remove the old picture so storage does not fill up with replaced ones.
  if (existing.image) {
    try {
      await del(existing.image);
    } catch (error) {
      console.error("Old avatar cleanup failed", error);
    }
  }

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}

/** Remove my picture (go back to initials). */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return fail("Please log in again.", 401);
  const userId = session.user.id;

  const existing = await db.user.findUnique({ where: { id: userId }, select: { image: true } });
  if (!existing) return fail("Account not found.", 404);

  await db.user.update({ where: { id: userId }, data: { image: null } });
  if (existing.image) {
    try {
      await del(existing.image);
    } catch (error) {
      console.error("Avatar cleanup failed", error);
    }
  }

  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
