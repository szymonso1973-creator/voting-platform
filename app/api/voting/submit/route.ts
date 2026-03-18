import { NextRequest, NextResponse } from "next/server";
import { DocumentType, VoteValue, VotingSessionStatus } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { hashVotingToken } from "@/lib/voting-auth";

function mapVote(vote: string) {
  if (vote === "for") return VoteValue.FOR;
  if (vote === "against") return VoteValue.AGAINST;
  if (vote === "abstain") return VoteValue.ABSTAIN;
  return null;
}

const submitSchema = z.object({
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
    const parsed = submitSchema.parse(body);
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
    const validVotes = resolutions.filter((item) => allowedIds.has(item.resolutionId));

    if (validVotes.length !== session.resolutions.length) {
      return NextResponse.json({ error: "MISSING_OR_INVALID_RESOLUTIONS" }, { status: 400 });
    }

    const submittedAt = new Date();
    await db.$transaction(async (tx) => {
      for (const item of validVotes) {
        const mappedVote = mapVote(item.vote);
        if (!mappedVote) continue;

        await tx.ballot.upsert({
          where: { resolutionId: item.resolutionId },
          update: { vote: mappedVote, isDraft: false, submittedAt },
          create: { resolutionId: item.resolutionId, vote: mappedVote, isDraft: false, submittedAt },
        });
      }

      await tx.votingSession.update({
        where: { id: session.id },
        data: { status: VotingSessionStatus.SUBMITTED, submittedAt },
      });

      await tx.document.createMany({
        data: [
          { votingSessionId: session.id, type: DocumentType.RECEIPT, fileUrl: "/api/voting/receipt" },
          { votingSessionId: session.id, type: DocumentType.PROTOCOL, fileUrl: "/api/voting/protocol" },
        ],
      });
    });

    await db.auditLog.create({
      data: {
        votingSessionId: session.id,
        action: "VOTES_SUBMITTED",
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      },
    });

    return NextResponse.json({
      ok: true,
      submitted: true,
      submittedAt: submittedAt.toISOString(),
      receiptUrl: `/api/voting/receipt?token=${encodeURIComponent(token)}`,
      protocolUrl: `/api/voting/protocol?token=${encodeURIComponent(token)}`,
    });
  } catch {
    return NextResponse.json({ error: "REQUEST_FAILED" }, { status: 500 });
  }
}
