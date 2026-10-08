"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import {
  bookingSchema,
  sessionsSchema,
  fieldErrorsOf,
  type ActionResult,
} from "@/lib/validation";
import {
  configuredTimes,
  dailyCapMessage,
  earliestStart,
  hoursBookedBy,
  lastBookableDate,
} from "@/lib/slots";
import { addHours, formatSession, nepalToUtc } from "@/lib/time";
import { splitByHours } from "@/lib/money";
import {
  sendAdminNotice,
  sendBookingReceived,
  type BookingEmailData,
} from "@/lib/email";
import {
  couponRejectionMessage,
  quote,
  quoteOrFullPrice,
  type Quote,
} from "@/lib/pricing";
import { getAvailabilitySettings } from "@/lib/availability";

/* Neon suspends an idle compute and takes several seconds to wake. Prisma
   waits only 2s for a connection by default, so the first booking after a
   quiet spell fails with P2028 before any work happens. These give the
   database room to come back. */
const TX_OPTIONS = { maxWait: 15_000, timeout: 20_000 };

const SLOT_TAKEN =
  "That time has just been taken by someone else. Please choose another slot.";

export type CouponPreview =
  | { ok: true; quote: Quote }
  | { ok: false; message: string };

/**
 * Check a coupon and return the price it produces.
 *
 * Only ever a preview: createBooking recomputes the quote itself, so a
 * client that fakes or replays this result still pays the right amount.
 */
export async function previewCoupon(
  code: string,
  durationHours: number,
): Promise<CouponPreview> {
  const hours = Number(durationHours);
  if (!Number.isInteger(hours) || hours < 1 || hours > 3) {
    return { ok: false, message: "Choose a session length first." };
  }

  const result = await quote(hours, code);
  if ("rejected" in result) {
    return { ok: false, message: couponRejectionMessage[result.rejected] };
  }
  return { ok: true, quote: result.quote };
}

export async function createBooking(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = bookingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const input = parsed.data;

  // Honeypot. Silently accept so a bot learns nothing, but save nothing.
  if (input.website) return { ok: true, reference: "ok" };

  const { clientName, clientEmail, consultationTopic, transactionId } = input;

  // The sessions arrive as one JSON field, built up client-side.
  let sessions;
  try {
    sessions = sessionsSchema.parse(
      JSON.parse(String(formData.get("sessions") ?? "[]")),
    );
  } catch {
    return { ok: false, message: "Please choose at least one session." };
  }

  // Re-read the rules rather than trusting anything the form sent: the
  // admin may have closed a slot since the page was rendered.
  const rules = await getAvailabilitySettings();
  const cutoff = earliestStart(rules);
  const lastDate = lastBookableDate(rules);

  const priced = sessions.map((sn) => ({
    ...sn,
    startsAt: nepalToUtc(sn.date, sn.timeSlot),
    endsAt: nepalToUtc(sn.date, addHours(sn.timeSlot, sn.durationHours)),
  }));

  for (const sn of priced) {
    if (!rules.sessionLengths.includes(sn.durationHours)) {
      return { ok: false, message: "That session length is not offered." };
    }

    // Every hour the session spans must be inside opening hours. Without
    // this a crafted POST could book 03:00.
    const offered = configuredTimes(sn.date, rules);
    for (let h = 0; h < sn.durationHours; h += 1) {
      if (!offered.includes(addHours(sn.timeSlot, h))) {
        return {
          ok: false,
          message: `${formatSession(sn.date, sn.timeSlot, sn.durationHours)} is not available for booking.`,
        };
      }
    }

    if (sn.startsAt < cutoff) {
      return {
        ok: false,
        message: "One of those times is too soon. Please choose a later slot.",
      };
    }
    if (sn.date > lastDate) {
      return { ok: false, message: "One of those dates is too far ahead." };
    }
  }

  // Sessions must not overlap each other. The database would catch this
  // too, but only as "that time has just been taken", which is a baffling
  // thing to read about a clash you created yourself a moment ago.
  for (let i = 0; i < priced.length; i += 1) {
    for (let j = i + 1; j < priced.length; j += 1) {
      if (
        priced[i].startsAt < priced[j].endsAt &&
        priced[j].startsAt < priced[i].endsAt
      ) {
        return {
          ok: false,
          message: "Two of the sessions you chose overlap. Please adjust them.",
        };
      }
    }
  }

  const totalHours = priced.reduce((sum, sn) => sum + sn.durationHours, 0);

  // Priced here, never from anything the browser sent. An invalid coupon
  // is ignored rather than failing the booking: the client has already
  // paid by this point, and the full price is the safe fallback.
  const submittedCoupon = String(formData.get("couponCode") ?? "").trim();
  const q = await quoteOrFullPrice(totalHours, submittedCoupon);

  // One payment, but revenue is summed per booking row, so the total is
  // split across the sessions by hours. The remainder goes on the first
  // row so the parts add back to exactly what was charged.
  const shares = splitByHours(q.totalNpr, priced.map((sn) => sn.durationHours));
  const discounts = splitByHours(
    q.discountNpr,
    priced.map((sn) => sn.durationHours),
  );

  // Hours wanted per date, for the cap check.
  const hoursByDate = new Map<string, number>();
  for (const sn of priced) {
    hoursByDate.set(sn.date, (hoursByDate.get(sn.date) ?? 0) + sn.durationHours);
  }

  const groupId = randomUUID();

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      // Serialise concurrent submissions from the same person for the same
      // day. Under READ COMMITTED both could otherwise read the old total
      // and both pass the cap. Locks are taken in sorted date order: two
      // multi-day submissions that share dates would otherwise be able to
      // take them in opposite orders and deadlock.
      for (const dateKey of [...hoursByDate.keys()].sort()) {
        const lockKey = `${clientEmail.toLowerCase()}|${dateKey}`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      }

      // Daily cap, per client, per date, read on the transaction's own
      // connection. Checked for each date this booking touches.
      for (const [dateKey, wanted] of hoursByDate) {
        const already = await hoursBookedBy(clientEmail, dateKey, tx);
        if (already + wanted > rules.maxHoursPerClientPerDay) {
          throw new CapExceeded(
            dailyCapMessage(already, rules.maxHoursPerClientPerDay),
          );
        }
      }

      // Every booking belongs to a client record, so the CRM has a person
      // to hang history on rather than a loose email string.
      const client = await tx.client.upsert({
        where: { email: clientEmail.trim().toLowerCase() },
        update: { name: clientName },
        create: { email: clientEmail.trim().toLowerCase(), name: clientName },
      });

      // Created one at a time rather than with createMany, because the
      // exclusion constraint has to reject an individual overlapping
      // session and roll the whole group back with it: a half-booked
      // multi-day order would be worse than none.
      const rows = [];
      for (const [i, sn] of priced.entries()) {
        const [y, m, d] = sn.date.split("-").map(Number);
        rows.push(
          await tx.booking.create({
            data: {
              groupId,
              clientId: client.id,
              clientName,
              clientEmail,
              consultationTopic,
              date: new Date(Date.UTC(y, m - 1, d)),
              timeSlot: sn.timeSlot,
              durationHours: sn.durationHours,
              startsAt: sn.startsAt,
              endsAt: sn.endsAt,
              transactionId,
              amountNpr: shares[i],
              discountNpr: discounts[i],
              couponCode: q.couponCode,
            },
          }),
        );
      }
      return rows;
    }, TX_OPTIONS);
  } catch (err) {
    if (err instanceof CapExceeded) {
      return { ok: false, message: err.message };
    }
    // The exclusion constraint rejected an overlap: someone booked this slot
    // between the availability query and this insert. This is the race the
    // constraint exists to catch, and it is expected under load.
    if (isOverlapViolation(err)) {
      return { ok: false, message: SLOT_TAKEN };
    }
    console.error("[booking] create failed:", err);
    return {
      ok: false,
      message: "Something went wrong saving your booking. Please try again.",
    };
  }

  // Email must never fail the booking: it is already saved. The whole
  // group goes in one message: the client paid once and should be told
  // once, not handed one email per day they booked.
  const first = created[0];
  const payload: BookingEmailData = {
    id: groupId,
    clientName: first.clientName,
    clientEmail: first.clientEmail,
    consultationTopic: first.consultationTopic,
    sessions: priced.map((sn) => ({
      dateKey: sn.date,
      timeSlot: sn.timeSlot,
      durationHours: sn.durationHours,
    })),
    transactionId: first.transactionId,
    amountNpr: q.totalNpr,
    discountNpr: q.discountNpr,
    couponCode: q.couponCode,
  };

  const [toClient, toAdmin] = await Promise.all([
    sendBookingReceived(payload),
    sendAdminNotice(payload),
  ]);

  if (!toClient || !toAdmin) {
    await prisma.booking
      .updateMany({ where: { groupId }, data: { emailFailed: true } })
      .catch((e) => console.error("[booking] could not flag email failure:", e));
  }

  return { ok: true, reference: first.id };
}

class CapExceeded extends Error {}

/** Postgres raises 23P01 (exclusion_violation) when the ranges overlap. */
function isOverlapViolation(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2010 wraps a raw database error; P2002 is a unique violation.
    if (err.code === "P2002") return true;
    const meta = err.meta as { code?: string } | undefined;
    if (meta?.code === "23P01") return true;
  }
  return (
    err instanceof Error &&
    (err.message.includes("23P01") ||
      err.message.includes("Booking_no_overlap"))
  );
}
