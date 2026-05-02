import { cache } from "react";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import type { ChamberRole, PlatformRole } from "@prisma/client";

export type SessionContext = {
  authId: string;
  email: string;
  userId: string;
  platformRole: PlatformRole;
  memberships: Array<{
    chamberId: string;
    chamberSlug: string;
    role: ChamberRole;
  }>;
  isDemo?: boolean;
};

export const DEMO_COOKIE = "danchamp_demo_user";

function demoEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "1";
}

async function loadUserSession(userId: string, options: { isDemo: boolean; authId?: string }) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: { chamber: { select: { id: true, slug: true } } },
      },
    },
  });
  if (!dbUser) return null;
  return {
    authId: options.authId ?? `demo:${dbUser.id}`,
    email: dbUser.email,
    userId: dbUser.id,
    platformRole: dbUser.platformRole,
    memberships: dbUser.memberships.map((m) => ({
      chamberId: m.chamberId,
      chamberSlug: m.chamber.slug,
      role: m.role,
    })),
    isDemo: options.isDemo,
  } satisfies SessionContext;
}

function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export const getSession = cache(async (): Promise<SessionContext | null> => {
  if (demoEnabled()) {
    const store = await cookies();
    const demoUserId = store.get(DEMO_COOKIE)?.value;
    if (demoUserId) {
      return loadUserSession(demoUserId, { isDemo: true });
    }
  }

  if (!supabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: { chamber: { select: { id: true, slug: true } } },
      },
    },
  });
  if (!dbUser) return null;

  return {
    authId: user.id,
    email: dbUser.email,
    userId: dbUser.id,
    platformRole: dbUser.platformRole,
    memberships: dbUser.memberships.map((m) => ({
      chamberId: m.chamberId,
      chamberSlug: m.chamber.slug,
      role: m.role,
    })),
  };
});

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

export function isDemoMode(): boolean {
  return demoEnabled();
}
