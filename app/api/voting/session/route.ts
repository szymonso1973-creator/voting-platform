import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { hashVotingToken } from "@/lib/voting-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body?.token;
    if (!token || typeof token !== "string") return NextResponse.json({ error: "INVALID_LINK_TOKEN" }, { status: 401 });
    const session = await db.votingSession.findUnique({ where: { tokenHash: hashVotingToken(token) }, include: { voter: true, resolutions: { orderBy: { sortOrder: "asc" }, include: { ballot: true } } } });
    if (!session) return NextResponse.json({ error: "INVALID_LINK_TOKEN" }, { status: 401 });
    if (session.status === "REVOKED") return NextResponse.json({ error: "SESSION_REVOKED" }, { status: 403 });
    if (session.status === "EXPIRED" || session.deadline < new Date()) return NextResponse.json({ error: "SESSION_EXPIRED" }, { status: 410 });
    if (session.status === "SUBMITTED") return NextResponse.json({ error: "SESSION_ALREADY_SUBMITTED" }, { status: 409 });
    await db.auditLog.create({ data: { votingSessionId: session.id, action: "SESSION_VIEW", ipAddress: request.headers.get("x-forwarded-for"), userAgent: request.headers.get("user-agent") } });
    return NextResponse.json({
      id: session.publicId,
      title: session.title,
      organization: session.organization,
      deadline: session.deadline.toISOString(),
      status: session.status,
      allowDraft: session.allowDraft,
      allowPdfPreview: session.allowPdfPreview,
      allowProtocolExport: true,
      voter: { fullName: session.voter.fullName, email: session.voter.email, shares: session.voter.shares, identifier: session.voter.identifier },
      resolutions: session.resolutions.map((resolution) => ({ id: resolution.id, number: resolution.number, subject: resolution.subject, description: resolution.description, deadline: session.deadline.toISOString(), pdfUrl: resolution.pdfUrl, vote: resolution.ballot?.vote === "FOR" ? "for" : resolution.ballot?.vote === "AGAINST" ? "against" : resolution.ballot?.vote === "ABSTAIN" ? "abstain" : "" }))
    });
  } catch {
    return NextResponse.json({ error: "REQUEST_FAILED" }, { status: 500 });
  }
}
