-- DanChamp Platform — Row-Level Security policies (defense in depth on Supabase)
--
-- Run this AFTER `prisma db push` so the tables exist. App-server queries go
-- through the Prisma adapter using the service-role connection, so these
-- policies primarily protect direct DB access (Supabase REST, SQL editor,
-- restored backups). The application layer is the primary access gate; RLS
-- is the second wall.
--
-- Conventions:
--   * `auth.uid()`           → the Supabase auth user id
--   * `app.user_id`          → our local User.id mapped from `User.authId = auth.uid()`
--   * `app.is_operator`      → User.platformRole = 'OPERATOR'
--   * `app.has_chamber_role` → exists ACTIVE Membership in chamber with role >= minimum

-- ---------- Helper functions ----------

create or replace function app.user_id() returns text language sql stable as $$
  select id from "User" where "authId" = auth.uid()::text limit 1;
$$;

create or replace function app.is_operator() returns boolean language sql stable as $$
  select coalesce((
    select "platformRole" = 'OPERATOR' from "User" where "authId" = auth.uid()::text limit 1
  ), false);
$$;

create or replace function app.has_chamber_role(target_chamber text, minimum text)
returns boolean language sql stable as $$
  with rank as (
    select 'CHAMBER_ADMIN'::text as role, 5 as r union all
    select 'BOARD_MEMBER', 4 union all
    select 'CORPORATE_CONTACT', 3 union all
    select 'BUSINESS_MEMBER', 2 union all
    select 'PUBLIC', 1
  ),
  me as (
    select m.role::text as r
    from "Membership" m
    join "User" u on u.id = m."userId"
    where m."chamberId" = target_chamber
      and m.status = 'ACTIVE'
      and u."authId" = auth.uid()::text
  )
  select app.is_operator()
    or exists (
      select 1 from me
      join rank actual on actual.role = me.r
      join rank needed on needed.role = minimum
      where actual.r >= needed.r
    );
$$;

-- ---------- Enable RLS on every tenant-scoped table ----------

alter table "Chamber" enable row level security;
alter table "Membership" enable row level security;
alter table "MembershipTier" enable row level security;
alter table "MembershipApplication" enable row level security;
alter table "Company" enable row level security;
alter table "CompanyContact" enable row level security;
alter table "Event" enable row level security;
alter table "TicketType" enable row level security;
alter table "Ticket" enable row level security;
alter table "Motion" enable row level security;
alter table "Vote" enable row level security;
alter table "Invoice" enable row level security;
alter table "CommunicationLog" enable row level security;
alter table "ForumThread" enable row level security;
alter table "ForumPost" enable row level security;
alter table "KnowledgeArticle" enable row level security;
alter table "MarketplaceListing" enable row level security;
alter table "AuditEntry" enable row level security;

-- ---------- Chamber: visible to operator, members, or public for active chambers ----------

create policy chamber_read on "Chamber" for select using (
  status = 'ACTIVE' or app.is_operator() or app.has_chamber_role(id, 'PUBLIC')
);
create policy chamber_write on "Chamber" for all using (app.is_operator()) with check (app.is_operator());

-- ---------- Generic chamber-scoped read/write template ----------

-- Membership: members of the chamber can see fellow members; admins write.
create policy membership_read on "Membership" for select using (
  app.has_chamber_role("chamberId", 'BUSINESS_MEMBER')
);
create policy membership_write on "Membership" for all using (
  app.has_chamber_role("chamberId", 'CHAMBER_ADMIN')
) with check (app.has_chamber_role("chamberId", 'CHAMBER_ADMIN'));

create policy tier_read on "MembershipTier" for select using (true);
create policy tier_write on "MembershipTier" for all using (
  app.has_chamber_role("chamberId", 'CHAMBER_ADMIN')
) with check (app.has_chamber_role("chamberId", 'CHAMBER_ADMIN'));

create policy application_read on "MembershipApplication" for select using (
  app.has_chamber_role("chamberId", 'CHAMBER_ADMIN')
);
create policy application_insert on "MembershipApplication" for insert with check (true);
create policy application_update on "MembershipApplication" for update using (
  app.has_chamber_role("chamberId", 'CHAMBER_ADMIN')
);

create policy company_read on "Company" for select using (
  app.has_chamber_role("chamberId", 'BUSINESS_MEMBER')
);
create policy company_write on "Company" for all using (
  app.has_chamber_role("chamberId", 'CHAMBER_ADMIN')
) with check (app.has_chamber_role("chamberId", 'CHAMBER_ADMIN'));

create policy company_contact_read on "CompanyContact" for select using (
  exists (
    select 1 from "Company" c
    where c.id = "CompanyContact"."companyId"
      and app.has_chamber_role(c."chamberId", 'BUSINESS_MEMBER')
  )
);

create policy event_read on "Event" for select using (
  visibility = 'PUBLIC'
  or app.has_chamber_role("chamberId", 'BUSINESS_MEMBER')
);
create policy event_write on "Event" for all using (
  app.has_chamber_role("chamberId", 'CHAMBER_ADMIN')
) with check (app.has_chamber_role("chamberId", 'CHAMBER_ADMIN'));

create policy ticket_type_read on "TicketType" for select using (
  exists (select 1 from "Event" e where e.id = "TicketType"."eventId"
    and (e.visibility = 'PUBLIC' or app.has_chamber_role(e."chamberId", 'BUSINESS_MEMBER')))
);

create policy ticket_self_read on "Ticket" for select using (
  "userId" = app.user_id()
  or exists (select 1 from "Event" e where e.id = "Ticket"."eventId"
    and app.has_chamber_role(e."chamberId", 'CHAMBER_ADMIN'))
);
create policy ticket_self_insert on "Ticket" for insert with check (
  "userId" = app.user_id()
);

create policy motion_read on "Motion" for select using (
  app.has_chamber_role("chamberId", 'BOARD_MEMBER')
);
create policy motion_write on "Motion" for all using (
  app.has_chamber_role("chamberId", 'BOARD_MEMBER')
) with check (app.has_chamber_role("chamberId", 'BOARD_MEMBER'));

create policy vote_read on "Vote" for select using (
  exists (select 1 from "Motion" m where m.id = "Vote"."motionId"
    and app.has_chamber_role(m."chamberId", 'BOARD_MEMBER'))
);
create policy vote_insert on "Vote" for insert with check (
  exists (select 1 from "Motion" m where m.id = "Vote"."motionId"
    and app.has_chamber_role(m."chamberId", 'BOARD_MEMBER'))
);

create policy invoice_read on "Invoice" for select using (
  app.has_chamber_role("chamberId", 'CHAMBER_ADMIN')
);
create policy invoice_write on "Invoice" for all using (
  app.has_chamber_role("chamberId", 'CHAMBER_ADMIN')
) with check (app.has_chamber_role("chamberId", 'CHAMBER_ADMIN'));

create policy comms_log_read on "CommunicationLog" for select using (
  app.has_chamber_role("chamberId", 'CHAMBER_ADMIN')
);
create policy comms_log_write on "CommunicationLog" for all using (
  app.has_chamber_role("chamberId", 'CHAMBER_ADMIN')
) with check (app.has_chamber_role("chamberId", 'CHAMBER_ADMIN'));

create policy forum_thread_read on "ForumThread" for select using (
  app.has_chamber_role("chamberId", 'BUSINESS_MEMBER')
);
create policy forum_thread_write on "ForumThread" for all using (
  app.has_chamber_role("chamberId", 'BUSINESS_MEMBER')
) with check (app.has_chamber_role("chamberId", 'BUSINESS_MEMBER'));

create policy forum_post_read on "ForumPost" for select using (
  exists (select 1 from "ForumThread" t where t.id = "ForumPost"."threadId"
    and app.has_chamber_role(t."chamberId", 'BUSINESS_MEMBER'))
);
create policy forum_post_write on "ForumPost" for all using (
  exists (select 1 from "ForumThread" t where t.id = "ForumPost"."threadId"
    and app.has_chamber_role(t."chamberId", 'BUSINESS_MEMBER'))
) with check (
  exists (select 1 from "ForumThread" t where t.id = "ForumPost"."threadId"
    and app.has_chamber_role(t."chamberId", 'BUSINESS_MEMBER'))
);

create policy knowledge_read on "KnowledgeArticle" for select using (
  "isPublic" or app.has_chamber_role("chamberId", 'BUSINESS_MEMBER')
);
create policy knowledge_write on "KnowledgeArticle" for all using (
  app.has_chamber_role("chamberId", 'CHAMBER_ADMIN')
) with check (app.has_chamber_role("chamberId", 'CHAMBER_ADMIN'));

create policy marketplace_read on "MarketplaceListing" for select using (
  app.has_chamber_role("chamberId", 'BUSINESS_MEMBER')
);
create policy marketplace_insert on "MarketplaceListing" for insert with check (
  app.has_chamber_role("chamberId", 'BUSINESS_MEMBER')
);
create policy marketplace_update on "MarketplaceListing" for update using (
  "sellerUserId" = app.user_id() or app.has_chamber_role("chamberId", 'CHAMBER_ADMIN')
);
create policy marketplace_delete on "MarketplaceListing" for delete using (
  "sellerUserId" = app.user_id() or app.has_chamber_role("chamberId", 'CHAMBER_ADMIN')
);

create policy audit_read on "AuditEntry" for select using (
  app.is_operator()
  or ("chamberId" is not null and app.has_chamber_role("chamberId", 'CHAMBER_ADMIN'))
);
create policy audit_insert on "AuditEntry" for insert with check (true);
