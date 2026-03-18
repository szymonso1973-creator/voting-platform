import { NextRequest } from "next/server";
import { AdminRole } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { orgWhere } from "@/lib/permissions";
import { db } from "@/lib/prisma";
import { createProtocolPdf } from "@/lib/pdf";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdmin([AdminRole.SUPER_ADMIN, AdminRole.ORG_ADMIN, AdminRole.OPERATOR, AdminRole.VIEWER]);
  const where = orgWhere(admin);
  const session = await db.votingSession.findFirst({ where: { ...where, publicId: id }, include: { voter: true, resolutions: { orderBy: { sortOrder: "asc" }, include: { ballot: true } } } });
  if (!session) return new Response("Not found", { status: 404 });
  const pdf = await createProtocolPdf({ title: "Formalny protokół głosowania", organization: session.organization, voter: session.voter.fullName, status: session.status, rows: session.resolutions.map((r, i) => `${i + 1}. ${r.number}: ${r.ballot?.vote ?? "BRAK"}`) });
  return new Response(pdf, { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="protokol-${session.publicId}.pdf"` } });
}
