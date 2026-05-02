# DanChamp — Full system capabilities overview

> Source of truth for what the platform does, who uses it, what it controls, and what each user can do once inside.
>
> Audience: Board members, partners, investors, technical reviewers.
> Status: Pre-build specification. Architecture and scope locked.
> Version: 1.0  /  April 2026

The full text of the spec lives in this file. Every implementation PR must be traceable back to a numbered section here.

## 1. What the platform is

DanChamp is an operating platform for business chambers and member organizations. It runs the chamber. One system handles members, board governance, events, payments, communication, knowledge sharing and reporting. It replaces the manual mix of Excel sheets, WhatsApp groups, free Mailchimp accounts, hand-written invoices and Facebook event pages that chambers use today. Built so one chamber can run on it, and so many chambers can run on the same platform without seeing each other's data.

Two layers run on top of each other:

- **Community layer** — public, free, SEO-indexed. The funnel.
- **Business layer** — private, paid, chamber-controlled. The product.

## 2. The control hierarchy

| Tier | Role | Scope of control |
|------|------|------------------|
| 1 | Platform Operator (Super Admin) | Owns the entire platform. Provisions chambers, manages billing, monitors uptime. |
| 2 | Chamber Administrator | Runs one chamber. Approves members, creates events, sends communication. |
| 3 | Board Member | Reviews proposed members, approves budget items, votes on motions. |
| 4 | Corporate Contact | Designated representative for a paying company. Sees the company's own dashboard. |
| 5 | Business Member | Individual member. Networking, events, marketplace, knowledge, DMs. |
| 6 | Public / Community User | Free profile. Reads public content, joins open groups, attends free events. |

Hierarchy is enforced at the data layer. Cross-chamber visibility only happens when a chamber explicitly opts in to a federation feature (Phase 3).

## 3. Permission matrix

See the original document. Codified in `src/lib/auth/permissions.ts`.

## 4. Two-layer architecture

- Layer 1 — Community: free, public, SEO-indexed. Public profiles, public groups, public events.
- Layer 2 — Business: private, paid. Member DB, ticketed events, board area, corporate dashboards, forum, marketplace, DMs, knowledge library, financial reporting.

## 5. Module inventory

5.1 Platform administration (Operator)
5.2 Chamber administration
5.3 Board area
5.4 Member experience
5.5 Corporate dashboard
5.6 Event system
5.7 Communication layer (WhatsApp + email)
5.8 Payments and billing
5.9 Public community layer
5.10 Knowledge sharing & content
5.11 Marketplace
5.12 Analytics & reporting
5.13 Multi-chamber & federation (Phase 3)

## 6. Core workflows

6.1 New chamber creation
6.2 Board motion lifecycle
6.3 New member onboarding
6.4 Paid networking event
6.5 Corporate ROI review

## 7. Three business outcomes

| Problem | Mechanism | Measurable outcome |
|---|---|---|
| Operations are manual | Member DB, automated events/comms, online payment | 80% reduction in admin time |
| Companies cannot see value | Corporate dashboard + quarterly report + ROI estimator | 85%+ corporate renewal vs. ~60% baseline |
| Cannot grow beyond network | Public layer + SEO + free events | 5+ inbound signups/month after month 6 |

## 8. Technical architecture

| Layer | Technology |
|---|---|
| Frontend | React / Next.js 16 |
| Backend | Same Next.js (route handlers, server components) |
| Database | PostgreSQL with multi-tenant schema isolation per chamber |
| Payments | Xendit (IDR) / Stripe (SGD) |
| Communication | WhatsApp Business API + Resend |
| Hosting | Vercel (Fluid Compute) |
| Search | Postgres FTS now, Algolia in Phase 2 |
| Auth | Supabase Auth |
| Compliance | GDPR-aligned, audit log on every admin action |

## 9. Phasing

| Phase | Period | Modules |
|---|---|---|
| 0 | Weeks 1–4 | Validation, wireframes |
| 1 (MVP) | Months 1–6 | Member DB, events, admin panel, online payment, basic comms, community feed, corporate dashboard v1 |
| 2 | Months 7–12 | Marketplace, advanced analytics, knowledge library, sponsor system, mentorship, full quarterly report engine, auto-renewal |
| 3 | Months 13–18+ | Multi-chamber federation, white-label SaaS, mobile app, AI matching, cross-chamber events |

## 10. Boundaries — what the platform is NOT

- Not a replacement for board governance
- Not a guarantee of growth
- Not a generic social network
- Not a CRM substitute for individual companies
- Not a replacement for accounting software
- Not a marketing automation platform like HubSpot

## 11. Quick reference: role → daily screens

| Role | Screens |
|---|---|
| Operator | Tenant list, billing, system health, audit log |
| Chamber Admin | Member list, event manager, communication, financials, application queue |
| Board Member | Board area, motions, vault, financial summary |
| Corporate Contact | Corporate dashboard, employee activity, quarterly report, renewal |
| Business Member | Personal dashboard, events, directory, forum, DMs, marketplace, knowledge |
| Public User | Public landing, public events, public groups, content feed, signup CTA |
