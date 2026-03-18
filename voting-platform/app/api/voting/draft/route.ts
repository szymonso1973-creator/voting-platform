import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { hashVotingToken } from "@/lib/voting-auth";
import { VoteValue } from "@prisma/client";

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
    if (session.status === "SUBMITTED") return NextResponse.json({ error: "SESSION_ALREADY_SUBMITTED" }, { status: 409 });
    const allowedIds = new Set(session.resolutions.map((item) => item.id));
    await db.$transaction(async (tx) => {
      for (const item of resolutions) {
        if (!allowedIds.has(String(item?.resolutionId))) continue;
        const mappedVote = mapVote(String(item?.vote ?? ""));
        if (!mappedVote) continue;
        await tx.ballot.upsert({ where: { resolutionId: String(item.resolutionId) }, update: { vote: mappedVote, isDraft: true, submittedAt: null }, create: { resolutionId: String(item.resolutionId), vote: mappedVote, isDraft: true } });
      }
      await tx.votingSession.update({ where: { id: session.id }, data: { draftSavedAt: new Date() } });
    });
    await db.auditLog.create({ data: { votingSessionId: session.id, action: "DRAFT_SAVED", ipAddress: request.headers.get("x-forwarded-for"), userAgent: request.headers.get("user-agent") } });
    return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "REQUEST_FAILED" }, { status: 500 });
  }
}
