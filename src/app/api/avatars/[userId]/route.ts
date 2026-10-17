import { type NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/** Serves a profile picture to logged-in users only (the store itself is private). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Please log in.", { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId }, select: { image: true } });
  if (!user?.image) return new NextResponse("Not found", { status: 404 });

  const result = await get(user.image, {
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

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
      ETag: result.blob.etag,
      "Cache-Control": "private, no-cache",
    },
  });
}
