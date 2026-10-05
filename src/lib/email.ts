import { Resend } from "resend";
import { formatDateKey, formatSession } from "./time";
import { profile } from "@/content/profile";
import { npr } from "@/content/services";

/* ==========================================================================
   Notification email.

   Every function here resolves to a boolean and never throws. A booking must
   survive Resend being down, a missing key or an unverified domain: losing a
   client's slot because an email failed would be worse than the silence.
   Callers record the false and the dashboard flags it.
   ========================================================================== */

const apiKey = process.env.RESEND_API_KEY;
const FROM =
  process.env.FROM_EMAIL ?? "Sandip Paudel <onboarding@resend.dev>";
/* Deliberately not ADMIN_EMAIL: that one is the sign-in identity in
   lib/auth.ts, and pointing it at whichever inbox is handiest for alerts
   would quietly change the credentials for the admin panel. */
const ADMIN_TO =
  process.env.NOTIFY_EMAIL ?? process.env.ADMIN_EMAIL ?? profile.emails[0];
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sandipaudel.com.np"
).replace(/\/$/, "");

const resend = apiKey ? new Resend(apiKey) : null;

export interface BookingSessionLine {
  dateKey: string;
  timeSlot: string;
  durationHours: number;
}

export interface BookingEmailData {
  /** The group reference, shared by every session that was paid for together. */
  id: string;
  clientName: string;
  clientEmail: string;
  consultationTopic: string;
  /** One or more days. A single-day booking has one entry. */
  sessions: BookingSessionLine[];
  transactionId: string;
  amountNpr: number;
  discountNpr: number;
  couponCode: string | null;
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;padding:24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px">
<tr><td style="padding:24px 28px;border-bottom:1px solid #e5e7eb">
  <p style="margin:0;font-family:Georgia,serif;font-size:18px;font-weight:600;color:#0a2540">${esc(profile.name)}</p>
  <p style="margin:2px 0 0;font-size:13px;color:#6b7280">${esc(profile.role)}</p>
</td></tr>
<tr><td style="padding:28px">
  <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:20px;color:#111827">${esc(title)}</h1>
  ${body}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280">
  <a href="${SITE_URL}" style="color:#0a2540">sandipaudel.com.np</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (t: string) =>
  `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151">${t}</p>`;

function details(rows: [string, string][]): string {
  return `<table role="presentation" width="100%" style="margin:0 0 16px;border-collapse:collapse">${rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:7px 0;font-size:13px;color:#6b7280;width:38%">${esc(k)}</td><td style="padding:7px 0;font-size:14px;color:#111827">${esc(v)}</td></tr>`,
    )
    .join("")}</table>`;
}

async function send(
  to: string,
  subject: string,
  html: string,
  replyTo?: string,
): Promise<boolean> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY is not set; skipping:", subject);
    return false;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    if (error) {
      console.error("[email] Resend rejected the message:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send failed:", err);
    return false;
  }
}

const totalHours = (b: BookingEmailData): number =>
  b.sessions.reduce((sum, s) => sum + s.durationHours, 0);

const sessionRows = (b: BookingEmailData): [string, string][] => [
  // One row per day, numbered only when there is more than one, so a
  // single-session booking reads exactly as it did before.
  ...b.sessions.map(
    (s, i): [string, string] => [
      b.sessions.length > 1 ? `Session ${i + 1}` : "When",
      formatSession(s.dateKey, s.timeSlot, s.durationHours),
    ],
  ),
  [
    b.sessions.length > 1 ? "Total time" : "Duration",
    `${totalHours(b)} hour${totalHours(b) > 1 ? "s" : ""}`,
  ],
  ["Topic", b.consultationTopic],
  ["Amount", npr(b.amountNpr)],
  ...(b.discountNpr > 0
    ? ([
        [
          "Discount",
          `${npr(b.discountNpr)} off${b.couponCode ? ` (${b.couponCode})` : ""}`,
        ],
      ] as [string, string][])
    : []),
  ["Transaction ID", b.transactionId],
  ["Reference", b.id],
];

/** To the client, immediately after they submit. */
export function sendBookingReceived(b: BookingEmailData): Promise<boolean> {
  return send(
    b.clientEmail,
    `Booking received: ${b.id}`,
    layout(
      "Your booking is awaiting verification",
      p(`Dear ${esc(b.clientName)},`) +
        p(
          "Thank you for booking a consultation. Your payment reference has been received and your booking will be confirmed once the payment has been verified. You will get another email when that happens.",
        ) +
        details(sessionRows(b)) +
        p(
          "If any of the above is wrong, reply to this email and it can be corrected.",
        ),
    ),
    ADMIN_TO,
  );
}

/** To Sandip, so a booking is never sitting unseen in the dashboard. */
export function sendAdminNotice(b: BookingEmailData): Promise<boolean> {
  return send(
    ADMIN_TO,
    `New booking to verify: ${b.clientName}`,
    layout(
      "A booking is waiting for verification",
      p(
        `Check the transaction ID against your bank or Fonepay app, then confirm or reject it in the <a href="${SITE_URL}/admin/dashboard" style="color:#0a2540">admin dashboard</a>.`,
      ) +
        details([
          ["Name", b.clientName],
          ["Email", b.clientEmail],
          ...sessionRows(b),
        ]),
    ),
    b.clientEmail,
  );
}

/** To the client when the payment is verified. */
export function sendBookingConfirmed(
  b: BookingEmailData,
  note?: string | null,
): Promise<boolean> {
  return send(
    b.clientEmail,
    `Booking confirmed: ${b.id}`,
    layout(
      "Your booking is confirmed",
      p(`Dear ${esc(b.clientName)},`) +
        p(
          "Your payment has been verified and your consultation is confirmed.",
        ) +
        details([...sessionRows(b), ["Note", note ?? ""]]) +
        p(
          "Please send or bring any drafts, data or questions you would like to discuss.",
        ),
    ),
    ADMIN_TO,
  );
}

export interface WorkEnquiryData {
  id: string;
  clientName: string;
  clientEmail: string;
  type: string;
  title: string;
  notes: string;
  dueAt: string | null;
  paidNpr: number;
  transactionId: string | null;
}

const WORK_TYPE_LABEL: Record<string, string> = {
  THESIS_REVIEW: "Thesis review",
  PAPER_REVIEW: "Paper review",
  DATA_ANALYSIS: "Data analysis",
  RESEARCH_CONSULTANCY: "Research consultancy",
  TRAINING: "Training",
  OTHER: "Other",
};

/**
 * A request for negotiated work, to both sides at once.
 *
 * Deliberately promises a quote rather than confirming anything: nothing
 * has been priced or agreed at this point, and a message that reads like
 * a confirmation would set the wrong expectation about both.
 */
export async function sendWorkEnquiry(d: WorkEnquiryData): Promise<boolean> {
  const rows: [string, string][] = [
    ["Work", WORK_TYPE_LABEL[d.type] ?? d.type],
    ["Title", d.title],
    ["Needed by", d.dueAt ? formatDateKey(d.dueAt) : "Not specified"],
    ...(d.paidNpr > 0
      ? ([
          ["Paid on submission", npr(d.paidNpr)],
          ["Payment reference", d.transactionId ?? ""],
        ] as [string, string][])
      : []),
    ["Reference", d.id],
  ];

  const toClient = send(
    d.clientEmail,
    `Request received: ${d.title}`,
    layout(
      "Your request has been received",
      p(`Dear ${esc(d.clientName)},`) +
        p(
          d.paidNpr > 0
            ? "Thank you for getting in touch, and for the payment. It will be checked against the account and set against this work once the scope is confirmed. A quote follows by email, usually within a couple of days."
            : "Thank you for getting in touch. Work of this kind is quoted individually, so nothing has been priced or scheduled yet. You will receive a quote by email, usually within a couple of days.",
        ) +
        details(rows) +
        p("Reply to this email if you need to add anything."),
    ),
    ADMIN_TO,
  );

  const toAdmin = send(
    ADMIN_TO,
    `New work request: ${WORK_TYPE_LABEL[d.type] ?? d.type}`,
    layout(
      "A request is waiting for a quote",
      p(
        `From ${esc(d.clientName)} (${esc(d.clientEmail)}). It is in the <a href="${SITE_URL}/admin/engagements" style="color:#0a2540">admin panel</a> as an enquiry.`,
      ) +
        details(rows) +
        p(`<strong>What they wrote</strong><br>${esc(d.notes)}`),
    ),
    d.clientEmail,
  );

  const [a, b] = await Promise.all([toClient, toAdmin]);
  return a && b;
}

export interface PaymentRequestData {
  clientName: string;
  clientEmail: string;
  billedNpr: number;
  receivedNpr: number;
  dueNpr: number;
  advanceLeftNpr: number;
  sessionsDelivered: number;
  sessionsRemaining: number;
}

/**
 * Ask the client for the next payment.
 *
 * States the position plainly rather than chasing: what was agreed, what
 * has been received, what is left. Someone who has already paid a large
 * advance deserves to see it acknowledged in the same message.
 */
export function sendPaymentRequest(d: PaymentRequestData): Promise<boolean> {
  const used = d.advanceLeftNpr <= 0;
  return send(
    d.clientEmail,
    `Your sessions with ${profile.name}`,
    layout(
      used ? "Your advance has been used" : "Your sessions so far",
      p(`Dear ${esc(d.clientName)},`) +
        p(
          used
            ? "Thank you for the advance you paid. It now covers all of the sessions completed so far, so the remaining balance is due before we continue."
            : "A short summary of where your sessions stand.",
        ) +
        details([
          ["Agreed total", npr(d.billedNpr)],
          ["Received so far", npr(d.receivedNpr)],
          ["Still to pay", npr(d.dueNpr)],
          [
            "Sessions completed",
            `${d.sessionsDelivered}${
              d.sessionsRemaining
                ? ` · ${d.sessionsRemaining} still to come`
                : ""
            }`,
          ],
        ]) +
        p(
          "Payment can be made to the same account as before. Reply to this email if anything above does not match your records.",
        ),
    ),
    ADMIN_TO,
  );
}

/**
 * To the client when the admin moves a session.
 *
 * Its own template rather than reusing the confirmation: a client who
 * reads "your booking is confirmed" after a time change may well not
 * notice the time changed, and turn up on the original day.
 */
export function sendBookingRescheduled(
  b: BookingEmailData,
  note?: string | null,
): Promise<boolean> {
  return send(
    b.clientEmail,
    `Your session has been moved: ${b.id}`,
    layout(
      "Your session has been moved",
      p(`Dear ${esc(b.clientName)},`) +
        p(
          "Your consultation has been rescheduled. The new time is below; please check it against your diary.",
        ) +
        details([...sessionRows(b), ["Reason", note ?? ""]]) +
        p(
          "If the new time does not work for you, reply to this email and another can be arranged.",
        ),
    ),
    ADMIN_TO,
  );
}

/** To the client when the payment could not be verified. */
export function sendBookingRejected(
  b: BookingEmailData,
  note?: string | null,
): Promise<boolean> {
  return send(
    b.clientEmail,
    `Booking not confirmed: ${b.id}`,
    layout(
      "Your payment could not be verified",
      p(`Dear ${esc(b.clientName)},`) +
        p(
          "Unfortunately the payment for this booking could not be verified, so the booking has not been confirmed and the time has been released.",
        ) +
        details([...sessionRows(b), ["Reason", note ?? ""]]) +
        p(
          "If you believe this is a mistake, reply to this email with your payment details.",
        ),
    ),
    ADMIN_TO,
  );
}
