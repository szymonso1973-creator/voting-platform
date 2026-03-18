import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, VotingSessionStatus } from "@prisma/client";
import { hashVotingToken } from "@/lib/voting-auth";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");

  if (secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const organization = await prisma.organization.upsert({
      where: { slug: "redpol" },
      update: {
        name: "REDPOL",
        isActive: true,
      },
      create: {
        name: "REDPOL",
        slug: "redpol",
        isActive: true,
      },
    });

    const admin = await prisma.adminUser.update({
      where: { email: "admin@redpol.icu" },
      data: {
        orgId: organization.id,
      },
    });

    const voter = await prisma.voter.upsert({
      where: { email: "glosujacy@redpol.icu" },
      update: {
        orgId: organization.id,
        fullName: "Jan Kowalski",
        identifier: "USR-001",
        shares: "120 udziałów",
      },
      create: {
        orgId: organization.id,
        fullName: "Jan Kowalski",
        email: "glosujacy@redpol.icu",
        identifier: "USR-001",
        shares: "120 udziałów",
      },
    });

    const publicId = "VOTE-2026-REDPOL-001";
    const rawToken = "vote_demo_token_123456";

    const existingSession = await prisma.votingSession.findUnique({
      where: { publicId },
      include: {
        resolutions: true,
      },
    });

    let votingSession;

    if (existingSession) {
      votingSession = await prisma.votingSession.update({
        where: { id: existingSession.id },
        data: {
          orgId: organization.id,
          organization: organization.name,
          title: "Głosowanie nad uchwałami REDPOL",
          tokenHash: hashVotingToken(rawToken),
          deadline: new Date("2026-12-31T23:59:00.000Z"),
          status: VotingSessionStatus.ACTIVE,
          allowDraft: true,
          allowPdfPreview: true,
          voterId: voter.id,
        },
      });
    } else {
      votingSession = await prisma.votingSession.create({
        data: {
          orgId: organization.id,
          publicId,
          organization: organization.name,
          title: "Głosowanie nad uchwałami REDPOL",
          tokenHash: hashVotingToken(rawToken),
          deadline: new Date("2026-12-31T23:59:00.000Z"),
          status: VotingSessionStatus.ACTIVE,
          allowDraft: true,
          allowPdfPreview: true,
          voterId: voter.id,
        },
      });
    }

    const existingResolutions = await prisma.resolution.findMany({
      where: { votingSessionId: votingSession.id },
      orderBy: { sortOrder: "asc" },
    });

    const desiredResolutions = [
      {
        number: "Uchwała nr 1/2026",
        subject: "Zatwierdzenie sprawozdania finansowego",
        description:
          "Głosowanie nad przyjęciem rocznego sprawozdania finansowego za poprzedni rok obrotowy.",
        pdfUrl: "/pdf/uchwala-1.pdf",
        sortOrder: 1,
      },
      {
        number: "Uchwała nr 2/2026",
        subject: "Powołanie członka zarządu",
        description:
          "Głosowanie nad powołaniem nowego członka zarządu na kolejną kadencję.",
        pdfUrl: "/pdf/uchwala-2.pdf",
        sortOrder: 2,
      },
      {
        number: "Uchwała nr 3/2026",
        subject: "Podział zysku",
        description:
          "Głosowanie nad propozycją podziału zysku i przeznaczenia części środków na kapitał zapasowy.",
        pdfUrl: "/pdf/uchwala-3.pdf",
        sortOrder: 3,
      },
    ];

    for (const resolution of desiredResolutions) {
      const existing = existingResolutions.find((item) => item.sortOrder === resolution.sortOrder);

      if (existing) {
        await prisma.resolution.update({
          where: { id: existing.id },
          data: resolution,
        });
      } else {
        await prisma.resolution.create({
          data: {
            ...resolution,
            votingSessionId: votingSession.id,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Dane demo zostały utworzone",
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      admin: {
        email: admin.email,
        orgId: admin.orgId,
      },
      voter: {
        email: voter.email,
        fullName: voter.fullName,
      },
      voting: {
        publicId,
        title: "Głosowanie nad uchwałami REDPOL",
        token: rawToken,
        link: `${process.env.NEXT_PUBLIC_APP_URL}/vote/${rawToken}`,
        adminPanel: `${process.env.NEXT_PUBLIC_APP_URL}/admin`,
      },
    });
  } catch (e) {
    console.error("SETUP_DEMO_DATA_ERROR", e);

    return NextResponse.json(
      {
        error: "Błąd tworzenia danych demo",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}
