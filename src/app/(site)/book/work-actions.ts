"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fieldErrorsOf } from "@/lib/validation";
import { sendWorkEnquiry } from "@/lib/email";

/* Requests for negotiated work: thesis and paper review, data analysis,
   commissioned studies, training.

   These have no slot and no price at submission time, so they are not
   bookings. They land as an Engagement at status ENQUIRY, which is the
   record the admin panel already manages, and are quoted afterwards. */

/* Neon suspends an idle compute and takes several seconds to wake, while
   Prisma waits only 2s for a connection: the first request after a quiet
   spell fails with P2028 before any work happens. Same allowance the
   booking action makes. */
const TX_OPTIONS = { maxWait: 15_000, timeout: 20_000 };

export type WorkResult =
  | { ok: true; reference: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  clientName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(100, "That name is too long."),
  clientEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .email("Enter a valid email address. The quote is sent there."),
  type: z.enum([
    "THESIS_REVIEW",
    "PAPER_REVIEW",
    "DATA_ANALYSIS",
    "RESEARCH_CONSULTANCY",
    "TRAINING",
    "OTHER",
  ]),
  title: z
    .string()
    .trim()
    .min(3, "Give the work a short title.")
    .max(200, "Please keep the title under 200 characters."),
  notes: z
    .string()
    .trim()
    .min(10, "Describe what you need, so the quote can be realistic.")
    .max(3000, "Please keep this under 3000 characters."),
  dueAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  /* Paying now is for clients who have already agreed a figure in
     conversation. Nothing is priced at enquiry time, so the form cannot
     ask them to pay an amount the site does not know. */
  payNow: z.enum(["later", "now"]).default("later"),
  amountNpr: z.coerce.number().int().min(0).max(10_000_000).optional(),
  transactionId: z.string().trim().max(100).optional().or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal("")),
});

export async function createWorkEnquiry(
  _prev: WorkResult | null,
  formData: FormData,
): Promise<WorkResult> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }
  const d = parsed.data;

  // Honeypot. Silently accept so a bot learns nothing, but save nothing.
  if (d.website) return { ok: true, reference: "ok" };

  const paying = d.payNow === "now";
  if (paying && (!d.amountNpr || d.amountNpr < 1)) {
    return {
      ok: false,
      message: "Enter the amount you have paid.",
      fieldErrors: { amountNpr: "Enter the amount you have paid." },
    };
  }
  if (paying && !d.transactionId) {
    return {
      ok: false,
      message: "Enter the transaction reference from your payment.",
      fieldErrors: {
        transactionId: "Enter the reference shown after paying.",
      },
    };
  }

  /* Recorded on the engagement rather than in the Payment ledger. The
     ledger covers session bookings; engagements carry their own feeNpr
     and amountPaidNpr, and money.ts keeps the two streams disjoint so
     nothing can be counted twice. */
  const paidNpr = paying ? (d.amountNpr ?? 0) : 0;
  const reference = paying
    ? `Paid ${paidNpr} on submission · reference ${d.transactionId} · not yet verified`
    : null;

  let created;
  try {
    created = await prisma.$transaction(async (tx) => {
      // Matched by email so a returning client gains the enquiry rather
      // than appearing twice with their history split.
      const client = await tx.client.upsert({
        where: { email: d.clientEmail },
        update: { name: d.clientName },
        create: { email: d.clientEmail, name: d.clientName, status: "LEAD" },
      });

      return tx.engagement.create({
        data: {
          clientId: client.id,
          type: d.type,
          title: d.title,
          notes: reference ? `${d.notes}

${reference}` : d.notes,
          dueAt: d.dueAt ? new Date(`${d.dueAt}T00:00:00.000Z`) : null,
          // feeNpr stays 0: the quote has not been given, so nothing is
          // owed yet. Setting it to what was paid would make a part
          // payment look like the full price.
          amountPaidNpr: paidNpr,
          status: "ENQUIRY",
        },
      });
    }, TX_OPTIONS);
  } catch (err) {
    console.error("[work] enquiry failed:", err);
    return {
      ok: false,
      message: "Something went wrong sending your request. Please try again.",
    };
  }

  // Email must never fail the enquiry: it is already saved.
  await sendWorkEnquiry({
    id: created.id,
    clientName: d.clientName,
    clientEmail: d.clientEmail,
    type: d.type,
    title: d.title,
    notes: d.notes,
    dueAt: d.dueAt || null,
    paidNpr,
    transactionId: paying ? (d.transactionId ?? null) : null,
  });

  return { ok: true, reference: created.id };
}
