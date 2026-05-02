# Showing DanChamp — a presenter's cheat sheet

This file exists so you can present the platform without checking notes mid-demo.

**Demo scope:** four Scandinavian chambers, all operating in Indonesia.
- `dancham` — Danish Chamber of Commerce in Indonesia (Jakarta, IDR)
- `sweacham` — Swedish Chamber of Commerce in Indonesia (Jakarta, IDR)
- `norcham` — Norwegian Business Forum Indonesia (Bali, IDR)
- `fincham` — Finland Chamber Indonesia (Jakarta, IDR)

## Setup once

```bash
pnpm install
cp .env.example .env.local
# fill DATABASE_URL with any Postgres (Supabase free tier works)
pnpm db:push
pnpm db:seed
pnpm dev
```

Make sure `NEXT_PUBLIC_DEMO_MODE="1"` is set in `.env.local`. (Already in `.env.example`.)

## The demo URLs

| URL | What it shows |
|---|---|
| `/` | Public marketing landing — the "what is DanChamp" pitch |
| `/chambers` | Public chamber directory — proves multi-tenant |
| `/c/dancham` | A specific chamber's public face — SEO-indexed |
| `/c/dancham/events/spring-mixer` | A public event detail — what a Google searcher sees |
| `/for-chambers` + `/for-chambers/pricing` | Sales pages |
| `/demo` | **The show-off entry point** — list of 5 personas, one click to step in |
| `/demo/walkthrough` | **The investor pitch** — 5 narrative tours |

## The 5 narrative tours (covered in `/demo/walkthrough`)

1. **The new applicant** — shows the public-to-paid funnel
2. **The corporate sponsor** — shows the renewal-decision quarterly value report (the platform's biggest retention argument)
3. **The board member** — shows digital governance + auto-quorum
4. **The chamber admin** — shows the day-to-day operating screens
5. **The platform operator** — shows the multi-tenant operating company view

## What to say

> "DanChamp is the operating system for business chambers. One platform runs many chambers without them seeing each other's data. Today I'll show you what it looks like from five different perspectives — the new applicant, the corporate sponsor, the board, the chamber admin, and us as the platform operator."

Open `/demo/walkthrough`. Click each tour in order.

## What to highlight per tour

**Applicant tour** → "Notice this is all SEO-indexed. We're not waiting for them to know us — Google sends them."

**Corporate tour** → "Renewal is the largest churn driver in chambers. This auto-generated quarterly report is the single most important retention feature on the platform."

**Board tour** → "No more PDFs in email threads. Motion proposed, vote cast, auto-closes when quorum is hit."

**Admin tour** → "What replaces the volunteer-run Excel + WhatsApp + free Mailchimp stack."

**Operator tour** → "From here we provision new chambers in minutes, take a transparent transaction fee on ticket revenue, and keep an audit trail of every admin action."

## After the tour

- Show `/chambers` again — "and this same operating system runs four other Scandinavian chambers in Southeast Asia."
- Show `/operator/billing` — "and we see the per-chamber revenue and platform fee in real time."

## Closing

> "Phase 1 (six months) is the operating MVP — what you just saw. Phase 2 adds mentorship, marketplace at scale, sponsor placement. Phase 3 is multi-chamber federation and white-label."

End on `/for-chambers/pricing`.
