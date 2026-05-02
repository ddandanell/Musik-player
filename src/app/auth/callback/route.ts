import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

// Supabase OTP redirect lands here. We exchange the code for a session,
// then upsert a local User row keyed by Supabase auth.users.id so every
// downstream query has a stable userId to join on.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/me";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createSupabaseServerClient();
  const { error, data } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  const operatorEmail = process.env.PLATFORM_OPERATOR_EMAIL?.toLowerCase();
  const isOperator = operatorEmail && data.user.email?.toLowerCase() === operatorEmail;

  await prisma.user.upsert({
    where: { authId: data.user.id },
    update: {
      email: data.user.email!,
      ...(isOperator ? { platformRole: "OPERATOR" as const } : {}),
    },
    create: {
      authId: data.user.id,
      email: data.user.email!,
      name: (data.user.user_metadata?.name as string | undefined) ?? null,
      platformRole: isOperator ? "OPERATOR" : "USER",
    },
  });

  return NextResponse.redirect(`${origin}${next}`);
}
