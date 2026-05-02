import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SPONSOR_LOGOS = [
  "https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=200&q=80&auto=format",
  "https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=200&q=80&auto=format",
];

async function seedExtrasForChamber(chamberSlug: string) {
  const chamber = await prisma.chamber.findUnique({
    where: { slug: chamberSlug },
    select: { id: true, name: true, brandColor: true },
  });
  if (!chamber) {
    console.warn(`[seed-extras] chamber ${chamberSlug} not found, skipping`);
    return;
  }

  const boardMembers = await prisma.membership.findMany({
    where: { chamberId: chamber.id, role: "BOARD_MEMBER", status: "ACTIVE" },
    include: { user: { select: { id: true, name: true } } },
  });
  if (boardMembers.length === 0) return;

  const admin = await prisma.membership.findFirst({
    where: { chamberId: chamber.id, role: "CHAMBER_ADMIN", status: "ACTIVE" },
    select: { userId: true },
  });
  const adminId = admin?.userId ?? boardMembers[0].user.id;

  await prisma.document.upsert({
    where: { id: `demo-doc-${chamberSlug}-1` },
    update: {},
    create: {
      id: `demo-doc-${chamberSlug}-1`,
      chamberId: chamber.id,
      title: "2026 chamber budget",
      description: "Approved budget for the calendar year. Updated quarterly.",
      url: "https://example.com/budget-2026.pdf",
      mimeType: "application/pdf",
      visibility: "BOARD_ONLY",
      uploadedBy: adminId,
    },
  });
  await prisma.document.upsert({
    where: { id: `demo-doc-${chamberSlug}-2` },
    update: {},
    create: {
      id: `demo-doc-${chamberSlug}-2`,
      chamberId: chamber.id,
      title: "Bylaws — current revision",
      description: "Includes 2025 amendments adopted at the AGM.",
      url: "https://example.com/bylaws.pdf",
      mimeType: "application/pdf",
      visibility: "BOARD_ONLY",
      uploadedBy: adminId,
    },
  });
  await prisma.document.upsert({
    where: { id: `demo-doc-${chamberSlug}-3` },
    update: {},
    create: {
      id: `demo-doc-${chamberSlug}-3`,
      chamberId: chamber.id,
      title: "Audit report Q4 2025",
      description: "External auditor's letter and findings.",
      url: "https://example.com/audit-q4.pdf",
      mimeType: "application/pdf",
      visibility: "BOARD_ONLY",
      uploadedBy: adminId,
    },
  });

  const pastMeetingDate = new Date();
  pastMeetingDate.setDate(pastMeetingDate.getDate() - 21);
  pastMeetingDate.setUTCHours(15, 0, 0, 0);
  const upcomingMeetingDate = new Date();
  upcomingMeetingDate.setDate(upcomingMeetingDate.getDate() + 18);
  upcomingMeetingDate.setUTCHours(15, 0, 0, 0);

  const completedMeeting = await prisma.meeting.upsert({
    where: { id: `demo-meet-${chamberSlug}-past` },
    update: {},
    create: {
      id: `demo-meet-${chamberSlug}-past`,
      chamberId: chamber.id,
      title: "Q1 board meeting",
      scheduledAt: pastMeetingDate,
      location: `${chamber.name} office`,
      status: "COMPLETED",
      agenda: [
        { order: 1, title: "Welcome & approval of last minutes" },
        { order: 2, title: "Treasurer report" },
        { order: 3, title: "Membership update" },
        { order: 4, title: "Sponsor agreement renewal" },
        { order: 5, title: "AOB" },
      ],
      minutes:
        "Quorum established at 15:08. Treasurer presented Q4 figures (above plan on event revenue, below plan on corporate). Board unanimously approved renewal of the platinum sponsor agreement. AOB: none. Closed at 16:42.",
      signedById: adminId,
      signedAt: new Date(pastMeetingDate.getTime() + 60 * 60 * 1000 * 2),
    },
  });

  const upcomingMeeting = await prisma.meeting.upsert({
    where: { id: `demo-meet-${chamberSlug}-next` },
    update: {},
    create: {
      id: `demo-meet-${chamberSlug}-next`,
      chamberId: chamber.id,
      title: "Q2 board meeting",
      scheduledAt: upcomingMeetingDate,
      location: `${chamber.name} office`,
      status: "SCHEDULED",
      agenda: [
        { order: 1, title: "Approval of Q1 minutes" },
        { order: 2, title: "Half-year financial review" },
        { order: 3, title: "Strategy: federation discussion" },
        { order: 4, title: "Open motions review" },
      ],
    },
  });

  for (const m of boardMembers) {
    await prisma.meetingAttendee.upsert({
      where: { meetingId_userId: { meetingId: completedMeeting.id, userId: m.user.id } },
      update: {},
      create: {
        meetingId: completedMeeting.id,
        userId: m.user.id,
        attendance: "ATTENDED",
      },
    });
    await prisma.meetingAttendee.upsert({
      where: { meetingId_userId: { meetingId: upcomingMeeting.id, userId: m.user.id } },
      update: {},
      create: {
        meetingId: upcomingMeeting.id,
        userId: m.user.id,
        attendance: "INVITED",
      },
    });
  }

  await prisma.conflictDeclaration.upsert({
    where: { id: `demo-coi-${chamberSlug}-1` },
    update: {},
    create: {
      id: `demo-coi-${chamberSlug}-1`,
      chamberId: chamber.id,
      declaredBy: boardMembers[0].user.id,
      subject: "Potential conflict — sponsor selection vote",
      details:
        "I serve on the advisory board of one of the candidate sponsors. Recusing myself from any vote on this sponsor agreement.",
      declaredAt: new Date(pastMeetingDate.getTime() - 1000 * 60 * 60 * 24),
    },
  });
  if (boardMembers.length > 1) {
    await prisma.conflictDeclaration.upsert({
      where: { id: `demo-coi-${chamberSlug}-2` },
      update: {},
      create: {
        id: `demo-coi-${chamberSlug}-2`,
        chamberId: chamber.id,
        declaredBy: boardMembers[1].user.id,
        subject: "Family employment at member company",
        details:
          "My spouse is employed at one of the corporate member companies. Disclosed for transparency; no operational conflict expected.",
        declaredAt: new Date(),
      },
    });
  }

  const sponsorSpecs = [
    {
      id: `demo-spon-${chamberSlug}-1`,
      name: `${chamber.name.split(" ")[0]} Bank`,
      blurb: "Banking partner of the chamber for the calendar year.",
    },
    {
      id: `demo-spon-${chamberSlug}-2`,
      name: "Maersk",
      blurb: "Shipping partner across Southeast Asia.",
    },
    {
      id: `demo-spon-${chamberSlug}-3`,
      name: "Carlsberg",
      blurb: "Networking-event beverage partner.",
    },
  ];
  for (let i = 0; i < sponsorSpecs.length; i++) {
    const s = sponsorSpecs[i];
    await prisma.sponsor.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        chamberId: chamber.id,
        name: s.name,
        logoUrl: SPONSOR_LOGOS[i % SPONSOR_LOGOS.length],
        websiteUrl: `https://${s.name.toLowerCase().replace(/\s+/g, "")}.example.com`,
        blurb: s.blurb,
      },
    });
  }

  const upcomingEvent = await prisma.event.findFirst({
    where: { chamberId: chamber.id, status: "PUBLISHED", startsAt: { gte: new Date() } },
    select: { id: true },
    orderBy: { startsAt: "asc" },
  });
  if (upcomingEvent) {
    const tiers: Array<{ id: string; tier: "PLATINUM" | "GOLD" | "SILVER" }> = [
      { id: sponsorSpecs[0].id, tier: "PLATINUM" },
      { id: sponsorSpecs[1].id, tier: "GOLD" },
      { id: sponsorSpecs[2].id, tier: "SILVER" },
    ];
    for (const t of tiers) {
      await prisma.eventSponsor.upsert({
        where: { eventId_sponsorId: { eventId: upcomingEvent.id, sponsorId: t.id } },
        update: { tier: t.tier },
        create: { eventId: upcomingEvent.id, sponsorId: t.id, tier: t.tier },
      });
    }
  }

  console.log(
    `[seed-extras] ${chamberSlug} — 3 documents, 2 meetings (1 signed), 2 COI, 3 sponsors, 1 event-sponsor set`,
  );
}

async function main() {
  for (const slug of ["dancham", "sweacham", "norcham", "fincham"]) {
    await seedExtrasForChamber(slug);
  }
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
