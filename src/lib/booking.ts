/* ==========================================================================
   Booking configuration

   TO TURN ON BOOKING: paste your scheduling link into `link` below and set
   `provider` to match. Nothing else needs to change.

     Cal.com    provider: "cal"       link: "sandip-paudel/consultation"
                (the part after cal.com/ — not the full URL)
                Use the full "user/event-type" form. A bare username shows
                your whole event-type list, which renders very tall.

     Calendly   provider: "calendly"  link: "https://calendly.com/you/30min"
                (the full URL)

   While `link` is empty the /book page stays online and shows an email
   fallback instead of a broken widget.

   NEXT_PUBLIC_BOOKING_LINK overrides this at build time if you would rather
   keep the link in a GitHub repository variable than in the repo. Note that
   the site is statically exported, so the value is baked in at build time,
   not read in the browser.
   ========================================================================== */

export type BookingProvider = "cal" | "calendly";

export interface BookingConfig {
  provider: BookingProvider;
  link: string;
  fallbackEmail: string;
}

export const bookingConfig: BookingConfig = {
  provider: (process.env.NEXT_PUBLIC_BOOKING_PROVIDER as BookingProvider) || "cal",

  link: process.env.NEXT_PUBLIC_BOOKING_LINK || "",

  fallbackEmail: "sandip.paudel@lbc.edu.np",
};

export const isBookingConfigured = (c: BookingConfig = bookingConfig): boolean =>
  c.link.trim().length > 0;

/**
 * Cal.com wants a bare "user/event" slug. Accept a full URL too, so pasting
 * either form from the Cal dashboard works.
 */
export function normalizeCalLink(link: string): string {
  return link
    .trim()
    .replace(/^https?:\/\/(www\.)?cal\.com\//i, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

/**
 * Calendly wants a full URL. Tolerate a bare slug by prefixing the origin.
 */
export function normalizeCalendlyLink(link: string): string {
  const trimmed = link.trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://calendly.com/${trimmed.replace(/^\/+/, "")}`;
}
