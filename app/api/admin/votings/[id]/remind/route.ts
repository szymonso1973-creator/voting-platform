import { NextRequest, NextResponse } from "next/server";
import { AdminRole, AuditAction, DeliveryStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { canWrite, orgWhere } from "@/lib/permissions";
import { db } from "@/lib/prisma";
import { sendVotingReminder } from "@/lib/mail";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin([AdminRole.SUPER_ADMIN, AdminRole.ORG_ADMIN, AdminRole.OPERATOR]);
  if (!canWrite(admin.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const where = orgWhere(admin);
  const session = await db.votingSession.findFirst({ where: { ...where, publicId: id }, include: { voter: true } });
  if (!session) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const link = `${process.env.NEXT_PUBLIC_APP_URL}/vote/${session.publicId}`;
  try {
    await sendVotingReminder({ to: session.voter.email, voterName: session.voter.fullName, votingTitle: session.title, deadline: session.deadline.toLocaleString("pl-PL"), link });
    await db.votingDelivery.create({ data: { votingSessionId: session.id, voterId: session.voterId, email: session.voter.email, deliveryStatus: DeliveryStatus.SENT, sentAt: new Date() } });
    await db.auditLog.create({ data: { votingSessionId: session.id, action: AuditAction.ADMIN_REMIND, metadata: { adminId: admin.id, adminEmail: admin.email } } });
    return NextResponse.json({ ok: true, reminded: true });
  } catch (error) {
    await db.votingDelivery.create({ data: { votingSessionId: session.id, voterId: session.voterId, email: session.voter.email, deliveryStatus: DeliveryStatus.FAILED, errorMessage: error instanceof Error ? error.message : "MAIL_FAILED" } });
    return NextResponse.json({ error: "MAIL_FAILED" }, { status: 500 });
  }
}
