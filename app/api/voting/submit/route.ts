import { NextRequest, NextResponse } from "next/server";
import { DocumentType, VoteValue, VotingSessionStatus } from "@prisma/client";
import { db } from "@/lib/prisma";
import { hashVotingToken } from "@/lib/voting-auth";

function mapVote(vote: string) {
  if (vote === "for") return VoteValue.FOR;
  if (vote === "against") return VoteValue.AGAINST;
  if (vote === "abstain") return VoteValue.ABSTAIN;
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body?.token;
    const resolutions = Array.isArray(body?.resolutions) ? body.resolutions : [];
    if (!token || typeof token !== "string") return NextResponse.json({ error: "INVALID_LINK_TOKEN" }, { status: 401 });
    const session = await db.votingSession.findUnique({ where: { tokenHash: hashVotingToken(token) }, include: { resolutions: true } });
    if (!session) return NextResponse.json({ error: "INVALID_LINK_TOKEN" }, { status: 401 });
    if (session.status === VotingSessionStatus.SUBMITTED) return NextResponse.json({ error: "SESSION_ALREADY_SUBMITTED" }, { status: 409 });
    const allowedIds = new Set(session.resolutions.map((item) => item.id));
    const validVotes = resolutions.filter((item: any) => allowedIds.has(String(item?.resolutionId)) && Boolean(mapVote(String(item?.vote ?? ""))));
    if (validVotes.length !== session.resolutions.length) return NextResponse.json({ error: "MISSING_VOTES" }, { status: 400 });
    const submittedAt = new Date();
    await db.$transaction(async (tx) => {
      for (const item of validVotes) {
        const mappedVote = mapVote(String(item.vote));
        if (!mappedVote) continue;
        await tx.ballot.upsert({ where: { resolutionId: String(item.resolutionId) }, update: { vote: mappedVote, isDraft: false, submittedAt }, create: { resolutionId: String(item.resolutionId), vote: mappedVote, isDraft: false, submittedAt } });
      }
      await tx.votingSession.update({ where: { id: session.id }, data: { status: VotingSessionStatus.SUBMITTED, submittedAt } });
      await tx.document.createMany({ data: [
        { votingSessionId: session.id, type: DocumentType.RECEIPT, fileUrl: `/api/voting/receipt?token=${encodeURIComponent(token)}` },
        { votingSessionId: session.id, type: DocumentType.PROTOCOL, fileUrl: `/api/voting/protocol?token=${encodeURIComponent(token)}` }
      ] });
    });
    await db.auditLog.create({ data: { votingSessionId: session.id, action: "VOTES_SUBMITTED", ipAddress: request.headers.get("x-forwarded-for"), userAgent: request.headers.get("user-agent") } });
    return NextResponse.json({ ok: true, submitted: true, submittedAt: submittedAt.toISOString(), receiptUrl: `/api/voting/receipt?token=${encodeURIComponent(token)}`, protocolUrl: `/api/voting/protocol?token=${encodeURIComponent(token)}` });
  } catch {
    return NextResponse.json({ error: "REQUEST_FAILED" }, { status: 500 });
  }
}
