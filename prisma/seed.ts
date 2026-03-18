import "dotenv/config";
import { PrismaClient, AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_NAME ?? "Administrator";

  if (!email || !password) {
    console.log("Skipping admin seed: missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD");
    return;
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

  console.log(`Admin seeded: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
