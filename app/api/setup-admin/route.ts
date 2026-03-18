import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, AdminRole } from "@prisma/client";
import { hashPassword } from "@/lib/admin-auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");

  if (secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const passwordHash = hashPassword("Admin123!");

    const admin = await prisma.adminUser.upsert({
      where: { email: "admin@redpol.icu" },
      update: {
        passwordHash,
        role: AdminRole.SUPER_ADMIN,
        isActive: true,
      },
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
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
      login: {
        email: "admin@redpol.icu",
        password: "Admin123!",
      },
    });
  } catch (e) {
    console.error("SETUP_ADMIN_ERROR", e);

    return NextResponse.json(
      {
        error: "Błąd tworzenia admina",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
