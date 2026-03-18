import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, AdminRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const fullName = process.env.BOOTSTRAP_ADMIN_NAME ?? "Administrator";

  if (!email || !password) {
    throw new Error("Missing BOOTSTRAP_ADMIN_EMAIL or BOOTSTRAP_ADMIN_PASSWORD");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email: email.toLowerCase().trim() },
    update: {
      fullName,
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      email: email.toLowerCase().trim(),
      fullName,
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log(`Admin ready: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
