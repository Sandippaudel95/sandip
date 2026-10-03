/* Send one of each booking email to your own inboxes, through the same
 * functions the site uses — not a raw Resend call — so the templates,
 * FROM_EMAIL, reply-to and NOTIFY_EMAIL are all exercised for real.
 *
 *   npx tsx --env-file=.env.local scripts/send-test-email.ts
 *
 * Safe to run any time: it writes nothing to the database and only ever
 * mails the two addresses below.
 */
import {
  sendBookingReceived,
  sendAdminNotice,
  sendBookingConfirmed,
  type BookingEmailData,
} from "../src/lib/email";

const CLIENT_INBOX = "sandip.paudel@lbc.edu.np";

const sample: BookingEmailData = {
  id: "test-" + Date.now().toString(36),
  clientName: "Test Client",
  clientEmail: CLIENT_INBOX,
  consultationTopic: "Checking that booking email actually arrives",
  // Two sessions, so the multi-day layout is what gets exercised.
  sessions: [
    { dateKey: "2026-10-09", timeSlot: "16:00", durationHours: 1 },
    { dateKey: "2026-10-10", timeSlot: "10:00", durationHours: 2 },
  ],
  transactionId: "TEST-TXN-0001",
  amountNpr: 15000,
  discountNpr: 0,
  couponCode: null,
};

// Wrapped rather than top-level await: the project is CommonJS, so tsx
// compiles this to CJS where top-level await is a syntax error.
async function main() {
  const results = {
    "client: booking received": await sendBookingReceived(sample),
    "you: new booking to verify": await sendAdminNotice(sample),
    "client: booking confirmed": await sendBookingConfirmed(
      sample,
      "This is a test of the notification system; no real session is booked.",
    ),
  };

  console.log("\nfrom:   ", process.env.FROM_EMAIL);
  console.log("notify: ", process.env.NOTIFY_EMAIL);
  console.log("client: ", CLIENT_INBOX, "\n");
  for (const [label, ok] of Object.entries(results)) {
    console.log(`${ok ? "sent  " : "FAILED"}  ${label}`);
  }
  process.exit(Object.values(results).every(Boolean) ? 0 : 1);
}

void main();
