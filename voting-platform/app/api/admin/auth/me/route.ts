import { NextResponse } from "next/server";
import { getAdminSessionFromCookie } from "@/lib/admin-auth";
export async function GET() {
  const admin = await getAdminSessionFromCookie();
  if (!admin) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, admin: { id: admin.id, email: admin.email, fullName: admin.fullName, role: admin.role, orgId: admin.orgId, organization: admin.organization ? { id: admin.organization.id, name: admin.organization.name, slug: admin.organization.slug } : null } });
}
