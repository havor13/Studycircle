import { type NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { FILE_TYPES, INLINE_EXTENSIONS, extensionOf } from "@/lib/files";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Please log in.", { status: 401 });
  const me = session.user.id;

  const message = await db.directMessage.findUnique({
    where: { id },
    select: { senderId: true, recipientId: true, attachmentPath: true, attachmentName: true },
  });
  // Only the two people in the conversation may open it.
  if (!message?.attachmentPath || (message.senderId !== me && message.recipientId !== me)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const result = await get(message.attachmentPath, {
    access: "private",
    ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
  });
  if (!result) return new NextResponse("Not found", { status: 404 });

  if (result.statusCode === 304) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: result.blob.etag, "Cache-Control": "private, no-cache" },
    });
  }

  const ext = extensionOf(message.attachmentPath);
  const inline = INLINE_EXTENSIONS.has(ext);
  const baseName = (message.attachmentName ?? "file").replace(/[^A-Za-z0-9._ -]+/g, "").trim() || "file";
  const fileName = baseName.toLowerCase().endsWith(`.${ext}`) ? baseName : `${baseName}.${ext}`;

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": FILE_TYPES[ext] ?? "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
      ETag: result.blob.etag,
      "Cache-Control": "private, no-cache",
    },
  });
}
