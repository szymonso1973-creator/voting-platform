import { NextRequest, NextResponse } from "next/server";
import { VoteValue, VotingSessionStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { hashVotingToken } from "@/lib/voting-auth";

function mapVote(vote: string) {
  if (vote === "for") return VoteValue.FOR;
  if (vote === "against") return VoteValue.AGAINST;
  if (vote === "abstain") return VoteValue.ABSTAIN;
  return null;
}

const draftSchema = z.object({
  token: z.string().min(20).max(500),
  resolutions: z.array(
    z.object({
      resolutionId: z.string().min(1),
      vote: z.enum(["for", "against", "abstain"]),
    })
  ).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = draftSchema.parse(body);
    const token = parsed.token;
    const resolutions = parsed.resolutions;

    const session = await db.votingSession.findUnique({
      where: { tokenHash: hashVotingToken(token) },
      include: { resolutions: true },
    });

    if (!session) return NextResponse.json({ error: "INVALID_LINK_TOKEN" }, { status: 401 });
    if (session.status === VotingSessionStatus.REVOKED) return NextResponse.json({ error: "SESSION_REVOKED" }, { status: 403 });
    if (session.status === VotingSessionStatus.EXPIRED || session.deadline < new Date()) return NextResponse.json({ error: "SESSION_EXPIRED" }, { status: 410 });
    if (session.status === VotingSessionStatus.SUBMITTED) return NextResponse.json({ error: "SESSION_ALREADY_SUBMITTED" }, { status: 409 });

    const allowedIds = new Set(session.resolutions.map((item) => item.id));

    await db.$transaction(async (tx) => {
      for (const item of resolutions) {
        if (!allowedIds.has(item.resolutionId)) continue;
        const mappedVote = mapVote(item.vote);
        if (!mappedVote) continue;

        await tx.ballot.upsert({
          where: { resolutionId: item.resolutionId },
          update: { vote: mappedVote, isDraft: true, submittedAt: null },
          create: { resolutionId: item.resolutionId, vote: mappedVote, isDraft: true },
        });
      }

      await tx.votingSession.update({
        where: { id: session.id },
        data: { draftSavedAt: new Date() },
      });
    });

    await db.auditLog.create({
      data: {
        votingSessionId: session.id,
        action: "DRAFT_SAVED",
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      },
    });

    return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "REQUEST_FAILED" }, { status: 500 });
  }
}
