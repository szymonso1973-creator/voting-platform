import { NextResponse } from "next/server";
import { AdminRole, VotingSessionStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { orgWhere } from "@/lib/permissions";
import { db } from "@/lib/prisma";

export async function GET() {
  const admin = await requireAdmin([AdminRole.SUPER_ADMIN, AdminRole.ORG_ADMIN, AdminRole.OPERATOR, AdminRole.VIEWER]);
  const where = orgWhere(admin);
  const votings = await db.votingSession.findMany({ where, orderBy: { createdAt: "desc" }, include: { resolutions: { include: { ballot: true } } }, take: 50 });
  const activeVotings = await db.votingSession.count({ where: { ...where, status: VotingSessionStatus.ACTIVE } });
  const auditEvents = await db.auditLog.count({ where: { votingSession: where } as any });
  const submittedVotes = votings.reduce((acc, session) => acc + session.resolutions.filter((r) => r.ballot && !r.ballot.isDraft).length, 0);
  return NextResponse.json({
    summary: { activeVotings, submittedVotes, pendingVoters: votings.filter((v) => v.status === VotingSessionStatus.ACTIVE).length, turnoutPercent: 0, auditEvents },
    votings: votings.map((item) => ({ id: item.publicId, title: item.title, organization: item.organization, status: item.status, deadline: item.deadline.toISOString(), votersCount: 1, votedCount: item.resolutions.filter((r) => r.ballot && !r.ballot.isDraft).length, remindersSent: 0 })),
    activity: []
  });
}
