import { NextRequest, NextResponse } from "next/server";
import { AdminRole, VotingSessionStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { orgWhere } from "@/lib/permissions";
import { db } from "@/lib/prisma";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin([AdminRole.SUPER_ADMIN, AdminRole.ORG_ADMIN, AdminRole.OPERATOR, AdminRole.VIEWER]);
  const where = orgWhere(admin);
  const session = await db.votingSession.findFirst({ where: { ...where, publicId: id }, include: { voter: true, resolutions: { include: { ballot: true }, orderBy: { sortOrder: "asc" } }, auditLogs: { orderBy: { createdAt: "desc" }, take: 10 } } });
  if (!session) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({
    id: session.publicId,
    title: session.title,
    organization: session.organization,
    status: session.status,
    deadline: session.deadline.toISOString(),
    voters: [{ name: session.voter.fullName, email: session.voter.email, shares: session.voter.shares ?? "—", status: session.status === VotingSessionStatus.SUBMITTED ? "SUBMITTED" : session.draftSavedAt ? "DRAFT" : "PENDING", lastActivity: session.submittedAt?.toISOString() ?? session.draftSavedAt?.toISOString() ?? null }],
    activity: session.auditLogs.map((item) => ({ type: item.action === "VOTES_SUBMITTED" ? "submit" : "audit", title: item.action === "VOTES_SUBMITTED" ? "Oddano komplet głosów" : item.action === "DRAFT_SAVED" ? "Zapisano wersję roboczą" : "Zdarzenie audytowe", meta: new Date(item.createdAt).toLocaleString("pl-PL") }))
  });
}
