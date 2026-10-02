"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth, signIn, signOut } from "@/lib/auth";
import { nepalDateKey } from "@/lib/time";
import {
  sendBookingConfirmed,
  sendBookingRejected,
  type BookingEmailData,
} from "@/lib/email";

/* Every action here re-checks the session. Middleware guards the routes, but
   a Server Action is its own endpoint and can be POSTed to directly, so
   route protection alone would not secure these. */
async function requireAdmin(): Promise<void> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authorised.");
}

export type AdminActionResult = { ok: boolean; message?: string };

/**
 * Remove a booking from the record entirely.
 *
 * Distinct from rejecting: rejecting cancels the session, frees the slot
 * and emails the client an explanation. This erases the row, and is for
 * entries that should never have been in the history — test submissions,
 * spam, duplicates.
 *
 * Deliberately sends nothing. A rejection notice has already gone out if
 * one was warranted, and there is no sensible message to send a client
 * about a record being deleted.
 */
export async function deleteBooking(id: string): Promise<AdminActionResult> {
  await requireAdmin();
  try {
    await prisma.booking.delete({ where: { id } });
  } catch (err) {
    console.error("[admin] booking delete failed:", err);
    return { ok: false, message: "Could not delete. Please try again." };
  }
  // A verified booking counts towards revenue, and the slot it held is
  // released, so the dashboard and the client's history both change.
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/clients");
  return { ok: true };
}

async function loadForEmail(id: string): Promise<BookingEmailData | null> {
  const b = await prisma.booking.findUnique({ where: { id } });
  if (!b) return null;
  return {
    id: b.id,
    clientName: b.clientName,
    clientEmail: b.clientEmail,
    consultationTopic: b.consultationTopic,
    dateKey: nepalDateKey(b.startsAt),
    timeSlot: b.timeSlot,
    durationHours: b.durationHours,
    transactionId: b.transactionId,
    amountNpr: b.amountNpr,
    discountNpr: b.discountNpr,
    couponCode: b.couponCode,
  };
}

/** Verify the payment and confirm the booking. */
export async function confirmBooking(
  id: string,
  note?: string,
): Promise<AdminActionResult> {
  await requireAdmin();

  const current = await prisma.booking.findUnique({ where: { id } });
  if (!current) return { ok: false, message: "Booking not found." };
  if (current.bookingStatus === "CONFIRMED") {
    return { ok: false, message: "That booking is already confirmed." };
  }
  if (current.bookingStatus === "CANCELLED") {
    return {
      ok: false,
      message:
        "That booking was cancelled, so its time may have been taken. Ask the client to book again.",
    };
  }

  await prisma.booking.update({
    where: { id },
    data: {
      paymentStatus: "VERIFIED",
      bookingStatus: "CONFIRMED",
      adminNote: note?.trim() || null,
    },
  });

  const payload = await loadForEmail(id);
  const sent = payload
    ? await sendBookingConfirmed(payload, note?.trim() || null)
    : false;
  await prisma.booking.update({
    where: { id },
    data: { emailFailed: !sent },
  });

  revalidatePath("/admin/dashboard");
  return {
    ok: true,
    message: sent
      ? "Confirmed and the client has been emailed."
      : "Confirmed, but the email could not be sent. Contact the client directly.",
  };
}

/** Reject the payment and release the slot. */
export async function rejectBooking(
  id: string,
  note?: string,
): Promise<AdminActionResult> {
  await requireAdmin();

  const current = await prisma.booking.findUnique({ where: { id } });
  if (!current) return { ok: false, message: "Booking not found." };
  if (current.bookingStatus === "CANCELLED") {
    return { ok: false, message: "That booking is already cancelled." };
  }

  // CANCELLED is what frees the slot: the overlap constraint ignores
  // cancelled rows, so the time returns to the pool.
  await prisma.booking.update({
    where: { id },
    data: {
      paymentStatus: "REJECTED",
      bookingStatus: "CANCELLED",
      adminNote: note?.trim() || null,
    },
  });

  const payload = await loadForEmail(id);
  const sent = payload
    ? await sendBookingRejected(payload, note?.trim() || null)
    : false;
  await prisma.booking.update({
    where: { id },
    data: { emailFailed: !sent },
  });

  revalidatePath("/admin/dashboard");
  return {
    ok: true,
    message: sent
      ? "Rejected and the client has been emailed."
      : "Rejected, but the email could not be sent. Contact the client directly.",
  };
}

/** Close off a session that has already happened. */
export async function markCompleted(id: string): Promise<AdminActionResult> {
  await requireAdmin();

  const current = await prisma.booking.findUnique({ where: { id } });
  if (!current) return { ok: false, message: "Booking not found." };
  if (current.bookingStatus !== "CONFIRMED") {
    return {
      ok: false,
      message: `Only a confirmed booking can be marked completed; this one is ${current.bookingStatus.toLowerCase()}.`,
    };
  }

  await prisma.booking.update({
    where: { id },
    data: { bookingStatus: "COMPLETED" },
  });

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/bookings");
  return { ok: true, message: "Marked completed." };
}

/**
 * Undo a completion, putting the session back to confirmed.
 *
 * Marking completed is one click and easy to hit on the wrong row, so it
 * needs a way back. Only COMPLETED is accepted: reopening a cancelled
 * booking would silently re-take a slot that has since been given away.
 */
export async function reopenBooking(id: string): Promise<AdminActionResult> {
  await requireAdmin();

  const current = await prisma.booking.findUnique({ where: { id } });
  if (!current) return { ok: false, message: "Booking not found." };
  if (current.bookingStatus !== "COMPLETED") {
    return {
      ok: false,
      message: `Only a completed booking can be reopened; this one is ${current.bookingStatus.toLowerCase()}.`,
    };
  }

  await prisma.booking.update({
    where: { id },
    data: { bookingStatus: "CONFIRMED" },
  });

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/bookings");
  return { ok: true, message: "Reopened as confirmed." };
}

export async function signInAction(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/admin/dashboard",
    });
    return null;
  } catch (err) {
    // NextAuth signals a successful redirect by throwing; let it through.
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    if (
      typeof err === "object" &&
      err !== null &&
      "digest" in err &&
      String((err as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    return "Those details were not recognised.";
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
