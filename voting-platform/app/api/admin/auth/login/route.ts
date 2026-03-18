import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin, setAdminSessionCookie } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const admin = await authenticateAdmin(body.email, body.password);
    await setAdminSessionCookie({ id: admin.id, email: admin.email, role: admin.role, orgId: admin.orgId ?? null });
    return NextResponse.json({ ok: true, admin: { id: admin.id, email: admin.email, fullName: admin.fullName, role: admin.role, orgId: admin.orgId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INVALID_CREDENTIALS";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
