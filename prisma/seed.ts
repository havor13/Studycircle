// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "admin@studycircle.test" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@studycircle.test",
      passwordHash: await bcrypt.hash("ChangeMe123!", 12),
    },
  });
  const group = await prisma.group.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Demo Group", slug: "demo" },
  });
  await prisma.membership.upsert({
    where: { userId_groupId: { userId: user.id, groupId: group.id } },
    update: { role: "OWNER" },
    create: { userId: user.id, groupId: group.id, role: "OWNER" },
  });
}

main().finally(() => prisma.$disconnect());