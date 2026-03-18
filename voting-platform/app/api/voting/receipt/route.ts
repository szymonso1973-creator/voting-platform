import { NextRequest } from "next/server";
import { db } from "@/lib/prisma";
import { hashVotingToken } from "@/lib/voting-auth";
import { createProtocolPdf } from "@/lib/pdf";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const session = await db.votingSession.findUnique({ where: { tokenHash: hashVotingToken(token) }, include: { voter: true } });
  if (!session || session.status !== "SUBMITTED") return new Response("Not found", { status: 404 });
  const pdf = await createProtocolPdf({ title: "Potwierdzenie oddania głosu", organization: session.organization, voter: session.voter.fullName, status: session.status, rows: [`Identyfikator głosowania: ${session.publicId}`, `Data oddania głosu: ${session.submittedAt?.toISOString() ?? "-"}`] });
  return new Response(pdf, { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="potwierdzenie-${session.publicId}.pdf"` } });
}
