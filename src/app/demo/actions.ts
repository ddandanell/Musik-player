"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { DEMO_COOKIE, isDemoMode } from "@/lib/auth/session";

const enterSchema = z.object({
  userId: z.string().min(1),
  redirectTo: z.string().min(1).default("/me"),
});

export async function enterDemo(formData: FormData): Promise<void> {
  if (!isDemoMode()) throw new Error("Demo mode is not enabled.");

  const parsed = enterSchema.parse({
    userId: formData.get("userId"),
    redirectTo: formData.get("redirectTo") ?? "/me",
  });

  const user = await prisma.user.findUnique({ where: { id: parsed.userId } });
  if (!user) throw new Error("Demo persona not found");

  const store = await cookies();
  store.set(DEMO_COOKIE, user.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
  });

  redirect(parsed.redirectTo);
}

export async function exitDemo(): Promise<void> {
  const store = await cookies();
  store.delete(DEMO_COOKIE);
  redirect("/demo");
}
