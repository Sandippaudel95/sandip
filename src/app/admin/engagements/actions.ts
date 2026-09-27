"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { fieldErrorsOf } from "@/lib/validation";

async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authorised.");
}

export type EngagementActionResult =
  | { ok: true; id: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const engagementSchema = z.object({
  /** Either an existing client, or blank and a new one is created below. */
  clientId: z.string().trim().optional().or(z.literal("")),
  newClientName: z.string().trim().max(120).optional().or(z.literal("")),
  newClientEmail: z.string().trim().max(200).optional().or(z.literal("")),

  type: z.enum([
    "THESIS_REVIEW",
    "PAPER_REVIEW",
    "DATA_ANALYSIS",
    "RESEARCH_CONSULTANCY",
    "TRAINING",
    "OTHER",
  ]),
  title: z.string().trim().min(3, "Give the work a short title.").max(200),
  status: z.enum([
    "ENQUIRY",
    "QUOTED",
    "AGREED",
    "IN_PROGRESS",
    "DELIVERED",
    "CANCELLED",
  ]),
  feeNpr: z.coerce.number().int().min(0, "Cannot be negative.").max(100_000_000),
  amountPaidNpr: z.coerce.number().int().min(0, "Cannot be negative.").max(100_000_000),
  startedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  dueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  completedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});

const dateOrNull = (v: string | undefined) =>
  v && v.length ? new Date(`${v}T00:00:00.000Z`) : null;
const orNull = (v: string | undefined) => (v && v.length ? v : null);

export async function saveEngagement(
  id: string | null,
  formData: FormData,
): Promise<EngagementActionResult> {
  await requireAdmin();

  const parsed = engagementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const d = parsed.data;

  if (d.amountPaidNpr > d.feeNpr) {
    return {
      ok: false,
      message: "Paid is more than the fee.",
      fieldErrors: {
        amountPaidNpr: "Cannot be more than the agreed fee.",
      },
    };
  }

  // Resolve the client first: either an existing one, or create from the
  // name and email typed into the form.
  let clientId = d.clientId ?? "";
  if (!clientId) {
    const name = (d.newClientName ?? "").trim();
    const email = (d.newClientEmail ?? "").trim().toLowerCase();
    if (!name || !email) {
      return {
        ok: false,
        message: "Choose an existing client, or give a name and email.",
        fieldErrors: { newClientEmail: "Needed for a new client." },
      };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return {
        ok: false,
        message: "That email does not look right.",
        fieldErrors: { newClientEmail: "Enter a valid email." },
      };
    }
    // Matched on the lowercased address so a second spelling of an existing
    // client reuses their record rather than colliding with the unique index.
    const client = await prisma.client.upsert({
      where: { email },
      update: {},
      create: { email, name },
    });
    clientId = client.id;
  }

  const data = {
    clientId,
    type: d.type,
    title: d.title,
    status: d.status,
    feeNpr: d.feeNpr,
    amountPaidNpr: d.amountPaidNpr,
    startedAt: dateOrNull(d.startedAt),
    dueAt: dateOrNull(d.dueAt),
    // Delivered work without a date recorded gets today, so it counts in
    // the right period rather than falling back to when it was created.
    completedAt:
      dateOrNull(d.completedAt) ??
      (d.status === "DELIVERED" ? new Date() : null),
    notes: orNull(d.notes),
  };

  try {
    const saved = id
      ? await prisma.engagement.update({ where: { id }, data })
      : await prisma.engagement.create({ data });

    revalidatePath("/admin/engagements");
    revalidatePath("/admin/dashboard");
    revalidatePath(`/admin/clients/${clientId}`);
    return { ok: true, id: saved.id };
  } catch (err) {
    console.error("[engagements] save failed:", err);
    return { ok: false, message: "Could not save. Please try again." };
  }
}

export async function deleteEngagement(
  id: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const existing = await prisma.engagement.findUnique({ where: { id } });
  if (!existing) return { ok: false, message: "Not found." };

  await prisma.engagement.delete({ where: { id } });
  revalidatePath("/admin/engagements");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/clients/${existing.clientId}`);
  return { ok: true };
}
