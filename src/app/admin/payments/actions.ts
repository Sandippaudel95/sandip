"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { fieldErrorsOf } from "@/lib/validation";
import {
  advanceLeftNpr,
  billedNpr,
  receivedNpr,
  stillOwedNpr,
} from "@/lib/money";
import { sendPaymentRequest } from "@/lib/email";

/* Every action re-checks the session: a Server Action is its own endpoint
   and can be POSTed to directly, so the route guard is not enough. */
async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authorised.");
}

export type PaymentResult =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  amountNpr: z.coerce
    .number()
    .int()
    .min(1, "Enter the amount received.")
    .max(10_000_000),
  receivedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date it arrived."),
  method: z.string().trim().max(60).optional().or(z.literal("")),
  note: z.string().trim().max(300).optional().or(z.literal("")),
  groupId: z.string().trim().max(100).optional().or(z.literal("")),
});

/** Record money received from a client. */
export async function recordPayment(
  clientId: string,
  formData: FormData,
): Promise<PaymentResult> {
  await requireAdmin();

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const d = parsed.data;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, message: "Client not found." };

  try {
    await prisma.payment.create({
      data: {
        clientId,
        groupId: d.groupId || null,
        amountNpr: d.amountNpr,
        // A plain DATE column, so midnight UTC is the date itself rather
        // than an instant that could land on the day either side.
        receivedAt: new Date(`${d.receivedAt}T00:00:00.000Z`),
        method: d.method || null,
        note: d.note || null,
      },
    });
  } catch (err) {
    console.error("[payments] record failed:", err);
    return { ok: false, message: "Could not save. Please try again." };
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/bookings");
  return { ok: true };
}

export async function deletePayment(id: string): Promise<PaymentResult> {
  await requireAdmin();
  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) return { ok: false, message: "Payment not found." };

  try {
    await prisma.payment.delete({ where: { id } });
  } catch (err) {
    console.error("[payments] delete failed:", err);
    return { ok: false, message: "Could not delete. Please try again." };
  }

  revalidatePath(`/admin/clients/${existing.clientId}`);
  revalidatePath("/admin/clients");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/bookings");
  return { ok: true };
}

/**
 * Ask the client for the next payment.
 *
 * Never automatic, even though the advance running out is detectable:
 * how a request for money is worded, and when it is sent, is a judgement
 * about the relationship rather than a trigger condition.
 */
export async function requestPayment(
  clientId: string,
): Promise<PaymentResult> {
  await requireAdmin();

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { bookings: true, payments: true },
  });
  if (!client) return { ok: false, message: "Client not found." };

  const sessions = client.bookings;
  const delivered = sessions.filter(
    (s) => s.bookingStatus === "COMPLETED",
  ).length;
  const remaining = sessions.filter(
    (s) => s.bookingStatus !== "COMPLETED" && s.bookingStatus !== "CANCELLED",
  ).length;

  const sent = await sendPaymentRequest({
    clientName: client.name,
    clientEmail: client.email,
    billedNpr: billedNpr(sessions),
    receivedNpr: receivedNpr(client.payments),
    dueNpr: stillOwedNpr(sessions, client.payments),
    advanceLeftNpr: advanceLeftNpr(client.payments, sessions),
    sessionsDelivered: delivered,
    sessionsRemaining: remaining,
  });

  if (!sent) {
    return {
      ok: false,
      message: "The email could not be sent. Contact the client directly.",
    };
  }
  return { ok: true };
}
