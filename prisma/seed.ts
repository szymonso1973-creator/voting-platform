import { AdminRole, PrismaClient, VotingSessionStatus } from "@prisma/client";
import crypto from "crypto";
import { hashPassword } from "../lib/admin-auth";

const prisma = new PrismaClient();

function hashVotingToken(token: string) {
  const secret = process.env.VOTING_TOKEN_SECRET ?? "super-secret-voting-token";
  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "abc-development" },
    update: {},
    create: { name: "ABC Development sp. z o.o.", slug: "abc-development" },
  });

  await prisma.adminUser.upsert({
    where: { email: "admin@example.com" },
    update: { fullName: "Administrator Główny", role: AdminRole.ORG_ADMIN, passwordHash: hashPassword("Admin123!"), orgId: org.id, isActive: true },
    create: { email: "admin@example.com", fullName: "Administrator Główny", role: AdminRole.ORG_ADMIN, passwordHash: hashPassword("Admin123!"), orgId: org.id, isActive: true },
  });

  const voter = await prisma.voter.upsert({
    where: { email: "jan.kowalski@example.com" },
    update: { orgId: org.id, fullName: "Jan Kowalski", identifier: "USR-001", shares: "120 udziałów" },
    create: { orgId: org.id, fullName: "Jan Kowalski", email: "jan.kowalski@example.com", identifier: "USR-001", shares: "120 udziałów" },
  });

  const publicId = "VOTE-2026-03-31-001";
  const rawToken = "vote_demo_token_123456";

  const existing = await prisma.votingSession.findUnique({ where: { publicId } });
  if (!existing) {
    await prisma.votingSession.create({
      data: {
        orgId: org.id,
        publicId,
        organization: org.name,
        title: "Głosowanie nad uchwałami",
        tokenHash: hashVotingToken(rawToken),
        deadline: new Date("2026-03-31T23:59:00.000Z"),
        status: VotingSessionStatus.ACTIVE,
        allowDraft: true,
        allowPdfPreview: true,
        voterId: voter.id,
        resolutions: {
          create: [
            { number: "Uchwała nr 1/2026", subject: "Zatwierdzenie sprawozdania finansowego", description: "Głosowanie nad przyjęciem rocznego sprawozdania finansowego za poprzedni rok obrotowy.", pdfUrl: "/pdf/uchwala-1.pdf", sortOrder: 1 },
            { number: "Uchwała nr 2/2026", subject: "Powołanie członka zarządu", description: "Głosowanie nad powołaniem nowego członka zarządu na kolejną kadencję.", pdfUrl: "/pdf/uchwala-2.pdf", sortOrder: 2 },
            { number: "Uchwała nr 3/2026", subject: "Podział zysku", description: "Głosowanie nad propozycją podziału zysku i przeznaczenia części środków na kapitał zapasowy.", pdfUrl: "/pdf/uchwala-3.pdf", sortOrder: 3 }
          ]
        }
      }
    });
  }

  console.log("Admin:", "admin@example.com / Admin123!");
  console.log("Token głosowania:", rawToken);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
