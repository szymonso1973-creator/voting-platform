import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");

  if (secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const passwordHash = await bcrypt.hash("Admin123!", 10);

    await prisma.adminUser.upsert({
      where: { email: "admin@redpol.icu" },
      update: {},
      create: {
        email: "admin@redpol.icu",
        fullName: "Administrator",
        passwordHash,
        role: AdminRole.SUPER_ADMIN,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Admin utworzony",
      login: {
        email: "admin@redpol.icu",
        password: "Admin123!",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Błąd tworzenia admina" },
      { status: 500 }
    );
  }
}
