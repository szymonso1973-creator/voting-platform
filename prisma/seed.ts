import { PrismaClient, AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Admin123!", 10);

  await prisma.adminUser.upsert({
    where: { email: "admin@redpol.pl" },
    update: {},
    create: {
      email: "admin@redpol.pl",
      fullName: "Administrator",
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log("Admin utworzony");
}

main();