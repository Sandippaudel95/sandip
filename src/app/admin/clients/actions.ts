"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { fieldErrorsOf } from "@/lib/validation";

/* Every action re-checks the session. A Server Action is its own endpoint
   and can be POSTed to directly, so the route guard alone is not enough. */
async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authorised.");
}

export type ClientActionResult =
  | { ok: true; id: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const clientSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  organisation: z.string().trim().max(160).optional().or(z.literal("")),
  level: z.string().trim().max(60).optional().or(z.literal("")),
  status: z.enum(["LEAD", "ACTIVE", "PAST", "ARCHIVED"]),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  nextAction: z.string().trim().max(300).optional().or(z.literal("")),
  nextActionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});

const orNull = (v: string | undefined) => (v && v.length ? v : null);
/** A plain date column wants midnight UTC, not an instant. */
const dateOrNull = (v: string | undefined) =>
  v && v.length ? new Date(`${v}T00:00:00.000Z`) : null;

export async function saveClient(
  id: string | null,
  formData: FormData,
): Promise<ClientActionResult> {
  await requireAdmin();

  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const d = parsed.data;

  const data = {
    name: d.name,
    email: d.email,
    phone: orNull(d.phone),
    organisation: orNull(d.organisation),
    level: orNull(d.level),
    status: d.status,
    notes: orNull(d.notes),
    nextAction: orNull(d.nextAction),
    nextActionDate: dateOrNull(d.nextActionDate),
  };

  try {
    const saved = id
      ? await prisma.client.update({ where: { id }, data })
      : await prisma.client.create({ data });

    revalidatePath("/admin/clients");
    revalidatePath("/admin/dashboard");
    if (id) revalidatePath(`/admin/clients/${id}`);
    return { ok: true, id: saved.id };
  } catch (err) {
    // Client.email is unique; a second client with the same address is the
    // one failure worth naming rather than swallowing.
    if (
      err instanceof Error &&
      (err.message.includes("Unique constraint") || err.message.includes("P2002"))
    ) {
      return {
        ok: false,
        message: "A client with that email already exists.",
        fieldErrors: { email: "Already used by another client." },
      };
    }
    console.error("[clients] save failed:", err);
    return { ok: false, message: "Could not save. Please try again." };
  }
}

/** Clear the next action once it has been dealt with. */
export async function clearNextAction(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  await prisma.client.update({
    where: { id },
    data: { nextAction: null, nextActionDate: null },
  });
  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/clients/${id}`);
  return { ok: true };
}

/**
 * Append a dated line to the client's notes.
 *
 * Notes are one text field rather than a table: a running log is all that
 * is needed here, and it keeps the client record to a single row.
 */
export async function appendNote(
  id: string,
  note: string,
): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const text = note.trim();
  if (!text) return { ok: false, message: "Write something first." };

  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) return { ok: false, message: "Client not found." };

  const stamp = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kathmandu",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const line = `${stamp} — ${text}`;
  await prisma.client.update({
    where: { id },
    data: { notes: client.notes ? `${line}\n${client.notes}` : line },
  });

  revalidatePath(`/admin/clients/${id}`);
  return { ok: true };
}
