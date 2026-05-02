/**
 * DanChamp Platform — demo seed
 *
 * Goal: produce a richly-populated, realistic, narrative dataset that the
 * founder can show off as a complete working product. Every record uses a
 * stable, deterministic id (`demo-...`) so repeated runs are idempotent.
 *
 * Layout:
 *   - constants & helpers
 *   - chamber definitions
 *   - per-chamber seeders (members, companies, events, forum, knowledge,
 *     marketplace, motions, communications, audit)
 *   - main() orchestrates everything in order
 */

import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ---------- Constants ----------

const NOW = new Date();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const OPERATOR_EMAIL = process.env.PLATFORM_OPERATOR_EMAIL ?? "ops@danchamp.com";

const CHAMBER_SLUGS = ["dancham", "sweacham", "norcham", "fincham"] as const;
type ChamberSlug = (typeof CHAMBER_SLUGS)[number];

interface ChamberSpec {
  slug: ChamberSlug;
  name: string;
  country: string;
  city: string;
  currency: string;
  brandColor: string;
  tagline: string;
  heroImageUrl: string;
  logoUrl: string | null;
  standardPrice: number;
  corporatePrice: number;
  ticketPrice: number;
  invoicePrice: number;
}

const CHAMBERS: ChamberSpec[] = [
  {
    slug: "dancham",
    name: "Danish Chamber of Commerce in Indonesia",
    country: "Indonesia",
    city: "Jakarta",
    currency: "IDR",
    brandColor: "#C8102E",
    tagline: "Connecting Danish business in Jakarta and beyond.",
    heroImageUrl:
      "https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=1600&q=80&auto=format&fit=crop",
    logoUrl: null,
    standardPrice: 5_000_000,
    corporatePrice: 25_000_000,
    ticketPrice: 250_000,
    invoicePrice: 5_000_000,
  },
  {
    slug: "sweacham",
    name: "Swedish Chamber of Commerce in Indonesia",
    country: "Indonesia",
    city: "Jakarta",
    currency: "IDR",
    brandColor: "#006AA7",
    tagline: "Bridging Swedish enterprise with Indonesia.",
    heroImageUrl:
      "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=1600&q=80&auto=format&fit=crop",
    logoUrl: null,
    standardPrice: 5_000_000,
    corporatePrice: 25_000_000,
    ticketPrice: 250_000,
    invoicePrice: 5_000_000,
  },
  {
    slug: "norcham",
    name: "Norwegian Business Forum Indonesia",
    country: "Indonesia",
    city: "Bali",
    currency: "IDR",
    brandColor: "#BA0C2F",
    tagline: "The Norwegian business gateway to Bali and the archipelago.",
    heroImageUrl:
      "https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?w=1600&q=80&auto=format&fit=crop",
    logoUrl: null,
    standardPrice: 5_000_000,
    corporatePrice: 25_000_000,
    ticketPrice: 250_000,
    invoicePrice: 5_000_000,
  },
  {
    slug: "fincham",
    name: "Finland Chamber Indonesia",
    country: "Indonesia",
    city: "Jakarta",
    currency: "IDR",
    brandColor: "#003580",
    tagline: "Sisu-driven business between Finland and Indonesia.",
    heroImageUrl:
      "https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=1600&q=80&auto=format&fit=crop",
    logoUrl: null,
    standardPrice: 5_000_000,
    corporatePrice: 25_000_000,
    ticketPrice: 250_000,
    invoicePrice: 5_000_000,
  },
];

// Stable Unsplash image pool for events/articles/listings.
const EVENT_IMAGES = [
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517164850305-99a3e65bb47e?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559223607-a43c990c692c?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80&auto=format&fit=crop",
];

const ARTICLE_IMAGES = [
  "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=1200&q=80&auto=format&fit=crop",
];

const LISTING_IMAGES = [
  "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1556745753-b2904692b3cd?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&q=80&auto=format&fit=crop",
];

// ---------- Helpers ----------

function avatarFor(email: string): string {
  return `https://i.pravatar.cc/200?u=${encodeURIComponent(email)}`;
}

function dayOffset(days: number, hour = 9): Date {
  const d = new Date(NOW.getTime() + days * ONE_DAY_MS);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function pick<T>(arr: readonly T[], idx: number): T {
  return arr[idx % arr.length];
}

interface UserSpec {
  email: string;
  name: string;
  headline: string;
  bio: string;
  location: string;
}

async function upsertUser(spec: UserSpec): Promise<{ id: string; email: string }> {
  return prisma.user.upsert({
    where: { email: spec.email },
    update: {
      name: spec.name,
      headline: spec.headline,
      bio: spec.bio,
      location: spec.location,
      avatarUrl: avatarFor(spec.email),
    },
    create: {
      email: spec.email,
      name: spec.name,
      headline: spec.headline,
      bio: spec.bio,
      location: spec.location,
      avatarUrl: avatarFor(spec.email),
    },
    select: { id: true, email: true },
  });
}

// ---------- Member roster per chamber ----------

interface MemberDef extends UserSpec {
  role: "CHAMBER_ADMIN" | "BOARD_MEMBER" | "CORPORATE_CONTACT" | "BUSINESS_MEMBER";
  tier: "Standard" | "Corporate";
  tags: string[];
  companyKey?: string;
}

const ROSTERS: Record<ChamberSlug, MemberDef[]> = {
  dancham: [
    {
      email: "lars.petersen@dancham.demo",
      name: "Lars Petersen",
      headline: "Country Manager, Maersk Indonesia",
      bio: "20 years in regional supply chain. Building cold-chain infrastructure across the archipelago. Mentor to first-time founders.",
      location: "Jakarta, ID",
      role: "CHAMBER_ADMIN",
      tier: "Corporate",
      tags: ["board-2025", "vip"],
      companyKey: "maersk-id",
    },
    {
      email: "mette.hansen@dancham.demo",
      name: "Mette Hansen",
      headline: "Regional Director SEA, Carlsberg Group",
      bio: "Beverages, retail, FMCG. Previously head of marketing for Carlsberg Asia.",
      location: "Jakarta, ID",
      role: "BOARD_MEMBER",
      tier: "Corporate",
      tags: ["board-2025", "speaker"],
      companyKey: "carlsberg-id",
    },
    {
      email: "soren.nielsen@dancham.demo",
      name: "Søren Nielsen",
      headline: "Founder, Bali Tech Studio",
      bio: "Builds B2B SaaS for hospitality across Bali and Lombok. Three exits, two scars.",
      location: "Denpasar, ID",
      role: "BOARD_MEMBER",
      tier: "Standard",
      tags: ["board-2025", "founder", "mentor"],
    },
    {
      email: "freja.holm@dancham.demo",
      name: "Freja Holm",
      headline: "Partner, Holm & Larsen Legal",
      bio: "Indonesian corporate law, M&A, foreign investment. PERMA-licensed.",
      location: "Jakarta, ID",
      role: "BOARD_MEMBER",
      tier: "Standard",
      tags: ["board-2025", "mentor"],
    },
    {
      email: "mikkel.berg@dancham.demo",
      name: "Mikkel Berg",
      headline: "CFO, Novo Nordisk Indonesia",
      bio: "Pharma finance leader. Passionate about access-to-insulin programs.",
      location: "Jakarta, ID",
      role: "BOARD_MEMBER",
      tier: "Corporate",
      tags: ["board-2025"],
      companyKey: "novo-id",
    },
    {
      email: "ase.lund@dancham.demo",
      name: "Åse Lund",
      headline: "ESG Lead, Lego Asia",
      bio: "Sustainability and circular packaging across Asia.",
      location: "Jakarta, ID",
      role: "BOARD_MEMBER",
      tier: "Corporate",
      tags: ["board-2025", "mentor"],
      companyKey: "lego-id",
    },
    {
      email: "jens.ostergaard@dancham.demo",
      name: "Jens Østergaard",
      headline: "Country Head, Novo Nordisk Indonesia",
      bio: "Built the diabetes care program serving 400k Indonesian patients.",
      location: "Jakarta, ID",
      role: "CORPORATE_CONTACT",
      tier: "Corporate",
      tags: ["vip"],
      companyKey: "novo-id",
    },
    {
      email: "kasper.lindholm@dancham.demo",
      name: "Kasper Lindholm",
      headline: "Operations Director, Maersk Indonesia",
      bio: "Port operations across Tanjung Priok and Surabaya.",
      location: "Surabaya, ID",
      role: "CORPORATE_CONTACT",
      tier: "Corporate",
      tags: [],
      companyKey: "maersk-id",
    },
    {
      email: "budi.hartono@dancham.demo",
      name: "Budi Hartono",
      headline: "Founder, Hartono Maritime",
      bio: "Locally-owned shipping co specialising in inter-island freight to Eastern Indonesia.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["founder"],
    },
    {
      email: "anders.kristiansen@dancham.demo",
      name: "Anders Kristiansen",
      headline: "Independent Architect",
      bio: "Sustainable buildings in tropical climates. Currently designing a net-zero school in Lombok.",
      location: "Denpasar, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["new"],
    },
    {
      email: "putri.wibowo@dancham.demo",
      name: "Putri Wibowo",
      headline: "Investment Director, Mandiri Capital",
      bio: "Series A investor focused on logistics, climate-tech, and women-led founders.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["mentor"],
    },
    {
      email: "henrik.molgaard@dancham.demo",
      name: "Henrik Mølgaard",
      headline: "GM, Scandic Hotels Bali",
      bio: "Hospitality veteran. Opened five properties across Indonesia.",
      location: "Denpasar, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: [],
    },
    {
      email: "rina.sutanto@dancham.demo",
      name: "Rina Sutanto",
      headline: "Translator EN/ID/DA",
      bio: "Sworn translator. Specialises in legal and notarial documents for Danish expats.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["new"],
    },
    {
      email: "thomas.jorgensen@dancham.demo",
      name: "Thomas Jørgensen",
      headline: "Head of Sales SEA, Vestas",
      bio: "Wind energy across Indonesia and the Philippines.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Corporate",
      tags: ["speaker"],
    },
    {
      email: "siti.rahmawati@dancham.demo",
      name: "Siti Rahmawati",
      headline: "Tax Partner, Rahmawati & Co.",
      bio: "Cross-border tax specialist. 15 years at a Big Four firm before going independent.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["mentor"],
    },
    {
      email: "rasmus.knudsen@dancham.demo",
      name: "Rasmus Knudsen",
      headline: "Solo Founder, ColdSnap Logistics",
      bio: "Cold-chain micro-fulfilment for D2C food brands in Java.",
      location: "Bandung, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["founder", "new"],
    },
    {
      email: "adi.kurniawan@dancham.demo",
      name: "Adi Kurniawan",
      headline: "Senior Architect, IKEA Indonesia",
      bio: "Store concepts and supply network design for IKEA Asia.",
      location: "Tangerang, ID",
      role: "BUSINESS_MEMBER",
      tier: "Corporate",
      tags: [],
      companyKey: "ikea-id",
    },
    {
      email: "louise.bach@dancham.demo",
      name: "Louise Bach",
      headline: "Head of Marketing, Pandora Indonesia",
      bio: "Retail marketing and CRM. Passionate about brand storytelling.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Corporate",
      tags: [],
    },
    {
      email: "agus.pranoto@dancham.demo",
      name: "Agus Pranoto",
      headline: "Head of Government Relations, Lego Indonesia",
      bio: "Public policy, customs, and regulatory affairs.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Corporate",
      tags: [],
      companyKey: "lego-id",
    },
    {
      email: "dewi.amanda@dancham.demo",
      name: "Dewi Amanda",
      headline: "Founder, Amanda & Co Communications",
      bio: "PR consultancy serving Nordic brands launching in Indonesia.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["founder"],
    },
    {
      email: "morten.dahl@dancham.demo",
      name: "Morten Dahl",
      headline: "Independent ESG Consultant",
      bio: "Helps Nordic SMEs navigate Indonesian ESG reporting.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["new"],
    },
    {
      email: "ida.skov@dancham.demo",
      name: "Ida Skov",
      headline: "Head of People, Carlsberg Indonesia",
      bio: "HR transformation and inclusive leadership programs.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Corporate",
      tags: [],
      companyKey: "carlsberg-id",
    },
  ],
  sweacham: [
    {
      email: "erik.lindgren@sweacham.demo",
      name: "Erik Lindgren",
      headline: "Managing Director, IKEA Indonesia",
      bio: "Retail operator. Led the launch of the IKEA Alam Sutera store in Tangerang and is opening the second flagship in 2026.",
      location: "Jakarta, ID",
      role: "CHAMBER_ADMIN",
      tier: "Corporate",
      tags: ["board-2025", "vip"],
      companyKey: "ikea-id-swe",
    },
    {
      email: "annika.bergman@sweacham.demo",
      name: "Annika Bergman",
      headline: "VP Indonesia, H&M",
      bio: "Fashion retail and digital transformation across Indonesia's tier-one and tier-two cities.",
      location: "Jakarta, ID",
      role: "BOARD_MEMBER",
      tier: "Corporate",
      tags: ["board-2025", "speaker"],
      companyKey: "hm-id",
    },
    {
      email: "johan.eklund@sweacham.demo",
      name: "Johan Eklund",
      headline: "Partner, Eklund Maritime Law",
      bio: "Indonesian-qualified maritime arbitrator. Charterparty and marine insurance disputes.",
      location: "Jakarta, ID",
      role: "BOARD_MEMBER",
      tier: "Standard",
      tags: ["board-2025", "mentor"],
    },
    {
      email: "linnea.holm@sweacham.demo",
      name: "Linnéa Holm",
      headline: "Head of Indonesia, Spotify",
      bio: "Music streaming, podcasts, and creator economies across Indonesia's 80M monthly listeners.",
      location: "Jakarta, ID",
      role: "BOARD_MEMBER",
      tier: "Corporate",
      tags: ["board-2025"],
    },
    {
      email: "oskar.lindqvist@sweacham.demo",
      name: "Oskar Lindqvist",
      headline: "Founder, Nusantara VC",
      bio: "Early-stage investor backing Nordic-Indonesian crossover companies in fintech and climate.",
      location: "Jakarta, ID",
      role: "BOARD_MEMBER",
      tier: "Standard",
      tags: ["board-2025", "founder", "mentor"],
    },
    {
      email: "freya.berglund@sweacham.demo",
      name: "Freya Berglund",
      headline: "ESG Director, IKEA Indonesia",
      bio: "Sustainability reporting, decarbonisation roadmaps, and circular packaging programs.",
      location: "Tangerang, ID",
      role: "BOARD_MEMBER",
      tier: "Corporate",
      tags: ["board-2025"],
      companyKey: "ikea-id-swe",
    },
    {
      email: "wulan.kusuma@sweacham.demo",
      name: "Wulan Kusuma",
      headline: "Head of Operations, H&M Indonesia",
      bio: "Retail operations leader across 25 H&M stores in Indonesia. Indonesian talent inside a Swedish brand.",
      location: "Jakarta, ID",
      role: "CORPORATE_CONTACT",
      tier: "Corporate",
      tags: ["vip"],
      companyKey: "hm-id",
    },
    {
      email: "siv.larsson@sweacham.demo",
      name: "Siv Larsson",
      headline: "Country Manager, Klarna Indonesia",
      bio: "Building BNPL across Indonesia for Klarna in partnership with local banks.",
      location: "Jakarta, ID",
      role: "CORPORATE_CONTACT",
      tier: "Corporate",
      tags: [],
    },
    {
      email: "patrik.svensson@sweacham.demo",
      name: "Patrik Svensson",
      headline: "Founder, Tundra Robotics Indonesia",
      bio: "Industrial robots for Indonesian factories — automotive, electronics, FMCG.",
      location: "Bandung, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["founder", "speaker"],
    },
    {
      email: "putri.anggraini@sweacham.demo",
      name: "Putri Anggraini",
      headline: "Senior Counsel, Skandia Legal",
      bio: "Cross-border deal-making for Nordic clients investing in Indonesia.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["mentor"],
    },
    {
      email: "elsa.akerlund@sweacham.demo",
      name: "Elsa Åkerlund",
      headline: "Head of Brand, Volvo Cars Indonesia",
      bio: "Automotive marketing and electrification campaigns for the Indonesian market.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Corporate",
      tags: [],
    },
    {
      email: "henrik.lindqvist@sweacham.demo",
      name: "Henrik Lindqvist",
      headline: "Independent CFO",
      bio: "Fractional CFO services for Nordic-founded startups operating PT PMA entities in Indonesia.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["mentor"],
    },
    {
      email: "made.wijaya@sweacham.demo",
      name: "Made Wijaya",
      headline: "Head of HR, Spotify Indonesia",
      bio: "People operations in a fast-moving creator economy. Bali-born, Jakarta-based.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Corporate",
      tags: [],
    },
    {
      email: "joel.lundberg@sweacham.demo",
      name: "Joel Lundberg",
      headline: "Founder, NordicEats Indonesia",
      bio: "Smörgåsbord-style cafe concept rolling out across Soekarno-Hatta and Ngurah Rai airports.",
      location: "Bali, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["founder", "new"],
    },
    {
      email: "matilda.norberg@sweacham.demo",
      name: "Matilda Norberg",
      headline: "Senior Designer, Ericsson Indonesia",
      bio: "Industrial design for telecom hardware. Working on 5G base station enclosures for the Indonesian rollout.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Corporate",
      tags: [],
    },
    {
      email: "siti.wulandari@sweacham.demo",
      name: "Siti Wulandari",
      headline: "Tax Partner, Wulandari & Bergman",
      bio: "Tax structuring across the Sweden-Indonesia corridor with a focus on PT PMA setups.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["mentor"],
    },
    {
      email: "marcus.holmgren@sweacham.demo",
      name: "Marcus Holmgren",
      headline: "Head of Sales, Atlas Copco Indonesia",
      bio: "Industrial equipment sales across mining, marine, and manufacturing in Indonesia.",
      location: "Surabaya, ID",
      role: "BUSINESS_MEMBER",
      tier: "Corporate",
      tags: [],
    },
    {
      email: "isabella.harahap@sweacham.demo",
      name: "Isabella Harahap",
      headline: "Independent PR Consultant",
      bio: "Brand PR for Nordic luxury and lifestyle brands launching in Jakarta.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["new"],
    },
    {
      email: "viktor.sandberg@sweacham.demo",
      name: "Viktor Sandberg",
      headline: "Founder, Nordlys Capital",
      bio: "Boutique advisory for cross-border M&A focused on Nordic acquirers in Indonesia.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["founder"],
    },
    {
      email: "ayu.permatasari@sweacham.demo",
      name: "Ayu Permatasari",
      headline: "Head of People, Klarna Indonesia",
      bio: "People & culture at scale. Built the local hiring program from 4 to 60 staff.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Corporate",
      tags: [],
    },
  ],
  norcham: [
    {
      email: "magnus.hansen@norcham.demo",
      name: "Magnus Hansen",
      headline: "Country Manager, Equinor Indonesia",
      bio: "Offshore wind project lead for Indonesia's first commercial-scale farms in the Java Sea.",
      location: "Jakarta, ID",
      role: "CHAMBER_ADMIN",
      tier: "Corporate",
      tags: ["board-2025", "vip"],
      companyKey: "equinor-id",
    },
    {
      email: "ingrid.solberg@norcham.demo",
      name: "Ingrid Solberg",
      headline: "Regional Director, DNV Indonesia",
      bio: "Maritime classification and energy transition advisory for the Indonesian archipelago.",
      location: "Jakarta, ID",
      role: "BOARD_MEMBER",
      tier: "Corporate",
      tags: ["board-2025", "speaker"],
    },
    {
      email: "ole.bjornstad@norcham.demo",
      name: "Ole Bjørnstad",
      headline: "Founder, Fjord Aquaculture Bali",
      bio: "Barramundi and grouper RAS facilities in northern Bali. Two-year-old operation, scaling to 1,200 tonnes.",
      location: "Bali, ID",
      role: "BOARD_MEMBER",
      tier: "Standard",
      tags: ["board-2025", "founder"],
    },
    {
      email: "kari.nordeng@norcham.demo",
      name: "Kari Nordeng",
      headline: "Partner, Nordeng Maritime Law",
      bio: "Shipping, charterparty, and marine insurance disputes — Indonesian and international forums.",
      location: "Jakarta, ID",
      role: "BOARD_MEMBER",
      tier: "Standard",
      tags: ["board-2025", "mentor"],
    },
    {
      email: "sigrid.olsen@norcham.demo",
      name: "Sigrid Olsen",
      headline: "Head of Sustainability, Yara Indonesia",
      bio: "Green ammonia and fertiliser supply chains for Indonesian agriculture.",
      location: "Jakarta, ID",
      role: "BOARD_MEMBER",
      tier: "Corporate",
      tags: ["board-2025"],
    },
    {
      email: "lars.christensen@norcham.demo",
      name: "Lars Christensen",
      headline: "CFO, Equinor Indonesia",
      bio: "Energy finance leader. Built the project finance stack for Indonesia's first floating offshore wind pilot.",
      location: "Jakarta, ID",
      role: "BOARD_MEMBER",
      tier: "Corporate",
      tags: ["board-2025"],
      companyKey: "equinor-id",
    },
    {
      email: "agus.santoso@norcham.demo",
      name: "Agus Santoso",
      headline: "Head of Operations, Equinor Indonesia",
      bio: "Local operations leader with deep Indonesian policy experience and ESDM relationships.",
      location: "Jakarta, ID",
      role: "CORPORATE_CONTACT",
      tier: "Corporate",
      tags: ["vip"],
      companyKey: "equinor-id",
    },
    {
      email: "even.hauge@norcham.demo",
      name: "Even Hauge",
      headline: "Director, Wärtsilä Indonesia",
      bio: "Marine and energy systems integrator. Powering Indonesian inter-island ferries.",
      location: "Jakarta, ID",
      role: "CORPORATE_CONTACT",
      tier: "Corporate",
      tags: [],
      companyKey: "wartsila-id",
    },
    {
      email: "budi.hartono@norcham.demo",
      name: "Budi Hartono",
      headline: "Founder, Hartono Logistics",
      bio: "Freight forwarding across Tanjung Priok, Tanjung Perak, and Benoa ports.",
      location: "Surabaya, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["founder"],
    },
    {
      email: "henrik.aas@norcham.demo",
      name: "Henrik Aas",
      headline: "GM, Scandic Hotels Indonesia",
      bio: "Hospitality operator across Jakarta and Bali.",
      location: "Bali, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: [],
    },
    {
      email: "ratna.dewi@norcham.demo",
      name: "Ratna Dewi",
      headline: "Senior Tax Manager, Dewi & Solberg",
      bio: "Indonesian corporate tax with cross-border focus on Norway-Indonesia treaty cases.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["mentor"],
    },
    {
      email: "andreas.berge@norcham.demo",
      name: "Andreas Berge",
      headline: "Founder, Berge Solar Indonesia",
      bio: "Rooftop solar installations for industrial parks in West Java and East Java.",
      location: "Bandung, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["founder", "new"],
    },
    {
      email: "kristine.haug@norcham.demo",
      name: "Kristine Haug",
      headline: "Independent Designer",
      bio: "Branding studios for Norwegian-owned hospitality brands across Bali and Yogyakarta.",
      location: "Yogyakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: [],
    },
    {
      email: "rio.permana@norcham.demo",
      name: "Rio Permana",
      headline: "Operations Manager, DNB Indonesia",
      bio: "Banking operations for Norwegian corporate clients with Indonesian footprint.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Corporate",
      tags: [],
    },
    {
      email: "mari.gulbrandsen@norcham.demo",
      name: "Mari Gulbrandsen",
      headline: "Marketing Director, Yara Indonesia",
      bio: "Agri-input marketing across Java, Sumatra, and Sulawesi.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Corporate",
      tags: [],
    },
    {
      email: "petter.dahl@norcham.demo",
      name: "Petter Dahl",
      headline: "Independent Consultant",
      bio: "Helps Norwegian SMEs enter the Indonesian market — discovery, partner identification, BKPM filings.",
      location: "Bali, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["mentor", "new"],
    },
    {
      email: "made.arika@norcham.demo",
      name: "Made Arika",
      headline: "Founder, GreenFreight Indonesia",
      bio: "Electric last-mile delivery serving Bali resorts and Jakarta SCBD.",
      location: "Bali, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["founder"],
    },
    {
      email: "frida.lindqvist@norcham.demo",
      name: "Frida Lindqvist",
      headline: "Head of HR, Wärtsilä Indonesia",
      bio: "People operations in heavy industry. Building the dual-language hiring playbook.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Corporate",
      tags: [],
      companyKey: "wartsila-id",
    },
  ],
  fincham: [
    {
      email: "aino.korhonen@fincham.demo",
      name: "Aino Korhonen",
      headline: "Country Manager, Nokia Solutions Indonesia",
      bio: "Telecom infrastructure and 5G rollouts across the Indonesian archipelago. Sisu personified.",
      location: "Jakarta, ID",
      role: "CHAMBER_ADMIN",
      tier: "Corporate",
      tags: ["board-2025", "vip"],
      companyKey: "nokia-id",
    },
    {
      email: "mikko.virtanen@fincham.demo",
      name: "Mikko Virtanen",
      headline: "Director Indonesia, Wärtsilä",
      bio: "Marine power systems sales lead — powering Indonesia's inter-island shipping fleet.",
      location: "Jakarta, ID",
      role: "BOARD_MEMBER",
      tier: "Corporate",
      tags: ["board-2025"],
      companyKey: "wartsila-id-fin",
    },
    {
      email: "kaisa.makinen@fincham.demo",
      name: "Kaisa Mäkinen",
      headline: "Founder, Aurora Edu Indonesia",
      bio: "Finnish-method early childhood education franchises operating in Jakarta and Bali.",
      location: "Jakarta, ID",
      role: "BOARD_MEMBER",
      tier: "Standard",
      tags: ["board-2025", "founder", "mentor"],
    },
    {
      email: "pekka.salminen@fincham.demo",
      name: "Pekka Salminen",
      headline: "Partner, Salminen Legal Jakarta",
      bio: "Foreign investment, BKPM applications, and M&A for Finnish-owned Indonesian operations.",
      location: "Jakarta, ID",
      role: "BOARD_MEMBER",
      tier: "Standard",
      tags: ["board-2025", "mentor"],
    },
    {
      email: "elina.heikkinen@fincham.demo",
      name: "Elina Heikkinen",
      headline: "Head of Indonesia, Kone Elevators",
      bio: "Building infrastructure across Jakarta's high-rises and the new Nusantara capital project.",
      location: "Jakarta, ID",
      role: "BOARD_MEMBER",
      tier: "Corporate",
      tags: ["board-2025", "speaker"],
    },
    {
      email: "tuomas.lehtinen@fincham.demo",
      name: "Tuomas Lehtinen",
      headline: "CFO, Nokia Solutions Indonesia",
      bio: "Financial leader for Nokia's Indonesian operations.",
      location: "Jakarta, ID",
      role: "BOARD_MEMBER",
      tier: "Corporate",
      tags: ["board-2025"],
      companyKey: "nokia-id",
    },
    {
      email: "joko.sutrisno@fincham.demo",
      name: "Joko Sutrisno",
      headline: "Head of Government Affairs, Nokia Solutions Indonesia",
      bio: "Telecom policy and regulatory affairs with deep Kominfo relationships.",
      location: "Jakarta, ID",
      role: "CORPORATE_CONTACT",
      tier: "Corporate",
      tags: ["vip"],
      companyKey: "nokia-id",
    },
    {
      email: "anneli.kivimaki@fincham.demo",
      name: "Anneli Kivimäki",
      headline: "Country Director, Wärtsilä Indonesia",
      bio: "Marine and energy services for the Indonesian market.",
      location: "Jakarta, ID",
      role: "CORPORATE_CONTACT",
      tier: "Corporate",
      tags: [],
      companyKey: "wartsila-id-fin",
    },
    {
      email: "putri.anggraini.fin@fincham.demo",
      name: "Putri Anggraini",
      headline: "Founder, Anggraini Translations",
      bio: "Sworn ID-FI-EN translation services for Finnish executives in Indonesia.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["founder", "new"],
    },
    {
      email: "juha.peltonen@fincham.demo",
      name: "Juha Peltonen",
      headline: "Independent Architect",
      bio: "Resort architecture across Bali, Lombok, and Sumba.",
      location: "Bali, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: [],
    },
    {
      email: "satu.aho@fincham.demo",
      name: "Satu Aho",
      headline: "Head of Marketing, Fazer Indonesia",
      bio: "FMCG launches in the Indonesian retail market — partnering with Indomaret and Alfamart chains.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Corporate",
      tags: [],
    },
    {
      email: "rangga.pratama@fincham.demo",
      name: "Rangga Pratama",
      headline: "Senior Tax Manager, KPMG Indonesia",
      bio: "Cross-border tax with strong Finland-Indonesia treaty expertise.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["mentor"],
    },
    {
      email: "ville.koskinen@fincham.demo",
      name: "Ville Koskinen",
      headline: "Founder, Garuda Visa",
      bio: "Boutique visa and KITAS consultancy for Finnish executives and their families.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["founder"],
    },
    {
      email: "intan.maharani@fincham.demo",
      name: "Intan Maharani",
      headline: "Operations Manager, Kone Indonesia",
      bio: "Lift maintenance operations across Jakarta's Sudirman and SCBD corridor.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Corporate",
      tags: [],
    },
    {
      email: "jari.hakkinen@fincham.demo",
      name: "Jari Häkkinen",
      headline: "Head of Sales, Metsä Group Indonesia",
      bio: "Pulp and forestry products sales across the Indonesian packaging market.",
      location: "Surabaya, ID",
      role: "BUSINESS_MEMBER",
      tier: "Corporate",
      tags: ["speaker"],
    },
    {
      email: "salla.ranta@fincham.demo",
      name: "Salla Ranta",
      headline: "Independent ESG Consultant",
      bio: "Helps Finnish SMEs map onto Indonesian OJK ESG disclosure rules.",
      location: "Bali, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["new", "mentor"],
    },
    {
      email: "anita.suryani@fincham.demo",
      name: "Anita Suryani",
      headline: "Founder, Suryani & Aho Communications",
      bio: "PR and media relations for Nordic-owned brands launching in Indonesia.",
      location: "Jakarta, ID",
      role: "BUSINESS_MEMBER",
      tier: "Standard",
      tags: ["founder"],
    },
  ],
};

// ---------- Companies per chamber ----------

interface CompanySpec {
  key: string; // matches MemberDef.companyKey
  name: string;
  industry: string;
  country: string;
  seats: number;
}

const COMPANIES: Record<ChamberSlug, CompanySpec[]> = {
  dancham: [
    { key: "maersk-id", name: "Maersk Indonesia", industry: "Logistics", country: "Indonesia", seats: 8 },
    { key: "carlsberg-id", name: "Multi Bintang Indonesia (Carlsberg)", industry: "Beverages", country: "Indonesia", seats: 6 },
    { key: "novo-id", name: "Novo Nordisk Indonesia", industry: "Pharmaceuticals", country: "Indonesia", seats: 5 },
    { key: "lego-id", name: "Lego Education Indonesia", industry: "Toys & Retail", country: "Indonesia", seats: 4 },
    { key: "ikea-id", name: "IKEA Indonesia", industry: "Retail", country: "Indonesia", seats: 6 },
  ],
  sweacham: [
    { key: "ikea-id-swe", name: "IKEA Indonesia", industry: "Retail", country: "Indonesia", seats: 10 },
    { key: "hm-id", name: "H&M Indonesia", industry: "Apparel", country: "Indonesia", seats: 7 },
  ],
  norcham: [
    { key: "equinor-id", name: "Equinor Indonesia", industry: "Energy", country: "Indonesia", seats: 9 },
    { key: "wartsila-id", name: "Wärtsilä Indonesia", industry: "Industrial", country: "Indonesia", seats: 6 },
  ],
  fincham: [
    { key: "nokia-id", name: "Nokia Solutions Indonesia", industry: "Telecom", country: "Indonesia", seats: 7 },
    { key: "wartsila-id-fin", name: "Wärtsilä Indonesia", industry: "Industrial", country: "Indonesia", seats: 5 },
  ],
};

// ---------- Events per chamber ----------

interface EventSpec {
  slug: string;
  title: string;
  description: string;
  daysOffset: number; // negative = past, positive = future
  hour: number;
  durationHours: number;
  location: string;
  capacity: number;
  visibility: "PUBLIC" | "MEMBERS_ONLY" | "TIER_RESTRICTED" | "BOARD_ONLY";
  status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  imageIdx: number;
  ticket: { name: string; price: number; audience: string };
  rsvpCount: number; // index into roster, 0 if no RSVPs
  isPaid: boolean;
}

const EVENTS: Record<ChamberSlug, EventSpec[]> = {
  dancham: [
    {
      slug: "crown-prince-dinner-2026",
      title: "Danish Crown Prince visit & networking dinner",
      description:
        "An exclusive black-tie dinner welcoming HRH the Crown Prince of Denmark on his official visit to Indonesia. The evening features remarks from the Ambassador, a curated four-course Nordic-Indonesian menu, and dedicated networking time with senior Danish business leaders. Strict RSVP required.",
      daysOffset: -45,
      hour: 18,
      durationHours: 4,
      location: "Mandarin Oriental Jakarta, Grand Ballroom",
      capacity: 120,
      visibility: "MEMBERS_ONLY",
      status: "COMPLETED",
      imageIdx: 0,
      ticket: { name: "Black-tie seat", price: 2_500_000, audience: "MEMBER" },
      rsvpCount: 14,
      isPaid: true,
    },
    {
      slug: "q1-economic-briefing",
      title: "Q1 ASEAN economic outlook briefing",
      description:
        "Quarterly briefing with senior economists from Bank Mandiri and the Danish Embassy. We unpack BI rate decisions, FDI flows, currency outlook, and sector-by-sector deep-dives in logistics, pharma, and renewables.",
      daysOffset: -22,
      hour: 8,
      durationHours: 2,
      location: "The Hermitage, Jakarta",
      capacity: 60,
      visibility: "MEMBERS_ONLY",
      status: "COMPLETED",
      imageIdx: 1,
      ticket: { name: "Members", price: 250_000, audience: "MEMBER" },
      rsvpCount: 9,
      isPaid: true,
    },
    {
      slug: "spring-mixer-jakarta",
      title: "Spring mixer at the Ambassador's residence",
      description:
        "Casual cocktails and conversation with the wider Nordic business community. A low-key evening hosted by the Danish Ambassador. Open bar, finger food, and 100+ members from across the four Nordic chambers.",
      daysOffset: 12,
      hour: 18,
      durationHours: 3,
      location: "Danish Ambassador's Residence, Jakarta",
      capacity: 150,
      visibility: "PUBLIC",
      status: "PUBLISHED",
      imageIdx: 2,
      ticket: { name: "Free", price: 0, audience: "MEMBER" },
      rsvpCount: 18,
      isPaid: false,
    },
    {
      slug: "logistics-roundtable-2026",
      title: "Logistics & cold-chain roundtable",
      description:
        "A focused conversation among 20 senior operators from logistics, pharma, and food. Maersk, Carlsberg, and Novo Nordisk lead a chatham-house-style discussion of port congestion, customs reform, and last-mile cold-chain.",
      daysOffset: 28,
      hour: 14,
      durationHours: 3,
      location: "Maersk HQ, SCBD Jakarta",
      capacity: 30,
      visibility: "MEMBERS_ONLY",
      status: "PUBLISHED",
      imageIdx: 3,
      ticket: { name: "Roundtable seat", price: 500_000, audience: "MEMBER" },
      rsvpCount: 12,
      isPaid: true,
    },
    {
      slug: "esg-deep-dive",
      title: "ESG deep-dive: 2026 Indonesian disclosure rules",
      description:
        "OJK has finalised a new ESG disclosure framework for foreign-controlled entities. We go through it line-by-line with Holm & Larsen Legal and the ESG team from Lego Indonesia.",
      daysOffset: 45,
      hour: 9,
      durationHours: 4,
      location: "Hotel Mulia Senayan, Jakarta",
      capacity: 80,
      visibility: "MEMBERS_ONLY",
      status: "PUBLISHED",
      imageIdx: 4,
      ticket: { name: "Workshop", price: 750_000, audience: "MEMBER" },
      rsvpCount: 8,
      isPaid: true,
    },
    {
      slug: "founders-night-bali",
      title: "Founders Night Bali",
      description:
        "Quarterly meetup of Nordic founders building in Bali. Bring a problem, leave with three intros. Hosted by Søren Nielsen at Bali Tech Studio.",
      daysOffset: 55,
      hour: 18,
      durationHours: 3,
      location: "Bali Tech Studio, Canggu",
      capacity: 40,
      visibility: "PUBLIC",
      status: "DRAFT",
      imageIdx: 5,
      ticket: { name: "Founder pass", price: 0, audience: "MEMBER" },
      rsvpCount: 0,
      isPaid: false,
    },
  ],
  sweacham: [
    {
      slug: "midsummer-2025",
      title: "Midsummer celebration 2025",
      description:
        "Annual midsummer celebration with maypole, sill, snaps, and Swedish folk music — adapted for the Jakarta climate. Held at the Royal Swedish Embassy residence with full family programming.",
      daysOffset: -50,
      hour: 16,
      durationHours: 6,
      location: "Royal Swedish Embassy, Jakarta",
      capacity: 200,
      visibility: "MEMBERS_ONLY",
      status: "COMPLETED",
      imageIdx: 5,
      ticket: { name: "Family pass", price: 400_000, audience: "MEMBER" },
      rsvpCount: 12,
      isPaid: true,
    },
    {
      slug: "klarna-fireside",
      title: "Fireside chat with Klarna's Indonesia leadership",
      description:
        "Klarna's Indonesia team walks us through the BNPL category, OJK engagement, and what's next for Swedish fintech expansion across the archipelago.",
      daysOffset: -18,
      hour: 18,
      durationHours: 2,
      location: "Mandarin Oriental, Jakarta",
      capacity: 70,
      visibility: "MEMBERS_ONLY",
      status: "COMPLETED",
      imageIdx: 6,
      ticket: { name: "Members", price: 250_000, audience: "MEMBER" },
      rsvpCount: 10,
      isPaid: true,
    },
    {
      slug: "spring-mixer-sg",
      title: "Spring mixer at Pullman Jakarta",
      description:
        "Casual rooftop mixer for Swedish and Nordic professionals in Jakarta. Cocktails, satay, and SCBD skyline views.",
      daysOffset: 9,
      hour: 19,
      durationHours: 3,
      location: "Pullman Jakarta Indonesia",
      capacity: 100,
      visibility: "PUBLIC",
      status: "PUBLISHED",
      imageIdx: 7,
      ticket: { name: "Free", price: 0, audience: "MEMBER" },
      rsvpCount: 15,
      isPaid: false,
    },
    {
      slug: "fashion-retail-roundtable",
      title: "Fashion & retail roundtable Jakarta",
      description:
        "H&M Indonesia leads a roundtable on omnichannel retail across Jakarta, Surabaya, and Bandung — store productivity, Tokopedia/Shopee dynamics, and circular fashion programs.",
      daysOffset: 21,
      hour: 14,
      durationHours: 3,
      location: "H&M Indonesia HQ, Jakarta",
      capacity: 30,
      visibility: "MEMBERS_ONLY",
      status: "PUBLISHED",
      imageIdx: 0,
      ticket: { name: "Roundtable", price: 500_000, audience: "MEMBER" },
      rsvpCount: 11,
      isPaid: true,
    },
    {
      slug: "ikea-sustainability-tour",
      title: "Behind-the-scenes: IKEA Alam Sutera sustainability tour",
      description:
        "Walk-through of IKEA Alam Sutera's circular hub in Tangerang. See how the flagship handles takeback, refurbishment, and resale for the Indonesian market.",
      daysOffset: 38,
      hour: 10,
      durationHours: 3,
      location: "IKEA Alam Sutera, Tangerang",
      capacity: 25,
      visibility: "MEMBERS_ONLY",
      status: "PUBLISHED",
      imageIdx: 1,
      ticket: { name: "Tour pass", price: 0, audience: "MEMBER" },
      rsvpCount: 7,
      isPaid: false,
    },
    {
      slug: "lucia-2026",
      title: "Lucia celebration 2026 Jakarta",
      description:
        "Save-the-date for our Lucia celebration this December. Choir, glögg, lussekatter, and the traditional procession at the Royal Swedish Embassy.",
      daysOffset: 55,
      hour: 17,
      durationHours: 4,
      location: "Royal Swedish Embassy, Jakarta",
      capacity: 200,
      visibility: "MEMBERS_ONLY",
      status: "DRAFT",
      imageIdx: 2,
      ticket: { name: "Family pass", price: 350_000, audience: "MEMBER" },
      rsvpCount: 0,
      isPaid: true,
    },
  ],
  norcham: [
    {
      slug: "constitution-day-2025",
      title: "Norwegian Constitution Day brunch — Bali",
      description:
        "Annual 17. mai celebration with Norwegian breakfast, children's parade, and brass band on the lawn at Four Seasons Jimbaran Bay. The full Norwegian community in Indonesia comes together.",
      daysOffset: -55,
      hour: 9,
      durationHours: 4,
      location: "Four Seasons Resort Bali at Jimbaran Bay",
      capacity: 250,
      visibility: "PUBLIC",
      status: "COMPLETED",
      imageIdx: 7,
      ticket: { name: "Brunch", price: 1_000_000, audience: "MEMBER" },
      rsvpCount: 11,
      isPaid: true,
    },
    {
      slug: "offshore-wind-summit",
      title: "Offshore wind summit Indonesia",
      description:
        "Equinor, Ørsted, and Indonesian authorities discuss the timeline for Indonesia's offshore wind targets in the Java Sea and the policy framework around grid connection and PPA pricing under PLN.",
      daysOffset: -10,
      hour: 9,
      durationHours: 7,
      location: "JW Marriott Jakarta",
      capacity: 180,
      visibility: "MEMBERS_ONLY",
      status: "COMPLETED",
      imageIdx: 0,
      ticket: { name: "Conference", price: 2_000_000, audience: "MEMBER" },
      rsvpCount: 13,
      isPaid: true,
    },
    {
      slug: "spring-mixer-hcmc",
      title: "Spring mixer Bali",
      description:
        "Casual cocktails on the rooftop of the InterContinental Bali with the Norwegian community.",
      daysOffset: 8,
      hour: 18,
      durationHours: 3,
      location: "InterContinental Bali",
      capacity: 90,
      visibility: "PUBLIC",
      status: "PUBLISHED",
      imageIdx: 1,
      ticket: { name: "Free", price: 0, audience: "MEMBER" },
      rsvpCount: 14,
      isPaid: false,
    },
    {
      slug: "aquaculture-trip",
      title: "Aquaculture site visit — North Bali",
      description:
        "Two-day site visit to Fjord Aquaculture's RAS facility in Singaraja, North Bali. Includes a deep technical tour, dinner with the founders, and a session on Indonesian aquaculture policy under KKP rules.",
      daysOffset: 25,
      hour: 8,
      durationHours: 30,
      location: "Singaraja, Bali",
      capacity: 20,
      visibility: "MEMBERS_ONLY",
      status: "PUBLISHED",
      imageIdx: 2,
      ticket: { name: "Tour package", price: 5_000_000, audience: "MEMBER" },
      rsvpCount: 9,
      isPaid: true,
    },
    {
      slug: "esg-vietnam-q3",
      title: "ESG Indonesia Q3 update",
      description:
        "Quarterly update on ESG disclosure obligations under OJK rules for foreign-controlled entities in Indonesia. Hosted by DNV Indonesia.",
      daysOffset: 40,
      hour: 9,
      durationHours: 3,
      location: "Royal Norwegian Embassy, Jakarta",
      capacity: 50,
      visibility: "MEMBERS_ONLY",
      status: "PUBLISHED",
      imageIdx: 3,
      ticket: { name: "Workshop", price: 500_000, audience: "MEMBER" },
      rsvpCount: 6,
      isPaid: true,
    },
    {
      slug: "year-end-2026",
      title: "Year-end gala Norcham Bali",
      description:
        "Annual year-end gala. Awards, dinner, and Balinese dance under the stars at Four Seasons Jimbaran.",
      daysOffset: 55,
      hour: 19,
      durationHours: 5,
      location: "Four Seasons Resort Bali at Jimbaran Bay",
      capacity: 200,
      visibility: "MEMBERS_ONLY",
      status: "DRAFT",
      imageIdx: 4,
      ticket: { name: "Gala seat", price: 3_000_000, audience: "MEMBER" },
      rsvpCount: 0,
      isPaid: true,
    },
  ],
  fincham: [
    {
      slug: "independence-day-2025",
      title: "Finnish Independence Day reception Jakarta",
      description:
        "Formal reception celebrating Finland's Independence Day. Ambassador's remarks, Finnish chamber music, and a curated Finnish-Indonesian menu.",
      daysOffset: -48,
      hour: 18,
      durationHours: 4,
      location: "The Hermitage Hotel, Jakarta",
      capacity: 220,
      visibility: "MEMBERS_ONLY",
      status: "COMPLETED",
      imageIdx: 5,
      ticket: { name: "Reception", price: 750_000, audience: "MEMBER" },
      rsvpCount: 12,
      isPaid: true,
    },
    {
      slug: "telecom-briefing",
      title: "5G & telecom infrastructure briefing Indonesia",
      description:
        "Nokia walks through the state of 5G in Indonesia — spectrum auctions, Kominfo policy, and what Telkomsel, Indosat, and XL are planning for 2026-2028.",
      daysOffset: -15,
      hour: 8,
      durationHours: 2,
      location: "JW Marriott Jakarta",
      capacity: 80,
      visibility: "MEMBERS_ONLY",
      status: "COMPLETED",
      imageIdx: 6,
      ticket: { name: "Members", price: 250_000, audience: "MEMBER" },
      rsvpCount: 11,
      isPaid: true,
    },
    {
      slug: "spring-mixer-bkk",
      title: "Spring mixer Jakarta",
      description:
        "Casual mixer for Finnish and broader Nordic professionals in Jakarta.",
      daysOffset: 10,
      hour: 19,
      durationHours: 3,
      location: "Pullman Jakarta Indonesia",
      capacity: 100,
      visibility: "PUBLIC",
      status: "PUBLISHED",
      imageIdx: 7,
      ticket: { name: "Free", price: 0, audience: "MEMBER" },
      rsvpCount: 17,
      isPaid: false,
    },
    {
      slug: "boi-workshop",
      title: "BKPM workshop: 2026 investment incentives",
      description:
        "The Indonesian Investment Coordinating Board (BKPM) briefs us on revised incentives for foreign-owned manufacturers under the Positive Investment List. Salminen Legal walks through the application playbook.",
      daysOffset: 22,
      hour: 9,
      durationHours: 4,
      location: "Mandarin Oriental, Jakarta",
      capacity: 40,
      visibility: "MEMBERS_ONLY",
      status: "PUBLISHED",
      imageIdx: 0,
      ticket: { name: "Workshop", price: 600_000, audience: "MEMBER" },
      rsvpCount: 9,
      isPaid: true,
    },
    {
      slug: "kone-site-tour",
      title: "Kone elevator service hub site tour — Jakarta",
      description:
        "Behind-the-scenes tour of Kone's Jakarta service hub — see how high-rise lifts in Sudirman and SCBD are maintained at scale.",
      daysOffset: 36,
      hour: 14,
      durationHours: 3,
      location: "Kone Service Hub, Jakarta",
      capacity: 25,
      visibility: "MEMBERS_ONLY",
      status: "PUBLISHED",
      imageIdx: 1,
      ticket: { name: "Tour", price: 0, audience: "MEMBER" },
      rsvpCount: 6,
      isPaid: false,
    },
    {
      slug: "year-end-fincham",
      title: "Fincham year-end gala Bali",
      description: "Annual year-end gala with awards and dinner. Held in Bali for the 2026 edition.",
      daysOffset: 56,
      hour: 19,
      durationHours: 5,
      location: "InterContinental Bali",
      capacity: 200,
      visibility: "MEMBERS_ONLY",
      status: "DRAFT",
      imageIdx: 2,
      ticket: { name: "Gala seat", price: 1_500_000, audience: "MEMBER" },
      rsvpCount: 0,
      isPaid: true,
    },
  ],
};

// ---------- Forum threads per chamber ----------

interface PostSpec {
  authorIdx: number; // index into roster
  body: string;
  daysAgo: number;
}

interface ThreadSpec {
  slug: string;
  title: string;
  topic: string;
  authorIdx: number;
  daysAgo: number;
  posts: PostSpec[];
}

function buildThreads(chamber: ChamberSlug): ThreadSpec[] {
  const local = "Bahasa Indonesia";
  const cityName = CHAMBERS.find((c) => c.slug === chamber)!.city;

  return [
    {
      slug: "tutor-recommendation",
      title: `Best ${local} tutor in ${cityName}?`,
      topic: "Local life",
      authorIdx: 9,
      daysAgo: 12,
      posts: [
        { authorIdx: 9, body: `My daughter (10) is starting school here next term and I'd love to find a patient ${local} tutor who can come to our home twice a week. Anyone have someone they'd recommend?`, daysAgo: 12 },
        { authorIdx: 4, body: `We use Ibu Sari via the embassy — she's been with us for two years now. I'll DM you her contact.`, daysAgo: 11 },
        { authorIdx: 11, body: `+1 to using someone from the embassy network. They're vetted and stick around.`, daysAgo: 11 },
        { authorIdx: 9, body: `Thank you both! Got Ibu Sari's number, we're meeting next week.`, daysAgo: 8 },
      ],
    },
    {
      slug: "crypto-regulation-q1",
      title: "Crypto regulation update in Indonesia Q1 2026 — what are you doing?",
      topic: "Regulatory",
      authorIdx: 7,
      daysAgo: 9,
      posts: [
        { authorIdx: 7, body: `Bappebti and OJK published the joint digital asset framework last week. We're rewriting our compliance program from scratch. What's everyone else doing? Are you treating tokens as securities by default now?`, daysAgo: 9 },
        { authorIdx: 3, body: `From a legal perspective: yes, default-to-securities until you've got a written legal opinion saying otherwise. OJK has been aggressive on enforcement this quarter.`, daysAgo: 9 },
        { authorIdx: 14, body: `We've paused all new product launches involving any token-like instrument until our outside counsel signs off. Painful but necessary.`, daysAgo: 8 },
        { authorIdx: 5, body: `Worth reading the OJK guidance note from March — it's actually fairly pragmatic. Happy to share my markup.`, daysAgo: 7 },
        { authorIdx: 7, body: `Yes please, would love your markup.`, daysAgo: 7 },
      ],
    },
    {
      slug: "legal-counsel-recs",
      title: "Recommendations for legal counsel in Bali? (corporate / employment)",
      topic: "Operations",
      authorIdx: 11,
      daysAgo: 14,
      posts: [
        { authorIdx: 11, body: `We're scaling our Bali PT PMA from 4 to 25 staff this year and our current outside counsel can't really handle the volume. Looking for recommendations on a mid-sized firm that won't bill us for breathing.`, daysAgo: 14 },
        { authorIdx: 3, body: `Shameless plug for my own firm but we've actually built a fixed-fee package for exactly this stage. Happy to share scope.`, daysAgo: 13 },
        { authorIdx: 8, body: `We've used Holm & Larsen for two years and they're excellent. Their team is sharp on Indonesian employment matters specifically.`, daysAgo: 13 },
        { authorIdx: 11, body: `Thanks both! Will reach out.`, daysAgo: 12 },
      ],
    },
    {
      slug: "office-space-coworking",
      title: "Recommended Jakarta co-working spaces for client meetings?",
      topic: "Operations",
      authorIdx: 12,
      daysAgo: 7,
      posts: [
        { authorIdx: 12, body: `I work from home most days but need to host clients at a serious-looking venue 3-4 times a month. Anyone have a Jakarta co-working they love that has good meeting rooms with proper AV?`, daysAgo: 7 },
        { authorIdx: 6, body: `GoWork SCBD has great rooms but books out fast. I use them weekly.`, daysAgo: 6 },
        { authorIdx: 13, body: `If you're entertaining senior clients, the executive lounges at the Grand Hyatt Jakarta or Mandarin Oriental will rent meeting rooms by the hour and the experience is night-and-day.`, daysAgo: 6 },
        { authorIdx: 12, body: `Good call on the hotel route — hadn't thought of that.`, daysAgo: 5 },
      ],
    },
    {
      slug: "school-recs",
      title: "International school recs in Jakarta — middle school grades",
      topic: "Family",
      authorIdx: 10,
      daysAgo: 18,
      posts: [
        { authorIdx: 10, body: `We're moving in July and need to find a Jakarta school for our 12-year-old. IB or British curriculum preferred. Open to all suggestions.`, daysAgo: 18 },
        { authorIdx: 4, body: `Both my kids are at the British School Jakarta and we've been very happy. Strong pastoral care, good sports programs.`, daysAgo: 17 },
        { authorIdx: 8, body: `We chose the IB route at Jakarta Intercultural School — happy to chat through pros/cons if useful.`, daysAgo: 16 },
        { authorIdx: 10, body: `Thank you both — I'll DM you separately.`, daysAgo: 15 },
      ],
    },
    {
      slug: "renewable-tenders",
      title: "Bali long-term rental tips for relocating execs?",
      topic: "Local life",
      authorIdx: 13,
      daysAgo: 11,
      posts: [
        { authorIdx: 13, body: `Have a senior hire relocating to Canggu in two months. Looking for advice on agencies, fair leasehold pricing, and what to watch for in the contract. Any war stories appreciated.`, daysAgo: 11 },
        { authorIdx: 5, body: `Strongly recommend a written 3-year lease with a structured payment schedule, not the 1-year-paid-upfront norm. Saves a lot of friction at renewal.`, daysAgo: 10 },
        { authorIdx: 1, body: `We use a notaris to register every Bali villa lease over 12 months. Worth the IDR 5-7 juta for the certainty.`, daysAgo: 10 },
        { authorIdx: 13, body: `Helpful — let's grab a coffee next week to compare notes.`, daysAgo: 9 },
      ],
    },
  ];
}

// ---------- Knowledge articles per chamber ----------

interface ArticleSpec {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tags: string[];
  isPublic: boolean;
  imageIdx: number;
}

function paragraphs(parts: string[]): string {
  return parts.map((p) => p.trim()).join("\n\n");
}

function buildArticles(chamber: ChamberSlug): ArticleSpec[] {
  const country = CHAMBERS.find((c) => c.slug === chamber)!.country;

  if (chamber === "dancham") {
    return [
      {
        slug: "visa-rules-2026",
        title: "2026 visa rules for Danish nationals in Indonesia",
        excerpt: "A practical walk-through of the latest C-series and D-series visa categories, with checklists and known pitfalls.",
        tags: ["visa", "immigration", "compliance"],
        isPublic: true,
        imageIdx: 0,
        body: paragraphs([
          "Indonesia's Directorate General of Immigration finalised its new visa framework in late 2025, replacing the previous patchwork of social-cultural, business, and limited-stay permits with a cleaner C-series (short-stay) and D-series (long-stay) structure. For Danish nationals, the practical impact is mostly positive but there are several important transitional pitfalls.",
          "The C2 visa replaces the old B211A business visa for activities like attending meetings, signing contracts, or completing market visits. It now grants single-entry stays of up to 60 days and is fully online via the e-visa portal. Multiple-entry C2A variants are available for repeat visitors with a sponsor letter from a PT PMA or licensed Indonesian entity.",
          "For long-stay assignments, the D-series (KITAS) categories have been simplified to four main streams: investor (D1), professional (D2), spouse (D3), and retirement (D4). The investor route remains the smoothest for Danish founders deploying capital into a new PT PMA, with a minimum paid-up capital threshold confirmed at IDR 10 billion (down from the previously rumoured IDR 25 billion figure).",
          "A common pitfall: the new framework requires that all sponsor entities be registered in the OSS-RBA system with a current NIB. Several Danish companies have had visa applications rejected because their NIB had lapsed during the OSS migration. We recommend verifying NIB status before submitting any visa application.",
          "The Indonesian Investment Coordinating Board (BKPM) also tightened its scrutiny of nominee structures in 2025, and immigration is now cross-checking ownership against beneficial-owner filings. If your Indonesian operating entity uses a nominee arrangement, expect questions during the visa interview phase and ensure your beneficial-ownership filings are up to date.",
          "Renewals are now fully digital and can be initiated from 90 days before expiry. The chamber maintains a list of vetted visa agents who handle the end-to-end process for member companies — contact the secretariat for the current shortlist.",
          "Finally: the BPJS healthcare scheme enrollment is now mandatory for all KITAS holders within 30 days of arrival. Failure to enroll can complicate KITAS renewals. The chamber's HR working group has compiled a one-page enrollment guide that we can share on request.",
        ]),
      },
      {
        slug: "setting-up-pt-bali-2026",
        title: "Setting up a PT in Bali — 2026 update",
        excerpt: "Step-by-step playbook for incorporating a PT PMA in Bali, with current capital, licensing, and timing requirements.",
        tags: ["incorporation", "bali", "PT-PMA"],
        isPublic: true,
        imageIdx: 1,
        body: paragraphs([
          "Setting up a PT PMA in Bali in 2026 is meaningfully easier than three years ago, but a number of new sectoral restrictions have come into force that founders should understand before committing capital.",
          "Step one is sector classification under the latest KBLI 2025 codes. The Positive Investment List was updated in November 2025 with several sectors moved from 100% foreign ownership to mandatory local participation. The most affected for Danish founders are food retail (now requires 49% local ownership), and certain hospitality categories (boutique hotels under 50 rooms now require 33% local).",
          "Once your KBLI codes are finalised, the OSS-RBA registration takes 5-10 business days for a low-risk activity and 3-6 weeks for medium-risk. High-risk activities (most aquaculture, mining-adjacent processing, and certain logistics) still require a project-specific environmental impact assessment.",
          "The minimum paid-up capital is IDR 10 billion per business activity, with at least 25% deposited to a Bank Mandiri or BCA account before the deed of establishment is notarised. The capital can be deployed against operating expenses immediately after deposit verification, so this is not dead money.",
          "A frequent source of delays is the address requirement. Bali's regional government is enforcing the rule that PT PMA registered addresses must be commercially zoned. Co-working memberships count if the operator can issue a domisili letter on your behalf, but residential villa addresses no longer pass scrutiny.",
          "Tax registration follows incorporation and adds another 1-2 weeks. Plan for a total of 6-10 weeks from kickoff to fully-operational entity, longer if your activity requires a sectoral license.",
          "Member tip: several chamber members have used a phased approach — incorporating a vanilla advisory entity first to start operating, then adding KBLI codes for the operational activity once trading data justifies it. This is fully compliant and dramatically reduces time-to-revenue.",
        ]),
      },
      {
        slug: "tax-treaty-highlights",
        title: "Tax treaty highlights: Denmark-Indonesia 2026",
        excerpt: "What's actually useful in the Denmark-Indonesia double tax treaty, and where the gotchas are.",
        tags: ["tax", "treaty"],
        isPublic: false,
        imageIdx: 2,
        body: paragraphs([
          "The Denmark-Indonesia double tax treaty has been in force since 1985 and was last amended via protocol in 2009. While there's no major new amendment in 2026, the way Indonesian tax authorities interpret several articles has shifted meaningfully.",
          "Article 5 (permanent establishment) is the most operationally important. The Indonesian Tax Authority (DJP) is increasingly treating a co-working desk plus repeat client visits as creating a fixed-place PE, even where the Danish company has no Indonesian entity. The threshold is much lower than most cross-border practitioners assume.",
          "Article 10 (dividends) caps Indonesian withholding at 15% (or 10% if the Danish parent owns at least 25% of the Indonesian payer). To claim the treaty rate, the Indonesian payer must have a Form DGT on file from the Danish recipient, refreshed annually.",
          "Article 12 (royalties) caps withholding at 15%, but DJP's broad interpretation of 'royalty' frequently sweeps in software-as-a-service fees that Danish operators expect to be treated as services (Article 7). This is one of the biggest sources of unexpected tax bills.",
          "Article 25 (mutual agreement procedure) has actually been used successfully by several Danish chamber members in the past two years. If you're hit with a transfer-pricing adjustment that looks treaty-incompatible, MAP is a real path — though it takes 18-30 months.",
          "Practical tip: maintain a quarterly tax-residency confirmation routine for any Danish company drawing income from Indonesia. The cost is negligible and the audit defence value is significant.",
        ]),
      },
      {
        slug: "hiring-indonesian-staff",
        title: "Hiring Indonesian staff — the 2026 employment law refresher",
        excerpt: "What changed in Indonesian labour law since the omnibus reforms, and what every foreign employer needs to know.",
        tags: ["employment", "HR"],
        isPublic: false,
        imageIdx: 3,
        body: paragraphs([
          "The Cipta Kerja omnibus law has now been in force for several years and the courts have given us enough decisions to draw practical lessons. The biggest is that the formal-versus-informal distinction matters more than ever for severance liability.",
          "Permanent contracts (PKWTT) carry full Indonesian severance protection. Fixed-term contracts (PKWT) — which can now extend up to 5 years total — carry a compensation entitlement at the end equivalent to one month's salary per year of service. Most Danish employers we work with use PKWT for the first 12-24 months and convert to PKWTT once a hire has demonstrated fit.",
          "The minimum wage (UMP) is set provincially and Jakarta's 2026 figure is IDR 5.4 million per month. Most Danish-owned employers pay well above this floor, but you must still file the formal compliance certificate annually with the labour office.",
          "BPJS is mandatory for all employees regardless of nationality, including expats on KITAS. The combined employer contribution rate is approximately 10.74% of monthly wages.",
          "Termination remains the area of highest legal risk. The recent Constitutional Court decisions have re-established mandatory pre-termination negotiation steps, and skipping them now creates strong grounds for a wrongful-dismissal claim. Even for clear underperformance cases, plan for a 30-60 day structured PIP process before any termination conversation.",
          "The chamber's HR working group meets quarterly and maintains a working group of HR leads from member companies — contact the secretariat to be added to the WhatsApp group.",
        ]),
      },
    ];
  }

  if (chamber === "sweacham") {
    return [
      {
        slug: "sg-employment-pass-2026",
        title: "2026 visa rules for Swedish nationals in Indonesia",
        excerpt: "A practical walk-through of KITAS categories and pitfalls for Swedish employers placing staff in Jakarta and Bali.",
        tags: ["visa", "KITAS", "immigration"],
        isPublic: true,
        imageIdx: 0,
        body: paragraphs([
          "Indonesia's Directorate General of Immigration finalised its new visa framework in late 2025, and Swedish-headquartered companies placing staff in Jakarta or Bali now have a much cleaner C-series and D-series structure to work with.",
          "The C2 visa replaces the old B211A business visa for activities like attending meetings, signing contracts, or completing market visits. It now grants single-entry stays of up to 60 days and is fully online via the e-visa portal.",
          "For long-stay assignments, the D-series (KITAS) categories have been simplified to four streams: investor (D1), professional (D2), spouse (D3), and retirement (D4). The investor route remains the smoothest for Swedish founders deploying capital into a new PT PMA.",
          "A common pitfall: the new framework requires that all sponsor entities be registered in the OSS-RBA system with a current NIB. Several Swedish companies have had visa applications rejected because their NIB had lapsed during the OSS migration.",
          "BPJS healthcare scheme enrollment is mandatory for all KITAS holders within 30 days of arrival. Failure to enroll can complicate KITAS renewals.",
          "The chamber maintains a list of vetted visa agents who handle the end-to-end process for member companies — contact the secretariat for the current shortlist.",
        ]),
      },
      {
        slug: "fta-sweden-singapore",
        title: "EFTA-Indonesia trade agreement: the underutilised tariff advantages",
        excerpt: "Most Swedish exporters to Indonesia are leaving money on the table by not claiming preferential origin under the modernised EFTA framework.",
        tags: ["trade", "FTA", "tariffs"],
        isPublic: true,
        imageIdx: 1,
        body: paragraphs([
          "The EFTA-Indonesia Comprehensive Economic Partnership Agreement entered into force in 2021 and has been in operation long enough that we have real-world data on where Swedish exporters are leaving value on the table.",
          "The agreement covers virtually all industrial goods and most processed agricultural products. Tariff savings range from 1-25% depending on the HS code, which adds up quickly over a year's worth of shipments to Tanjung Priok.",
          "Claiming preferential origin requires a movement certificate (EUR.1) for each consignment, or — for approved exporters — an origin declaration on the commercial invoice. Becoming an approved exporter takes 4-6 weeks via Swedish Customs and dramatically simplifies day-to-day shipping.",
          "Origin rules are HS-specific. For most manufactured goods, the rule is either a change of tariff heading or a maximum third-country content threshold.",
          "Practical tip: complex multi-component products warrant a one-time origin opinion from a customs broker familiar with the Indonesian Bea Cukai interpretation. Cost is typically EUR 800-1,500 and you can reuse the opinion for years.",
        ]),
      },
      {
        slug: "klarna-fintech-license",
        title: "OJK fintech licensing for Swedish operators in Indonesia",
        excerpt: "Indonesia's payments and lending licensing framework explained, with practical timing and cost expectations.",
        tags: ["fintech", "OJK", "licensing"],
        isPublic: false,
        imageIdx: 2,
        body: paragraphs([
          "Indonesia's payments licensing under Bank Indonesia and lending licensing under OJK is one of the more substantive fintech regimes in Southeast Asia. For Swedish fintech operators looking to launch in Indonesia, sequencing the licenses correctly is critical.",
          "The PJSP (Payment Service Provider) license under PBI 23/6/2021 covers e-money issuance, payment processing, and merchant acquisition. The application is substantive — typically 200-400 pages of policies, financial projections, and technology architecture — and the BI engagement process runs 8-14 months from initial submission to in-principle approval.",
          "The base capital requirement starts at IDR 3 billion for narrow categories and IDR 15 billion for full-scope PJSP. AML/CFT controls and the technology risk management framework are where most applications spend the most reviewer attention.",
          "Pre-application engagement with BI and OJK is now standard practice and we strongly recommend it. The meetings help surface jurisdictional preferences (e.g. preferred local custodian arrangements) before you spend months on a structure the regulators would have rejected.",
          "Total all-in costs for a clean PJSP application from a Swedish parent typically run EUR 250,000-500,000 including external counsel, technology consultants, and the application fee.",
        ]),
      },
      {
        slug: "data-protection-pdpa",
        title: "Indonesian PDP Law in 2026: practical compliance for Swedish-owned operations",
        excerpt: "Indonesia's Personal Data Protection Law is now fully in force. Here's what the practical compliance posture looks like.",
        tags: ["data", "PDP", "compliance"],
        isPublic: false,
        imageIdx: 3,
        body: paragraphs([
          "Indonesia's Personal Data Protection Law (UU PDP) was enacted in 2022 with a two-year transition period that has now ended. Enforcement by the Ministry of Communication and Digital is ramping up across 2026.",
          "Swedish-headquartered organisations are typically already running GDPR-grade processes, so UU PDP compliance is rarely a heavy lift. The main areas where we see gaps are: Indonesia-specific consent management (separate consents for marketing channels), and data localisation expectations for certain categories of public-interest data.",
          "Mandatory breach notification kicks in for any breach involving personal data of Indonesian data subjects. The notification deadline is 72 hours to the regulator and to affected individuals. Most Swedish parents have folded this into their existing GDPR breach playbook.",
          "Cross-border transfers require either (a) the destination country having an adequate level of protection as recognised by the regulator, (b) a binding intra-group agreement, or (c) the data subject's explicit consent.",
          "Fines under UU PDP are now up to 2% of annual revenue, capped at IDR 60 billion per violation. The Ministry has signalled it will use its penalty powers against high-profile violators in 2026.",
        ]),
      },
    ];
  }

  if (chamber === "norcham") {
    return [
      {
        slug: "vietnam-investment-2026",
        title: "Setting up a PT in Bali — 2026 update for Norwegian investors",
        excerpt: "Indonesia's Positive Investment List was updated in late 2025. Here's what Norwegian investors need to know before incorporating in Bali.",
        tags: ["FDI", "PT-PMA", "Bali"],
        isPublic: true,
        imageIdx: 0,
        body: paragraphs([
          "Setting up a PT PMA in Bali in 2026 is meaningfully easier than three years ago, but a number of new sectoral restrictions affect Norwegian-owned operations specifically.",
          "Step one is sector classification under the latest KBLI 2025 codes. The Positive Investment List was updated in November 2025 with several sectors moved from 100% foreign ownership to mandatory local participation — most notably food retail and certain hospitality categories.",
          "Once your KBLI codes are finalised, the OSS-RBA registration takes 5-10 business days for a low-risk activity and 3-6 weeks for medium-risk. High-risk activities (most aquaculture, mining-adjacent processing) still require a project-specific environmental impact assessment.",
          "The minimum paid-up capital is IDR 10 billion per business activity, with at least 25% deposited to a Bank Mandiri or BCA account before the deed of establishment is notarised.",
          "A frequent source of delays is the address requirement. Bali's regional government is enforcing the rule that PT PMA registered addresses must be commercially zoned. Co-working memberships count if the operator can issue a domisili letter on your behalf.",
          "Member tip: several chamber members have used a phased approach — incorporating a vanilla advisory entity first to start operating, then adding KBLI codes for the operational activity once trading data justifies it.",
        ]),
      },
      {
        slug: "offshore-wind-vietnam",
        title: "Offshore wind in Indonesia: the 2026 PLN PPA framework",
        excerpt: "Indonesia's RUPTL 2025-2034 sets ambitious offshore wind targets. The PLN PPA framework finally has enough detail to model.",
        tags: ["energy", "offshore-wind", "PPA"],
        isPublic: true,
        imageIdx: 1,
        body: paragraphs([
          "Indonesia's RUPTL 2025-2034 targets meaningful offshore wind capacity by 2030, anchored by pilot projects in the Java Sea. After several years of regulatory uncertainty, the PLN PPA framework finally has enough operational detail to support real project finance.",
          "The standard offshore wind PPA is now a 25-year fixed-price contract with PLN as the offtaker. The current ceiling tariff is set under Permen ESDM 112/2022 and revised annually.",
          "Grid connection responsibility sits with the developer, which is a meaningful capex line for projects more than 10 km offshore. PLN provides indicative interconnection studies but the developer is responsible for HVAC/HVDC export systems.",
          "Foreign ownership of offshore wind projects is permitted up to 100% in most cases, but the seabed lease process is bureaucratic and provincial-government-led. Equinor, Ørsted, and Vestas are tracking 14-24 month timelines from MOU to seabed concession.",
          "Local content requirements (TKDN) apply at a lower threshold for offshore wind than for solar. The Norwegian-Indonesian Energy Working Group is actively engaging ESDM on a workable framework that supports both technology transfer and project bankability.",
        ]),
      },
      {
        slug: "aquaculture-licensing",
        title: "Aquaculture licensing in Bali and East Java",
        excerpt: "RAS (recirculating aquaculture system) facilities are licensed differently from open-net farming under KKP rules. Here's the playbook.",
        tags: ["aquaculture", "RAS", "Bali"],
        isPublic: false,
        imageIdx: 2,
        body: paragraphs([
          "Indonesia's coastal provinces — particularly Bali, East Java, and South Sulawesi — are the main hubs for Norwegian-led recirculating aquaculture system (RAS) projects. The licensing process differs meaningfully from open-net farming under the Ministry of Marine Affairs and Fisheries (KKP).",
          "RAS facilities are land-based and trigger a standard industrial-zone licensing path: NIB via OSS-RBA, environmental approval (Persetujuan Lingkungan), construction permit (PBG), and operational license (SIUP/SIUPB). Total timeline is 12-18 months from site selection to first stocking.",
          "Sea-based licensing (cage farming) requires a separate marine zone allocation under the provincial RZWP-3-K and an environmental approval scoped to marine ecosystems. The process is longer and outcomes are less predictable.",
          "Norwegian-owned RAS operators may benefit from preferential corporate income tax under the BKPM tax holiday and tax allowance facilities. The condition is that the project is classified as a pioneer industry and meets the minimum investment threshold.",
          "Brackish-water source licensing is required and processed by the provincial environmental agency. Water rights are not separately licensed for RAS facilities (which recirculate >95% of water).",
        ]),
      },
      {
        slug: "shipping-vietnam",
        title: "Tax treaty highlights: Norway-Indonesia",
        excerpt: "What's actually useful in the Norway-Indonesia double tax treaty, and where the gotchas are for Norwegian operations in Bali and Jakarta.",
        tags: ["tax", "treaty"],
        isPublic: false,
        imageIdx: 3,
        body: paragraphs([
          "The Norway-Indonesia double tax treaty has been in force since 1990 and has not been substantively amended. Practical interpretation by the Indonesian Tax Authority (DJP) has shifted in several ways relevant to Norwegian-owned operations.",
          "Article 5 (PE) interpretation has tightened. DJP is increasingly treating a co-working desk plus repeat client visits as creating a fixed-place PE, even where the Norwegian company has no Indonesian entity. The threshold is much lower than most cross-border practitioners assume.",
          "Article 10 (dividends) caps Indonesian withholding at 15% (or 10% if the Norwegian parent owns at least 25% of the Indonesian payer). To claim the treaty rate, the Indonesian payer must have a Form DGT on file from the Norwegian recipient, refreshed annually.",
          "Article 12 (royalties) caps withholding at 15%, but DJP's broad interpretation of 'royalty' frequently sweeps in software-as-a-service fees that Norwegian operators expect to be treated as services (Article 7).",
          "Article 25 (mutual agreement procedure) has been used successfully by several Norwegian chamber members in the past two years. If you're hit with a transfer-pricing adjustment that looks treaty-incompatible, MAP is a real path — though it takes 18-30 months.",
        ]),
      },
    ];
  }

  // fincham
  return [
    {
      slug: "boi-incentives-2026",
      title: "BKPM incentives 2026: what changed for Finnish manufacturers in Indonesia",
      excerpt: "Indonesia's BKPM revised its tax holiday and tax allowance lists for 2026. Most changes favour high-tech and green manufacturing.",
      tags: ["BKPM", "incentives", "manufacturing"],
      isPublic: true,
      imageIdx: 0,
      body: paragraphs([
        "The Indonesian Investment Coordinating Board (BKPM) revised its tax holiday and tax allowance facility lists effective January 2026. The headline changes meaningfully favour high-tech and green manufacturing sectors where Finnish operators are particularly competitive.",
        "The pioneer industry tax holiday now offers up to 20 years of corporate income tax exemption for very large investments and 5-15 years for medium investments — covering advanced telecommunications equipment, specialty chemicals, biotech, and electric vehicle components.",
        "Smart electronics manufacturing — a category where Nokia and several Finnish supply-chain partners operate — is now eligible for an additional R&D super-deduction if the project commits to local R&D spending of at least IDR 100 billion over the first 5 years.",
        "Green project incentives have been broadened. Solar, wind, and waste-to-energy projects qualify for the tax allowance facility plus accelerated depreciation. The category also now explicitly covers green hydrogen and carbon capture installations.",
        "The local content requirements (TKDN) have been simplified into three bands (low, medium, high) replacing the previous percentage-by-percentage scoring. The simplification has been welcomed by chamber members.",
        "Application timelines remain at 60-90 days for standard categories. For pioneer industry status, BKPM has committed to a 45-day decision target — but actual experience varies.",
      ]),
    },
    {
      slug: "thai-employment-2026",
      title: "Hiring Indonesian talent: practical guide for Finnish-owned employers",
      excerpt: "Several incremental changes to leave entitlements and severance under Cipta Kerja — practical guidance for Finnish-owned employers in Indonesia.",
      tags: ["employment", "HR", "Indonesia"],
      isPublic: true,
      imageIdx: 1,
      body: paragraphs([
        "Indonesian labour law has stabilised after the Cipta Kerja omnibus reforms and the courts have given us enough decisions to draw practical lessons. The biggest is that the formal-versus-informal distinction matters more than ever for severance liability.",
        "Permanent contracts (PKWTT) carry full Indonesian severance protection. Fixed-term contracts (PKWT) — which can extend up to 5 years total — carry a compensation entitlement at the end equivalent to one month's salary per year of service. Most Finnish employers we work with use PKWT for the first 12-24 months and convert to PKWTT once a hire has demonstrated fit.",
        "The minimum wage (UMP) is set provincially. Jakarta's 2026 figure is IDR 5.4 million per month. Finnish-owned employers typically pay well above this floor, but you must still file the formal compliance certificate annually with the labour office.",
        "BPJS is mandatory for all employees regardless of nationality, including expats on KITAS. The combined employer contribution rate is approximately 10.74% of monthly wages.",
        "Termination remains the area of highest legal risk. Even for clear underperformance cases, plan for a 30-60 day structured PIP process before any termination conversation.",
      ]),
    },
    {
      slug: "tax-treaty-fi-th",
      title: "Tax treaty highlights: Finland-Indonesia",
      excerpt: "What's actually useful in the Finland-Indonesia tax treaty, with practical examples from chamber members.",
      tags: ["tax", "treaty"],
      isPublic: false,
      imageIdx: 2,
      body: paragraphs([
        "The Finland-Indonesia double tax treaty has been in force since 1989 and has not been substantively amended. Practical interpretation by the Indonesian Tax Authority (DJP) has shifted in several ways relevant to Finnish-owned operations.",
        "Article 5 (PE) interpretation has tightened. DJP now treats secondment arrangements where Finnish staff spend more than 90 days per year in Indonesia as creating a service PE for the Finnish entity, even where the Indonesian entity reimburses costs. Several chamber members have received tax assessments on this basis.",
        "Article 10 (dividends) caps Indonesian withholding at 15% with a 10% reduced rate where the Finnish parent owns at least 25% of the Indonesian payer. Form DGT must be on file before each dividend payment.",
        "Article 12 (royalties) caps withholding at 15%. Software-as-a-service is increasingly treated as a royalty by Indonesian tax authorities — a less favourable interpretation than the Finnish position. This is one of the bigger sources of unexpected tax bills.",
        "Article 25 (MAP) is available but is rarely the right tool for individual taxpayer disputes. For corporate transfer-pricing disputes, MAP is genuinely useful and has been used by at least one chamber member with a successful outcome.",
      ]),
    },
    {
      slug: "thai-real-estate",
      title: "Banking in Indonesia for Finnish business",
      excerpt: "Opening corporate accounts, managing IDR liquidity, and the practical realities of Indonesian banking for Finnish-owned PT PMA operations.",
      tags: ["banking", "treasury"],
      isPublic: false,
      imageIdx: 3,
      body: paragraphs([
        "Indonesian banking is meaningfully different from the Finnish corporate banking experience, and Finnish-owned PT PMA operations regularly underestimate the operational lift required.",
        "Corporate account opening: the four state-owned banks (Bank Mandiri, BRI, BNI, BTN) and a handful of private banks (BCA, CIMB Niaga, Permata) handle the bulk of foreign-owned PT PMA accounts. Onboarding takes 4-8 weeks and requires the full corporate document set including BKPM IRC, NIB, and beneficial-ownership filings.",
        "Multi-currency operations: most Indonesian banks support IDR, USD, EUR, and SGD accounts. Direct EUR clearing remains weak — most Finnish operations route EUR settlements via a correspondent bank in Singapore or Frankfurt.",
        "Bank Indonesia regulations require all transactions inside Indonesia to be denominated in IDR (with limited carve-outs for export-oriented activities). Pricing in EUR or USD on internal Indonesian invoices triggers regulatory issues.",
        "Tax payments: most corporate income tax, VAT, and withholding tax payments are now routed through the DJP Online portal with auto-debit from a designated bank account. Set this up early — the manual fallback is painful.",
        "Credit facilities: Indonesian banks generally require local collateral for IDR credit lines. Finnish parents that want to use a parent guarantee instead should expect 6-12 weeks of negotiation and a meaningful interest premium.",
      ]),
    },
  ];
}

// ---------- Marketplace listings per chamber ----------

interface ListingSpec {
  slug: string; // unused for unique key; we use deterministic id instead
  title: string;
  category: string;
  description: string;
  priceFrom: number;
  isFeatured: boolean;
  imageIdx: number;
  sellerIdx: number;
}

function buildListings(chamber: ChamberSlug): ListingSpec[] {
  if (chamber === "dancham") {
    return [
      { slug: "holm-larsen-corporate", title: "Holm & Larsen Legal — corporate counsel package", category: "Legal", description: "Fixed-fee monthly retainer for early-stage PT PMA operations. Covers contract review, employment matters, and quarterly compliance check-ins.", priceFrom: 8_500_000, isFeatured: true, imageIdx: 0, sellerIdx: 3 },
      { slug: "rahmawati-tax", title: "Rahmawati & Co — cross-border tax advisory", category: "Accounting", description: "Specialist tax advisory for Danish-owned PTs. Includes monthly bookkeeping, quarterly VAT, and annual income tax filings.", priceFrom: 4_500_000, isFeatured: false, imageIdx: 1, sellerIdx: 14 },
      { slug: "sutanto-translation", title: "Rina Sutanto — sworn translation EN/ID/DA", category: "Translation", description: "Legal-grade sworn translation services for notarial documents, contracts, and immigration paperwork.", priceFrom: 750_000, isFeatured: false, imageIdx: 2, sellerIdx: 12 },
      { slug: "amanda-pr", title: "Amanda & Co Communications — PR launch package", category: "Marketing", description: "8-week PR launch campaign for Nordic brands entering Indonesia. Includes media list, press release, and 4 placements.", priceFrom: 35_000_000, isFeatured: false, imageIdx: 3, sellerIdx: 19 },
      { slug: "kristiansen-arch", title: "Anders Kristiansen — sustainable architecture", category: "Real Estate", description: "Architectural design for net-zero residential and small commercial buildings in tropical climates.", priceFrom: 50_000_000, isFeatured: false, imageIdx: 4, sellerIdx: 9 },
    ];
  }

  if (chamber === "sweacham") {
    return [
      { slug: "skandia-legal-package", title: "Skandia Legal — Indonesia startup legal package", category: "Legal", description: "Fixed-fee startup package for Swedish-owned PT PMA: incorporation, founder agreements, employee equity, and first 6 months of contract review.", priceFrom: 12_000_000, isFeatured: true, imageIdx: 0, sellerIdx: 9 },
      { slug: "lim-bergman-tax", title: "Wulandari & Bergman — Indonesian tax & treasury", category: "Accounting", description: "Comprehensive tax structuring and treasury setup for Swedish-owned PT PMA operations in Indonesia.", priceFrom: 8_500_000, isFeatured: false, imageIdx: 1, sellerIdx: 15 },
      { slug: "young-pr", title: "Isabella Harahap — Jakarta luxury PR services", category: "Marketing", description: "Boutique PR for Nordic luxury brands launching in Indonesia. 12-week campaign with Jakarta and Bali media coverage.", priceFrom: 45_000_000, isFeatured: false, imageIdx: 2, sellerIdx: 17 },
      { slug: "nordlys-advisory", title: "Nordlys Capital — Indonesia M&A advisory", category: "Finance", description: "Boutique M&A advisory for cross-border deals into Indonesia up to USD 100M. Sell-side and buy-side mandates.", priceFrom: 80_000_000, isFeatured: false, imageIdx: 3, sellerIdx: 18 },
      { slug: "lindqvist-cfo", title: "Henrik Lindqvist — fractional CFO Indonesia", category: "Finance", description: "Fractional CFO services for Nordic-founded PT PMA startups in Jakarta and Bali. 1-3 days per week engagement.", priceFrom: 20_000_000, isFeatured: false, imageIdx: 4, sellerIdx: 11 },
    ];
  }

  if (chamber === "norcham") {
    return [
      { slug: "nordeng-maritime", title: "Nordeng Maritime Law — Indonesia shipping disputes", category: "Legal", description: "Specialist shipping and maritime arbitration in Indonesian forums. Charter party, cargo claims, and marine insurance disputes.", priceFrom: 15_000_000, isFeatured: true, imageIdx: 0, sellerIdx: 3 },
      { slug: "pham-solberg-tax", title: "Dewi & Solberg — Indonesian corporate tax", category: "Accounting", description: "Indonesian corporate tax with cross-border specialty for Norwegian-owned PT PMA operations.", priceFrom: 8_500_000, isFeatured: false, imageIdx: 1, sellerIdx: 10 },
      { slug: "berge-solar-design", title: "Berge Solar — rooftop solar design & install (Indonesia)", category: "Energy", description: "Turnkey rooftop solar for industrial parks and warehouses across West and East Java.", priceFrom: 250_000_000, isFeatured: false, imageIdx: 2, sellerIdx: 11 },
      { slug: "dahl-consulting", title: "Petter Dahl — Indonesia market entry consulting", category: "Consulting", description: "Helps Norwegian SMEs assess and enter the Indonesian market. Discovery, partner identification, BKPM filing, and entity setup.", priceFrom: 75_000_000, isFeatured: false, imageIdx: 3, sellerIdx: 15 },
      { slug: "haug-design", title: "Kristine Haug — Bali hospitality branding", category: "Design", description: "Brand identity design for Bali hospitality, F&B, and retail businesses with Scandinavian sensibility.", priceFrom: 45_000_000, isFeatured: false, imageIdx: 4, sellerIdx: 12 },
    ];
  }

  // fincham
  return [
    { slug: "salminen-foreign-investment", title: "Salminen Legal — BKPM application package", category: "Legal", description: "End-to-end BKPM tax holiday application for Finnish manufacturers in Indonesia. Eligibility analysis, application drafting, and approval support.", priceFrom: 75_000_000, isFeatured: true, imageIdx: 0, sellerIdx: 3 },
    { slug: "kpmg-natthapong", title: "Rangga Pratama — Indonesia tax advisory", category: "Accounting", description: "Personal tax advisory for Finnish executives in Indonesia. Annual SPT filings and Finland-Indonesia treaty optimisation.", priceFrom: 12_000_000, isFeatured: false, imageIdx: 1, sellerIdx: 11 },
    { slug: "northern-lights-visa", title: "Garuda Visa — Indonesia visa & work permit assistance", category: "Visa & Immigration", description: "End-to-end KITAS, IMTA, and dependent visa services for Finnish executives and their families in Indonesia.", priceFrom: 9_500_000, isFeatured: false, imageIdx: 2, sellerIdx: 12 },
    { slug: "sirisak-translation", title: "Anggraini Translations — Bahasa Indonesia/FI/EN sworn translation", category: "Translation", description: "Sworn translation of legal documents, contracts, and immigration paperwork between Bahasa Indonesia, Finnish, and English.", priceFrom: 1_500_000, isFeatured: false, imageIdx: 3, sellerIdx: 8 },
    { slug: "thong-aho-pr", title: "Suryani & Aho Communications — Indonesia market PR", category: "Marketing", description: "Brand PR and media relations for Nordic-owned brands launching in Indonesia. Jakarta and Bali coverage.", priceFrom: 28_000_000, isFeatured: false, imageIdx: 4, sellerIdx: 16 },
  ];
}

// ---------- Motions per chamber ----------

interface MotionSpec {
  slug: string;
  title: string;
  body: string;
  status: "OPEN" | "PASSED" | "REJECTED" | "WITHDRAWN";
  daysAgo: number;
  proposedByIdx: number;
  yesVotes: number;
  noVotes: number;
  abstainVotes: number;
}

function buildMotions(): MotionSpec[] {
  return [
    {
      slug: "adopt-2026-budget",
      title: "Adopt the 2026 chamber budget",
      body: "The board hereby adopts the 2026 operating budget as presented in Appendix A, totalling IDR 7.2 billion in revenue and IDR 6.7 billion in operating expenses. Reserves at year-end projected at IDR 3.2 billion (48% of opex).",
      status: "PASSED",
      daysAgo: 28,
      proposedByIdx: 0,
      yesVotes: 5,
      noVotes: 0,
      abstainVotes: 1,
    },
    {
      slug: "approve-corporate-sponsor",
      title: "Approve Multi Bintang sponsor agreement",
      body: "Approve the 12-month gold-tier corporate sponsorship agreement with Multi Bintang Indonesia (Carlsberg Group), as negotiated and presented by the Executive Director. Total sponsorship value IDR 1.1 billion over 12 months, with naming rights on the annual gala and prominent visibility on chamber communications.",
      status: "PASSED",
      daysAgo: 18,
      proposedByIdx: 1,
      yesVotes: 4,
      noVotes: 1,
      abstainVotes: 1,
    },
    {
      slug: "raise-membership-fees",
      title: "Expand to Surabaya satellite chapter",
      body: "Authorise the Executive Director to launch a Surabaya satellite chapter in Q3 2026, with a dedicated coordinator funded from the corporate sponsorship surplus. Aim for 25 founding members from East Java.",
      status: "OPEN",
      daysAgo: 4,
      proposedByIdx: 2,
      yesVotes: 0,
      noVotes: 0,
      abstainVotes: 0,
    },
    {
      slug: "esg-policy-2026",
      title: "Adopt the chamber's first ESG policy statement",
      body: "Adopt the ESG policy statement as drafted by the Sustainability Working Group, committing the chamber to net-zero Indonesian operations by 2030 and to maintaining at least 40% gender balance on the board and standing committees.",
      status: "PASSED",
      daysAgo: 50,
      proposedByIdx: 5,
      yesVotes: 6,
      noVotes: 0,
      abstainVotes: 0,
    },
    {
      slug: "merger-with-nordic-business-club",
      title: "Joint Indonesia trade mission with sister Nordic chambers",
      body: "Authorise the Executive Director to co-organise a joint Indonesia trade mission with the three sister Nordic chambers (sweacham, norcham, fincham) for Q4 2026, targeting Jakarta and Bali, with shared logistics costs and a unified Nordic-Indonesia business forum.",
      status: "REJECTED",
      daysAgo: 38,
      proposedByIdx: 4,
      yesVotes: 1,
      noVotes: 4,
      abstainVotes: 1,
    },
  ];
}

// ---------- Communication log templates ----------

const COMM_TEMPLATES: { templateKey: string; channel: "EMAIL" | "WHATSAPP"; subject: string }[] = [
  { templateKey: "welcome", channel: "EMAIL", subject: "Welcome to the chamber" },
  { templateKey: "renewal_notice", channel: "EMAIL", subject: "Your membership is up for renewal" },
  { templateKey: "event_reminder:T-1d", channel: "WHATSAPP", subject: "Event tomorrow" },
  { templateKey: "event_reminder:T-1h", channel: "WHATSAPP", subject: "Event in 1 hour" },
  { templateKey: "event_followup", channel: "EMAIL", subject: "Thanks for joining" },
  { templateKey: "invoice_issued", channel: "EMAIL", subject: "New invoice" },
  { templateKey: "invoice_reminder", channel: "EMAIL", subject: "Friendly invoice reminder" },
  { templateKey: "newsletter_monthly", channel: "EMAIL", subject: "Monthly newsletter" },
  { templateKey: "board_packet", channel: "EMAIL", subject: "Board meeting packet" },
  { templateKey: "application_received", channel: "EMAIL", subject: "We received your application" },
];

const AUDIT_ACTIONS: string[] = [
  "application.approved",
  "application.rejected",
  "membership.created",
  "membership.updated",
  "membership.renewed",
  "membership.lapsed",
  "ticket.checked_in",
  "ticket.refunded",
  "event.published",
  "event.cancelled",
  "motion.created",
  "motion.passed",
  "invoice.created",
  "invoice.marked_paid",
  "knowledge.published",
  "communication.sent",
  "company.added",
  "marketplace.listed",
];

// ---------- Per-chamber seeder ----------

interface SeederResult {
  slug: ChamberSlug;
  members: number;
  events: number;
  articles: number;
  motions: number;
}

interface SeederContext {
  chamber: { id: string; slug: string };
  spec: ChamberSpec;
  operatorId: string;
  tierIdByName: Record<string, string>;
  userIdByEmail: Map<string, string>; // chamber-roster only
  userIdsOrdered: string[]; // ordered by roster index
  companyIdByKey: Map<string, string>;
}

async function seedChamber(spec: ChamberSpec, operatorId: string): Promise<SeederResult> {
  const chamberId = `demo-chamber-${spec.slug}`;

  const chamber = await prisma.chamber.upsert({
    where: { slug: spec.slug },
    update: {
      name: spec.name,
      country: spec.country,
      city: spec.city,
      currency: spec.currency,
      brandColor: spec.brandColor,
      tagline: spec.tagline,
      heroImageUrl: spec.heroImageUrl,
      logoUrl: spec.logoUrl,
      status: "ACTIVE",
    },
    create: {
      id: chamberId,
      slug: spec.slug,
      name: spec.name,
      country: spec.country,
      city: spec.city,
      currency: spec.currency,
      brandColor: spec.brandColor,
      tagline: spec.tagline,
      heroImageUrl: spec.heroImageUrl,
      logoUrl: spec.logoUrl,
      status: "ACTIVE",
      licenseFee: 0,
      txFeeBps: 500,
    },
    select: { id: true, slug: true },
  });

  const ctx: SeederContext = {
    chamber,
    spec,
    operatorId,
    tierIdByName: {},
    userIdByEmail: new Map(),
    userIdsOrdered: [],
    companyIdByKey: new Map(),
  };

  await seedTiers(ctx);
  await seedCompanies(ctx);
  await seedMembers(ctx);
  await seedOperatorMembership(ctx);
  await seedApplication(ctx);
  await seedEvents(ctx);
  await seedForum(ctx);
  await seedKnowledge(ctx);
  await seedMarketplace(ctx);
  await seedMotions(ctx);
  await seedCommunications(ctx);
  await seedAudit(ctx);

  const members = ROSTERS[spec.slug].length;
  const events = EVENTS[spec.slug].length;
  const articles = buildArticles(spec.slug).length;
  const motions = buildMotions().length;

  console.log(
    `[seed] ${spec.slug} — ${members} members, ${events} events, ${articles} articles, ${motions} motions`,
  );

  return { slug: spec.slug, members, events, articles, motions };
}

async function seedTiers(ctx: SeederContext): Promise<void> {
  const standard = await prisma.membershipTier.upsert({
    where: { chamberId_name: { chamberId: ctx.chamber.id, name: "Standard" } },
    update: { price: new Prisma.Decimal(ctx.spec.standardPrice), description: "Individual business membership" },
    create: {
      id: `demo-tier-${ctx.spec.slug}-standard`,
      chamberId: ctx.chamber.id,
      name: "Standard",
      description: "Individual business membership",
      price: new Prisma.Decimal(ctx.spec.standardPrice),
      durationDays: 365,
      benefits: { includes: ["All chamber events", "Member directory", "Knowledge library", "Forum access"] },
    },
    select: { id: true },
  });

  const corporate = await prisma.membershipTier.upsert({
    where: { chamberId_name: { chamberId: ctx.chamber.id, name: "Corporate" } },
    update: { price: new Prisma.Decimal(ctx.spec.corporatePrice), description: "Company seat with multiple employees" },
    create: {
      id: `demo-tier-${ctx.spec.slug}-corporate`,
      chamberId: ctx.chamber.id,
      name: "Corporate",
      description: "Company seat with multiple employees",
      price: new Prisma.Decimal(ctx.spec.corporatePrice),
      durationDays: 365,
      benefits: { includes: ["Up to 10 named seats", "Logo placement", "Speaking opportunities", "Sponsorship priority"] },
    },
    select: { id: true },
  });

  ctx.tierIdByName.Standard = standard.id;
  ctx.tierIdByName.Corporate = corporate.id;
}

async function seedCompanies(ctx: SeederContext): Promise<void> {
  for (const company of COMPANIES[ctx.spec.slug]) {
    const id = `demo-company-${ctx.spec.slug}-${company.key}`;
    await prisma.company.upsert({
      where: { id },
      update: {
        name: company.name,
        industry: company.industry,
        country: company.country,
        seats: company.seats,
      },
      create: {
        id,
        chamberId: ctx.chamber.id,
        name: company.name,
        industry: company.industry,
        country: company.country,
        seats: company.seats,
      },
    });
    ctx.companyIdByKey.set(company.key, id);
  }
}

async function seedMembers(ctx: SeederContext): Promise<void> {
  const roster = ROSTERS[ctx.spec.slug];
  for (const def of roster) {
    const user = await upsertUser(def);
    ctx.userIdByEmail.set(def.email, user.id);
    ctx.userIdsOrdered.push(user.id);

    const tierId = ctx.tierIdByName[def.tier];
    const companyId = def.companyKey ? ctx.companyIdByKey.get(def.companyKey) ?? null : null;

    // Stable expiry: ~10 months from now, slightly varied by index of tier
    const expiresAt = new Date(NOW.getTime() + 300 * ONE_DAY_MS);

    await prisma.membership.upsert({
      where: { chamberId_userId: { chamberId: ctx.chamber.id, userId: user.id } },
      update: {
        role: def.role,
        status: "ACTIVE",
        tierId,
        companyId,
        tags: def.tags,
        expiresAt,
      },
      create: {
        chamberId: ctx.chamber.id,
        userId: user.id,
        tierId,
        role: def.role,
        status: "ACTIVE",
        companyId,
        tags: def.tags,
        joinedAt: new Date(NOW.getTime() - 200 * ONE_DAY_MS),
        expiresAt,
      },
    });

    // Primary corporate contact: first def per company with role CORPORATE_CONTACT.
    if (def.role === "CORPORATE_CONTACT" && companyId) {
      await prisma.companyContact.upsert({
        where: { companyId_userId: { companyId, userId: user.id } },
        update: { isPrimary: true },
        create: { companyId, userId: user.id, isPrimary: true },
      });
    }
  }
}

async function seedOperatorMembership(ctx: SeederContext): Promise<void> {
  if (ctx.spec.slug !== "dancham") return;

  await prisma.membership.upsert({
    where: { chamberId_userId: { chamberId: ctx.chamber.id, userId: ctx.operatorId } },
    update: { role: "CHAMBER_ADMIN", status: "ACTIVE" },
    create: {
      chamberId: ctx.chamber.id,
      userId: ctx.operatorId,
      tierId: ctx.tierIdByName.Standard,
      role: "CHAMBER_ADMIN",
      status: "ACTIVE",
      tags: ["operator"],
      joinedAt: new Date(NOW.getTime() - 365 * ONE_DAY_MS),
      expiresAt: new Date(NOW.getTime() + 365 * ONE_DAY_MS),
    },
  });
}

async function seedApplication(ctx: SeederContext): Promise<void> {
  const motivationByChamber: Record<ChamberSlug, { name: string; email: string; company: string; motivation: string }> = {
    dancham: {
      name: "Sofia Madsen",
      email: `sofia.madsen.applicant@${ctx.spec.slug}.demo`,
      company: "Madsen Consulting",
      motivation:
        "I just relocated from Copenhagen with my family and I'm setting up a boutique consultancy advising Danish SMEs entering the Indonesian market. I'd love to plug into the Dancham community for both peer learning and business development.",
    },
    sweacham: {
      name: "Filip Sandström",
      email: `filip.sandstrom.applicant@${ctx.spec.slug}.demo`,
      company: "Sandström Trading Indonesia",
      motivation:
        "We're a small Swedish-owned trading company that has just opened a Jakarta office. Looking forward to connecting with the broader Swedish business community in Indonesia and learning from members who've made similar moves into the Indonesian market.",
    },
    norcham: {
      name: "Jonas Solheim",
      email: `jonas.solheim.applicant@${ctx.spec.slug}.demo`,
      company: "Solheim Marine Tech",
      motivation:
        "I'm building a maritime technology startup and have just opened an Indonesia office in Bali. I'd love to connect with both the Norwegian community and other Nordic operators in Bali and Jakarta, particularly anyone with experience in offshore wind or aquaculture.",
    },
    fincham: {
      name: "Liisa Aalto",
      email: `liisa.aalto.applicant@${ctx.spec.slug}.demo`,
      company: "Aalto Design Studio",
      motivation:
        "Finnish industrial designer who has been based in Jakarta for three years. Now formalising my studio and looking to deepen my professional network here. Particularly interested in cross-pollination with the architecture and construction members in the Indonesian market.",
    },
  };

  const application = motivationByChamber[ctx.spec.slug];

  await prisma.membershipApplication.upsert({
    where: { id: `demo-application-${ctx.spec.slug}` },
    update: {
      applicantEmail: application.email,
      applicantName: application.name,
      companyName: application.company,
      tierId: ctx.tierIdByName.Standard,
      status: "PENDING_REVIEW",
      payload: { motivation: application.motivation },
    },
    create: {
      id: `demo-application-${ctx.spec.slug}`,
      chamberId: ctx.chamber.id,
      applicantEmail: application.email,
      applicantName: application.name,
      companyName: application.company,
      tierId: ctx.tierIdByName.Standard,
      status: "PENDING_REVIEW",
      payload: { motivation: application.motivation },
      submittedAt: new Date(NOW.getTime() - 5 * ONE_DAY_MS),
    },
  });
}

async function seedEvents(ctx: SeederContext): Promise<void> {
  for (const ev of EVENTS[ctx.spec.slug]) {
    const eventId = `demo-event-${ctx.spec.slug}-${ev.slug}`;
    const ticketTypeId = `demo-tt-${ctx.spec.slug}-${ev.slug}`;

    const startsAt = dayOffset(ev.daysOffset, ev.hour);
    const endsAt = new Date(startsAt.getTime() + ev.durationHours * 60 * 60 * 1000);

    await prisma.event.upsert({
      where: { chamberId_slug: { chamberId: ctx.chamber.id, slug: ev.slug } },
      update: {
        title: ev.title,
        description: ev.description,
        coverImageUrl: pick(EVENT_IMAGES, ev.imageIdx),
        startsAt,
        endsAt,
        location: ev.location,
        capacity: ev.capacity,
        visibility: ev.visibility,
        status: ev.status,
      },
      create: {
        id: eventId,
        chamberId: ctx.chamber.id,
        slug: ev.slug,
        title: ev.title,
        description: ev.description,
        coverImageUrl: pick(EVENT_IMAGES, ev.imageIdx),
        startsAt,
        endsAt,
        location: ev.location,
        capacity: ev.capacity,
        visibility: ev.visibility,
        status: ev.status,
        createdById: ctx.operatorId,
      },
    });

    await prisma.ticketType.upsert({
      where: { id: ticketTypeId },
      update: {
        name: ev.ticket.name,
        price: new Prisma.Decimal(ev.ticket.price),
        audience: ev.ticket.audience,
      },
      create: {
        id: ticketTypeId,
        eventId,
        name: ev.ticket.name,
        price: new Prisma.Decimal(ev.ticket.price),
        audience: ev.ticket.audience,
      },
    });

    await seedRsvps(ctx, eventId, ticketTypeId, ev);
  }
}

async function seedRsvps(
  ctx: SeederContext,
  eventId: string,
  ticketTypeId: string,
  ev: EventSpec,
): Promise<void> {
  if (ev.rsvpCount === 0) return;

  const roster = ROSTERS[ctx.spec.slug];
  const count = Math.min(ev.rsvpCount, roster.length);

  for (let i = 0; i < count; i++) {
    const def = roster[i];
    const userId = ctx.userIdByEmail.get(def.email);
    if (!userId) continue;

    // Determine status and matching invoice.
    let status: "RESERVED" | "PAID" | "CHECKED_IN" = "RESERVED";
    if (ev.status === "COMPLETED") {
      status = i % 4 === 0 ? "PAID" : "CHECKED_IN";
    } else {
      status = i % 3 === 0 ? "RESERVED" : "PAID";
    }

    let invoiceId: string | null = null;
    if (ev.isPaid && (status === "PAID" || status === "CHECKED_IN")) {
      const invoiceNumber = `INV-${ctx.spec.slug.toUpperCase()}-${ev.slug.slice(0, 8).toUpperCase()}-${String(i + 1).padStart(3, "0")}`;
      const invoiceRecord = await prisma.invoice.upsert({
        where: { chamberId_number: { chamberId: ctx.chamber.id, number: invoiceNumber } },
        update: {
          payerEmail: def.email,
          amount: new Prisma.Decimal(ev.ticket.price),
          currency: ctx.spec.currency,
          status: "PAID",
          description: `${ev.title} — ${ev.ticket.name}`,
          paidAt: new Date(ev.daysOffset >= 0 ? NOW.getTime() - 2 * ONE_DAY_MS : dayOffset(ev.daysOffset - 5, 9).getTime()),
        },
        create: {
          chamberId: ctx.chamber.id,
          number: invoiceNumber,
          payerEmail: def.email,
          amount: new Prisma.Decimal(ev.ticket.price),
          currency: ctx.spec.currency,
          status: "PAID",
          description: `${ev.title} — ${ev.ticket.name}`,
          issuedAt: new Date(ev.daysOffset >= 0 ? NOW.getTime() - 4 * ONE_DAY_MS : dayOffset(ev.daysOffset - 7, 9).getTime()),
          paidAt: new Date(ev.daysOffset >= 0 ? NOW.getTime() - 2 * ONE_DAY_MS : dayOffset(ev.daysOffset - 5, 9).getTime()),
        },
      });
      invoiceId = invoiceRecord.id;
    } else if (ev.isPaid && status === "RESERVED") {
      // Open invoice
      const invoiceNumber = `INV-${ctx.spec.slug.toUpperCase()}-${ev.slug.slice(0, 8).toUpperCase()}-${String(i + 1).padStart(3, "0")}`;
      const invoiceRecord = await prisma.invoice.upsert({
        where: { chamberId_number: { chamberId: ctx.chamber.id, number: invoiceNumber } },
        update: {
          payerEmail: def.email,
          amount: new Prisma.Decimal(ev.ticket.price),
          currency: ctx.spec.currency,
          status: "OPEN",
          description: `${ev.title} — ${ev.ticket.name}`,
        },
        create: {
          chamberId: ctx.chamber.id,
          number: invoiceNumber,
          payerEmail: def.email,
          amount: new Prisma.Decimal(ev.ticket.price),
          currency: ctx.spec.currency,
          status: "OPEN",
          description: `${ev.title} — ${ev.ticket.name}`,
        },
      });
      invoiceId = invoiceRecord.id;
    }

    await prisma.ticket.upsert({
      where: { eventId_userId: { eventId, userId } },
      update: {
        status,
        invoiceId,
        checkedInAt: status === "CHECKED_IN" ? dayOffset(ev.daysOffset, ev.hour) : null,
      },
      create: {
        eventId,
        ticketTypeId,
        userId,
        status,
        invoiceId,
        checkedInAt: status === "CHECKED_IN" ? dayOffset(ev.daysOffset, ev.hour) : null,
      },
    });
  }
}

async function seedForum(ctx: SeederContext): Promise<void> {
  const threads = buildThreads(ctx.spec.slug);
  const roster = ROSTERS[ctx.spec.slug];

  for (const thread of threads) {
    const threadId = `demo-thread-${ctx.spec.slug}-${thread.slug}`;
    const author = roster[thread.authorIdx % roster.length];
    const authorUserId = ctx.userIdByEmail.get(author.email);
    if (!authorUserId) continue;

    await prisma.forumThread.upsert({
      where: { id: threadId },
      update: { title: thread.title, topic: thread.topic },
      create: {
        id: threadId,
        chamberId: ctx.chamber.id,
        title: thread.title,
        topic: thread.topic,
        createdById: authorUserId,
        createdAt: new Date(NOW.getTime() - thread.daysAgo * ONE_DAY_MS),
        updatedAt: new Date(NOW.getTime() - Math.max(0, thread.daysAgo - 2) * ONE_DAY_MS),
      },
    });

    for (let i = 0; i < thread.posts.length; i++) {
      const post = thread.posts[i];
      const postId = `demo-post-${ctx.spec.slug}-${thread.slug}-${i}`;
      const postAuthor = roster[post.authorIdx % roster.length];
      const postAuthorId = ctx.userIdByEmail.get(postAuthor.email);
      if (!postAuthorId) continue;

      await prisma.forumPost.upsert({
        where: { id: postId },
        update: { body: post.body },
        create: {
          id: postId,
          threadId,
          authorId: postAuthorId,
          body: post.body,
          createdAt: new Date(NOW.getTime() - post.daysAgo * ONE_DAY_MS),
        },
      });
    }
  }
}

async function seedKnowledge(ctx: SeederContext): Promise<void> {
  const articles = buildArticles(ctx.spec.slug);

  for (const article of articles) {
    const id = `demo-article-${ctx.spec.slug}-${article.slug}`;
    await prisma.knowledgeArticle.upsert({
      where: { chamberId_slug: { chamberId: ctx.chamber.id, slug: article.slug } },
      update: {
        title: article.title,
        excerpt: article.excerpt,
        body: article.body,
        coverImageUrl: pick(ARTICLE_IMAGES, article.imageIdx),
        tags: article.tags,
        isPublic: article.isPublic,
      },
      create: {
        id,
        chamberId: ctx.chamber.id,
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        body: article.body,
        coverImageUrl: pick(ARTICLE_IMAGES, article.imageIdx),
        tags: article.tags,
        isPublic: article.isPublic,
      },
    });
  }
}

async function seedMarketplace(ctx: SeederContext): Promise<void> {
  const listings = buildListings(ctx.spec.slug);
  const roster = ROSTERS[ctx.spec.slug];

  for (const listing of listings) {
    const id = `demo-listing-${ctx.spec.slug}-${listing.slug}`;
    const seller = roster[listing.sellerIdx % roster.length];
    const sellerId = ctx.userIdByEmail.get(seller.email);
    if (!sellerId) continue;

    await prisma.marketplaceListing.upsert({
      where: { id },
      update: {
        title: listing.title,
        category: listing.category,
        description: listing.description,
        priceFrom: new Prisma.Decimal(listing.priceFrom),
        isFeatured: listing.isFeatured,
        imageUrl: pick(LISTING_IMAGES, listing.imageIdx),
      },
      create: {
        id,
        chamberId: ctx.chamber.id,
        sellerUserId: sellerId,
        title: listing.title,
        category: listing.category,
        description: listing.description,
        priceFrom: new Prisma.Decimal(listing.priceFrom),
        isFeatured: listing.isFeatured,
        imageUrl: pick(LISTING_IMAGES, listing.imageIdx),
      },
    });
  }
}

async function seedMotions(ctx: SeederContext): Promise<void> {
  const motions = buildMotions();
  const boardMembers = ROSTERS[ctx.spec.slug].filter((m) => m.role === "BOARD_MEMBER" || m.role === "CHAMBER_ADMIN");

  for (const motion of motions) {
    const id = `demo-motion-${ctx.spec.slug}-${motion.slug}`;
    const proposer = ROSTERS[ctx.spec.slug][motion.proposedByIdx % ROSTERS[ctx.spec.slug].length];
    const proposerId = ctx.userIdByEmail.get(proposer.email);
    if (!proposerId) continue;

    const openedAt = new Date(NOW.getTime() - motion.daysAgo * ONE_DAY_MS);
    const closedAt = motion.status === "OPEN"
      ? null
      : new Date(NOW.getTime() - Math.max(0, motion.daysAgo - 7) * ONE_DAY_MS);

    await prisma.motion.upsert({
      where: { id },
      update: {
        title: motion.title,
        body: motion.body,
        status: motion.status,
        quorum: 4,
        openedAt,
        closedAt,
      },
      create: {
        id,
        chamberId: ctx.chamber.id,
        title: motion.title,
        body: motion.body,
        proposedBy: proposerId,
        status: motion.status,
        quorum: 4,
        openedAt,
        closedAt,
      },
    });

    if (motion.status === "OPEN" || motion.status === "WITHDRAWN") continue;

    const choices: { user: MemberDef; choice: "YES" | "NO" | "ABSTAIN" }[] = [];
    for (let i = 0; i < motion.yesVotes && i < boardMembers.length; i++) {
      choices.push({ user: boardMembers[i], choice: "YES" });
    }
    for (let i = 0; i < motion.noVotes && motion.yesVotes + i < boardMembers.length; i++) {
      choices.push({ user: boardMembers[motion.yesVotes + i], choice: "NO" });
    }
    for (let i = 0; i < motion.abstainVotes && motion.yesVotes + motion.noVotes + i < boardMembers.length; i++) {
      choices.push({ user: boardMembers[motion.yesVotes + motion.noVotes + i], choice: "ABSTAIN" });
    }

    for (const c of choices) {
      const userId = ctx.userIdByEmail.get(c.user.email);
      if (!userId) continue;

      // Use compound unique upsert via raw findFirst+create to keep types simple
      const existing = await prisma.vote.findUnique({
        where: { motionId_userId: { motionId: id, userId } },
        select: { id: true },
      });
      if (existing) {
        await prisma.vote.update({
          where: { motionId_userId: { motionId: id, userId } },
          data: { choice: c.choice },
        });
      } else {
        await prisma.vote.create({
          data: {
            motionId: id,
            userId,
            choice: c.choice,
            castAt: new Date(openedAt.getTime() + 2 * ONE_DAY_MS),
          },
        });
      }
    }
  }
}

async function seedCommunications(ctx: SeederContext): Promise<void> {
  const roster = ROSTERS[ctx.spec.slug];
  const count = 30;

  // Build deterministic ids so re-runs are idempotent.
  for (let i = 0; i < count; i++) {
    const id = `demo-comm-${ctx.spec.slug}-${String(i).padStart(3, "0")}`;
    const template = pick(COMM_TEMPLATES, i);
    const recipient = roster[i % roster.length];
    const recipientUserId = ctx.userIdByEmail.get(recipient.email);
    const sentAt = new Date(NOW.getTime() - (i % 14) * ONE_DAY_MS - (i * 31) * 60 * 1000);
    const delivered = i % 11 !== 0; // ~9% bounce-equivalent

    await prisma.communicationLog.upsert({
      where: { id },
      update: {
        channel: template.channel,
        templateKey: template.templateKey,
        recipientEmail: template.channel === "EMAIL" ? recipient.email : null,
        recipientPhone: template.channel === "WHATSAPP" ? `+62-812-${String(1000 + i).padStart(4, "0")}-${String(i * 7).padStart(4, "0").slice(0, 4)}` : null,
        payload: { subject: template.subject, recipientUserId, summary: `${template.subject} sent to ${recipient.name}` },
        sentById: ctx.operatorId,
        sentAt,
        delivered,
      },
      create: {
        id,
        chamberId: ctx.chamber.id,
        channel: template.channel,
        templateKey: template.templateKey,
        recipientEmail: template.channel === "EMAIL" ? recipient.email : null,
        recipientPhone: template.channel === "WHATSAPP" ? `+62-812-${String(1000 + i).padStart(4, "0")}-${String(i * 7).padStart(4, "0").slice(0, 4)}` : null,
        payload: { subject: template.subject, recipientUserId, summary: `${template.subject} sent to ${recipient.name}` },
        sentById: ctx.operatorId,
        sentAt,
        delivered,
      },
    });
  }
}

async function seedAudit(ctx: SeederContext): Promise<void> {
  const roster = ROSTERS[ctx.spec.slug];
  const count = 20;

  for (let i = 0; i < count; i++) {
    const id = `demo-audit-${ctx.spec.slug}-${String(i).padStart(3, "0")}`;
    const action = pick(AUDIT_ACTIONS, i);
    const actor = roster[i % roster.length];
    const actorId = ctx.userIdByEmail.get(actor.email) ?? ctx.operatorId;
    const createdAt = new Date(NOW.getTime() - (i * 8 * 60 * 60 * 1000));

    await prisma.auditEntry.upsert({
      where: { id },
      update: {
        action,
        target: `${action.split(".")[0]}:${ctx.spec.slug}-${i}`,
        metadata: { actorEmail: actor.email, note: `Auto-recorded ${action} by ${actor.name}.` },
        createdAt,
      },
      create: {
        id,
        chamberId: ctx.chamber.id,
        actorUserId: actorId,
        action,
        target: `${action.split(".")[0]}:${ctx.spec.slug}-${i}`,
        metadata: { actorEmail: actor.email, note: `Auto-recorded ${action} by ${actor.name}.` },
        createdAt,
      },
    });
  }
}

// ---------- Main ----------

async function main(): Promise<void> {
  const operator = await prisma.user.upsert({
    where: { email: OPERATOR_EMAIL },
    update: {
      platformRole: "OPERATOR",
      name: "Platform Operator",
      headline: "Operator, DanChamp Platform",
      bio: "Platform operator account. Owns the multi-tenant infrastructure and supports chamber admins across the Indonesian network.",
      location: "Jakarta, ID",
      avatarUrl: avatarFor(OPERATOR_EMAIL),
    },
    create: {
      email: OPERATOR_EMAIL,
      name: "Platform Operator",
      platformRole: "OPERATOR",
      headline: "Operator, DanChamp Platform",
      bio: "Platform operator account. Owns the multi-tenant infrastructure and supports chamber admins across the Indonesian network.",
      location: "Jakarta, ID",
      avatarUrl: avatarFor(OPERATOR_EMAIL),
    },
    select: { id: true, email: true },
  });

  const results: SeederResult[] = [];
  for (const spec of CHAMBERS) {
    const result = await seedChamber(spec, operator.id);
    results.push(result);
  }

  const totalMembers = results.reduce((acc, r) => acc + r.members, 0);
  const totalEvents = results.reduce((acc, r) => acc + r.events, 0);
  const totalArticles = results.reduce((acc, r) => acc + r.articles, 0);
  const totalMotions = results.reduce((acc, r) => acc + r.motions, 0);

  console.log(
    `[seed] DONE — ${CHAMBERS.length} chambers, ${totalMembers} members, ${totalEvents} events, ${totalArticles} articles, ${totalMotions} motions, operator=${operator.email}`,
  );
}

main()
  .catch((e: unknown) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
