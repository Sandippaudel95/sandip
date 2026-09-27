/* ==========================================================================
   Discount coupons.

   SERVER ONLY. Nothing here may be imported into a client component, or the
   whole code list ships to the browser and anyone can read every unpublished
   code. Codes are checked through the previewCoupon Server Action; the
   browser only ever learns whether the one code it typed is valid.

   To add a coupon, add an entry. To stop one, set `active: false` or let it
   expire — do not delete it, or past bookings lose the record of what was
   applied.
   ========================================================================== */

export interface Coupon {
  /** Compared case-insensitively; write it however reads best. */
  code: string;
  /** Shown to the client when the code is accepted. */
  label: string;
  /** Percentage off the total, 1-100. Use this or amountOff, not both. */
  percentOff?: number;
  /** Flat rupees off the total. */
  amountOff?: number;
  /** Last day the code works, "YYYY-MM-DD" in Nepal time. Inclusive. */
  expires?: string;
  /** Total bookings that may use this code across all clients. */
  maxRedemptions?: number;
  /** Only applies to sessions of at least this many hours. */
  minHours?: number;
  active: boolean;
}

export const coupons: Coupon[] = [
  {
    code: "STUDENT20",
    label: "Student discount, 20% off",
    percentOff: 20,
    active: true,
  },
  {
    code: "LBC50",
    label: "Lumbini Banijya Campus, Rs. 500 off",
    amountOff: 500,
    active: true,
  },
  {
    code: "LONGSESSION",
    label: "Two-hour session, 10% off",
    percentOff: 10,
    minHours: 2,
    active: true,
  },
];
