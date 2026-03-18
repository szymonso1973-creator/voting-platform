import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateAdmin, setAdminSessionCookie } from "@/lib/admin-auth";
import { rateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(200),
});

export async function POST(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "unknown";
  const ip = forwardedFor.split(",")[0].trim();
  const limiter = rateLimit(`admin-login:${ip}`, 5, 10 * 60 * 1000);

  if (!limiter.allowed) {
    return NextResponse.json({ error: "TOO_MANY_REQUESTS" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = loginSchema.parse(body);

    const admin = await authenticateAdmin(parsed.email, parsed.password);
    await setAdminSessionCookie({
      id: admin.id,
      email: admin.email,
      role: admin.role,
      orgId: admin.orgId ?? null,
    });

    return NextResponse.json({
      ok: true,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        orgId: admin.orgId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INVALID_CREDENTIALS";
    const status = message === "INVALID_CREDENTIALS" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
