"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";

const applicationSchema = z.object({
  chamberSlug: z.string().min(1),
  fullName: z.string().min(2, "Please enter your full name"),
  email: z.string().email("Please enter a valid email"),
  companyName: z.string().optional(),
  tierId: z.string().optional(),
  motivation: z.string().min(20, "Tell us a bit more about why you're applying"),
});

export type ApplyState =
  | { status: "idle" }
  | { status: "submitted" }
  | { status: "error"; fieldErrors?: Record<string, string[]>; message?: string };

export async function submitApplication(
  _prev: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const parsed = applicationSchema.safeParse({
    chamberSlug: formData.get("chamberSlug"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    companyName: formData.get("companyName") || undefined,
    tierId: formData.get("tierId") || undefined,
    motivation: formData.get("motivation"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const chamber = await prisma.chamber.findUnique({
    where: { slug: parsed.data.chamberSlug },
    select: { id: true, status: true },
  });
  if (!chamber || chamber.status !== "ACTIVE") {
    return { status: "error", message: "This chamber is not currently accepting applications." };
  }

  await prisma.membershipApplication.create({
    data: {
      chamberId: chamber.id,
      applicantEmail: parsed.data.email.toLowerCase(),
      applicantName: parsed.data.fullName,
      companyName: parsed.data.companyName,
      tierId: parsed.data.tierId,
      payload: { motivation: parsed.data.motivation },
      status: "PENDING_REVIEW",
    },
  });

  revalidatePath(`/c/${parsed.data.chamberSlug}/admin/applications`);
  return { status: "submitted" };
}
