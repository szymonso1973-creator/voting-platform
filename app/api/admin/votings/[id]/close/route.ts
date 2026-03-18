import { NextRequest, NextResponse } from "next/server";
import { AdminRole, AuditAction, VotingSessionStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { canWrite, orgWhere } from "@/lib/permissions";
import { db } from "@/lib/prisma";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin([AdminRole.SUPER_ADMIN, AdminRole.ORG_ADMIN, AdminRole.OPERATOR]);
  if (!canWrite(admin.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const where = orgWhere(admin);
  const session = await db.votingSession.findFirst({ where: { ...where, publicId: id } });
  if (!session) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const updated = await db.votingSession.update({ where: { id: session.id }, data: { status: VotingSessionStatus.EXPIRED } });
  await db.auditLog.create({ data: { votingSessionId: session.id, action: AuditAction.ADMIN_CLOSE_VOTING, metadata: { adminId: admin.id, adminEmail: admin.email, newStatus: updated.status } } });
  return NextResponse.json({ ok: true, closed: true, status: updated.status });
}
