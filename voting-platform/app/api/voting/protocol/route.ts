import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { hashVotingToken } from "@/lib/voting-auth";
import { createProtocolPdf } from "@/lib/pdf";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const session = await db.votingSession.findUnique({ where: { tokenHash: hashVotingToken(token) }, include: { voter: true, resolutions: { orderBy: { sortOrder: "asc" }, include: { ballot: true } } } });
  if (!session || session.status !== "SUBMITTED") return new Response("Not found", { status: 404 });
  const rows = session.resolutions.map((resolution, index) => `${index + 1}. ${resolution.number}: ${resolution.ballot?.vote ?? "BRAK"}`);
  const pdf = await createProtocolPdf({ title: "Formalny protokół głosowania", organization: session.organization, voter: session.voter.fullName, status: session.status, rows });
  return new Response(pdf, { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="protokol-${session.publicId}.pdf"` } });
}
