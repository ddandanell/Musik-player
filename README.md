# DanChamp Platform

Operating system for business chambers. Multi-tenant SaaS where many chambers run on one platform with full data isolation.

The full platform spec is `docs/SPEC.md` (six tiers, thirteen modules).

---

## Stack

| Layer | Choice |
|---|---|
| Runtime | Node 22, Next.js 16 App Router (Turbopack) |
| Language | TypeScript strict |
| Styling | Tailwind v4 with CSS custom-property tokens |
| Database | Postgres via Supabase + Prisma 7 (`@prisma/adapter-pg`) |
| Auth | Supabase magic-link |
| Payments | Xendit (IDR primary), Stripe-compatible scaffold |
| Comms | WhatsApp Business Cloud API + Resend |
| Hosting | Vercel (Fluid Compute) + Vercel Cron |

## Spec → code map

| Spec section | Status | Path |
|---|---|---|
| §2 Role hierarchy (6 tiers) | ✅ enforced via Prisma + `lib/auth/permissions.ts` |
| §3 Permission matrix | ✅ server-side guards in every action |
| §4 Two-layer architecture | ✅ `(public)` + `(authenticated)` route groups |
| §5.1 Operator console | ✅ overview · chambers · billing · health · audit · create chamber |
| §5.2 Chamber admin | ✅ members + search/filter/tag, applications queue with approve/board/reject, events, communication composer, finance, knowledge management, CSV exports |
| §5.3 Board area | ✅ motions list with tallies, propose, vote with auto-quorum, withdraw |
| §5.4 Member experience | ✅ personal dashboard, directory with search, events, forum, marketplace, knowledge |
| §5.5 Corporate dashboard | ✅ company roll-up + per-quarter print-ready value report |
| §5.6 Event system | ✅ admin CRUD, public RSVP with waitlist, attendance check-in, refund, reminder cron (T-7d/T-1d/T-1h) |
| §5.7 Communication layer | ✅ Resend + WhatsApp Cloud API adapters, comms log writer, composer, inbound WhatsApp webhook |
| §5.8 Payments and billing | ✅ Xendit hosted invoice creation on RSVP and on app approval, signed webhook → PAID, refund flow, finance overview |
| §5.9 Public community layer | ✅ editorial landing, public chambers list, public events list, public application form, public payment landing |
| §5.10 Knowledge & forum | ✅ forum threads + posts, knowledge library with tags, public articles |
| §5.11 Marketplace | ✅ listings list, create, detail with seller/admin gates |
| §5.12 Analytics | ✅ in-page aggregations on operator overview, billing, health, finance |
| §5.13 Multi-chamber | ✅ tenant model from day one; subdomain ready |

## Permission model

Every chamber-scoped page calls `requireSession()` then `hasChamberRole(session, chamberId, minimum)`. The Operator role bypasses chamber checks (audited via `AuditEntry`). Cross-chamber access is denied by membership lookup, not by trust.

In addition, `prisma/rls.sql` defines Postgres Row-Level Security policies as a second wall — to be applied after the first migration.

## Key endpoints

```
# Auth
POST  /login                              magic link
GET   /auth/callback                      Supabase OTP exchange + User upsert

# Public application
GET   /c/[slug]/apply                     application form
GET   /c/[slug]/events/[evt]              event detail (signed-out preview / signed-in RSVP)
GET   /pay/[invoiceNumber]                payment landing (links to Xendit hosted page)

# Chamber admin
GET   /c/[slug]/admin                     overview stats
GET   /c/[slug]/admin/members             search · role · status · tag · expiring filter
GET   /c/[slug]/admin/members/[id]        edit role/status/tier/tags
GET   /c/[slug]/admin/applications        approve / send to board / reject
GET   /c/[slug]/admin/events              event list
GET   /c/[slug]/admin/events/new          create
GET   /c/[slug]/admin/events/[id]         edit / publish / cancel
GET   /c/[slug]/admin/events/[id]/attendance   check-in / promote / refund
GET   /c/[slug]/admin/communication       composer + log
GET   /c/[slug]/admin/finance             revenue stats + invoice table
GET   /c/[slug]/admin/knowledge           list + new + edit/delete

# Board
GET   /c/[slug]/board                     workspace
GET   /c/[slug]/board/motions             grouped list
GET   /c/[slug]/board/motions/new         propose
GET   /c/[slug]/board/motions/[id]        vote · withdraw

# Corporate
GET   /c/[slug]/corporate                 dashboard
GET   /c/[slug]/corporate/report/[Q]      quarterly value report (print-ready)

# Member
GET   /c/[slug]                           member home
GET   /c/[slug]/directory                 search + filter
GET   /c/[slug]/forum                     threads list
GET   /c/[slug]/forum/[id]                thread detail + reply
GET   /c/[slug]/forum/new                 new thread
GET   /c/[slug]/marketplace               listings
GET   /c/[slug]/marketplace/[id]          detail
GET   /c/[slug]/marketplace/new           list a service
GET   /c/[slug]/knowledge                 article index
GET   /c/[slug]/knowledge/[slug]          article

# Operator
GET   /operator                           overview
GET   /operator/chambers                  list
GET   /operator/chambers/new              provision
GET   /operator/billing                   per-chamber revenue + platform fee
GET   /operator/health                    counts + DB ping + delivery failures
GET   /operator/audit                     last 100 entries with chamber filter

# API + integrations
POST  /api/webhooks/xendit                signed; marks invoice + tickets PAID
GET   /api/webhooks/whatsapp              Meta verification handshake
POST  /api/webhooks/whatsapp              inbound message logging
GET   /api/cron/event-reminders           Bearer-protected; T-7d/T-1d/T-1h, idempotent per templateKey
GET   /api/export/[slug]/members.csv      admin-gated
GET   /api/export/[slug]/invoices.csv     admin-gated
```

## Cron schedule

`vercel.json` registers `/api/cron/event-reminders` to run every hour. The handler picks events whose `startsAt` falls inside one of the three windows (T-7d ± 1d, T-1d ± 2h, T-1h ± 30m), and idempotency is enforced via `CommunicationLog.templateKey = event_reminder:<window>:<eventId>` — a duplicate call within the same window is a no-op.

## Getting started

```bash
pnpm install
cp .env.example .env.local         # fill DATABASE_URL + Supabase + provider keys
pnpm db:push                       # provision schema on Supabase
psql $DIRECT_URL -f prisma/rls.sql # apply RLS policies (recommended)
pnpm db:seed                       # demo chamber + operator + 3 board + 1 corp + 1 application + 1 published event
pnpm dev
```

## Folder structure

```
src/
  app/
    (public)/                     # SEO-indexed community layer
      c/[slug]/apply/             # public application form
      c/[slug]/events/[evt]/      # event detail (gated by visibility + session)
      pay/[invoiceNumber]/        # payment landing
    (authenticated)/              # session required
      me/                         # personal dashboard
      operator/                   # Tier 1 console
      c/[chamberSlug]/            # tenant-scoped routes
        admin/                    # Tier 2 surfaces
        board/                    # Tier 3 surfaces
        corporate/                # Tier 4 surfaces (incl. quarterly report)
        directory|forum|...       # Tier 5 surfaces
    api/
      webhooks/{xendit,whatsapp}/
      cron/event-reminders/
      export/[slug]/{members,invoices}.csv/
  lib/
    auth/{session.ts,permissions.ts,actions.ts}
    integrations/{xendit.ts,resend.ts,whatsapp.ts}
    {audit.ts,comms.ts,quorum.ts,reminders.ts,quarter.ts,csv.ts,utils.ts,db.ts}
  proxy.ts                        # Next 16 proxy: refreshes Supabase session
prisma/
  schema.prisma                   # multi-tenant data model
  rls.sql                         # Row-Level Security policies (defense in depth)
  seed.ts                         # demo data
docs/
  SPEC.md                         # Full platform specification
vercel.json                       # cron schedule
```

## Not in scope yet

- Document vault, AGM agenda + minutes, conflict-of-interest register (Tier 3 governance extras)
- Mentorship pairing
- Sponsor system on events (placement + delivery report)
- Multi-currency support beyond IDR/USD
- White-label per-chamber custom domains
- Mobile app
- AI-assisted matching (Phase 3)
