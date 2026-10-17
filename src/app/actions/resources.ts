"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { z } from "zod";
import { db } from "@/lib/db";
import { canModerate, requireMember } from "@/lib/permissions";
import type { FormState } from "@/lib/validations";

const resourceSchema = z.object({
  title: z.string().trim().min(2, "Give it a title (at least 2 characters).").max(100),
  // Only http(s) links, so a "javascript:" link can never be saved.
  url: z
    .string()
    .trim()
    .url("Enter a full link, like https://example.com.")
    .refine((value) => /^https?:\/\//i.test(value), "Links must start with http:// or https://."),
  tags: z.string().trim().max(200).optional(),
});

function parseTags(raw: string | undefined) {
  if (!raw) return [];
  const tags = raw
    .split(",")
    .map((tag) => tag.trim().toLowerCase().slice(0, 20))
    .filter(Boolean);
  return [...new Set(tags)].slice(0, 5);
}

export async function addResource(
  groupId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { userId, slug } = await requireMember(groupId);

  const parsed = resourceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { title, url, tags } = parsed.data;

  await db.resource.create({
    data: {
      groupId,
      uploaderId: userId,
      title,
      kind: "LINK",
      url,
      tags: parseTags(tags),
    },
  });

  revalidatePath(`/groups/${slug}`);
  return {};
}

export async function deleteResource(resourceId: string) {
  const resource = await db.resource.findUnique({ where: { id: resourceId } });
  if (!resource) return;

  const { userId, membership, slug } = await requireMember(resource.groupId);
  const allowed = resource.uploaderId === userId || canModerate(membership.role);
  if (!allowed) return;

  await db.resource.delete({ where: { id: resource.id } });

  // Uploaded files also live in Blob storage. Remove that copy too.
  // If this fails the circle is still fine: the row is gone and nobody can reach the file.
  if (resource.kind === "FILE") {
    try {
      await del(resource.url);
    } catch (error) {
      console.error("Could not delete stored file", error);
    }
  }

  revalidatePath(`/groups/${slug}`);
}
