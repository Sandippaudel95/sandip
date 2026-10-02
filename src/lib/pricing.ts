import { prisma } from "@/lib/prisma";
import { coupons, type Coupon } from "@/content/coupons";
import { HOURLY_RATE } from "@/content/services";
import { nepalDateKey } from "./time";

/* ==========================================================================
   Price calculation.

   SERVER ONLY, because it imports the coupon list. This is the one place
   that decides what a booking costs: the browser never sends an amount and
   is never believed if it does. createBooking recomputes from scratch at
   insert time, so a stale or forged preview cannot change what is charged.
   ========================================================================== */

export interface Quote {
  baseNpr: number;
  discountNpr: number;
  totalNpr: number;
  couponCode: string | null;
  couponLabel: string | null;
}

export type CouponRejection =
  | "unknown"
  | "inactive"
  | "expired"
  | "exhausted"
  | "min-hours";

export const couponRejectionMessage: Record<CouponRejection, string> = {
  unknown: "That code was not recognised. Check the spelling and try again.",
  inactive: "That code is no longer available.",
  expired: "That code has expired.",
  exhausted: "That code has already been fully claimed.",
  "min-hours": "That code applies to longer sessions only.",
};

export function basePrice(durationHours: number): number {
  return HOURLY_RATE * durationHours;
}

function find(code: string): Coupon | undefined {
  const wanted = code.trim().toLowerCase();
  return coupons.find((c) => c.code.toLowerCase() === wanted);
}

/** Rupees off a given base, never more than the base itself. */
function discountFor(coupon: Coupon, baseNpr: number): number {
  const raw = coupon.percentOff
    ? Math.round((baseNpr * coupon.percentOff) / 100)
    : (coupon.amountOff ?? 0);
  return Math.min(Math.max(raw, 0), baseNpr);
}

/**
 * Check a code and price the session with it.
 *
 * Redemptions are counted from bookings rather than a stored counter, so the
 * count cannot drift from reality and a cancelled booking returns its use to
 * the pool.
 */
export async function quote(
  durationHours: number,
  code?: string | null,
): Promise<{ quote: Quote } | { rejected: CouponRejection }> {
  const baseNpr = basePrice(durationHours);

  const trimmed = (code ?? "").trim();
  if (!trimmed) {
    return {
      quote: {
        baseNpr,
        discountNpr: 0,
        totalNpr: baseNpr,
        couponCode: null,
        couponLabel: null,
      },
    };
  }

  const coupon = find(trimmed);
  if (!coupon) return { rejected: "unknown" };
  if (!coupon.active) return { rejected: "inactive" };
  if (coupon.expires && nepalDateKey() > coupon.expires) {
    return { rejected: "expired" };
  }
  if (coupon.minHours && durationHours < coupon.minHours) {
    return { rejected: "min-hours" };
  }

  if (coupon.maxRedemptions != null) {
    const used = await prisma.booking.count({
      where: {
        couponCode: { equals: coupon.code, mode: "insensitive" },
        bookingStatus: { not: "CANCELLED" },
      },
    });
    if (used >= coupon.maxRedemptions) return { rejected: "exhausted" };
  }

  const discountNpr = discountFor(coupon, baseNpr);

  return {
    quote: {
      baseNpr,
      discountNpr,
      totalNpr: baseNpr - discountNpr,
      // Store the canonical casing, not whatever the client typed.
      couponCode: coupon.code,
      couponLabel: coupon.label,
    },
  };
}

/**
 * Price a session, falling back to full price if the coupon is not valid.
 *
 * Used at insert time. By then the client has already paid, so a bad code
 * must not fail the booking; charging the undiscounted price is the safe
 * direction to be wrong in, and the admin can adjust afterwards.
 */
export async function quoteOrFullPrice(
  durationHours: number,
  code?: string | null,
): Promise<Quote> {
  const withCode = await quote(durationHours, code);
  if ("quote" in withCode) return withCode.quote;

  const baseNpr = basePrice(durationHours);
  return {
    baseNpr,
    discountNpr: 0,
    totalNpr: baseNpr,
    couponCode: null,
    couponLabel: null,
  };
}
