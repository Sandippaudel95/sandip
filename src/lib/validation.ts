import { z } from "zod";
import { sessionLengths } from "@/content/availability";

/* One source of truth for validation, imported by both the form and the
   Server Action, so the client and the server can never disagree about
   what counts as valid. */

export const detailsSchema = z.object({
  clientName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(100, "That name is too long."),
  clientEmail: z
    .string()
    .trim()
    .max(200)
    .email("Enter a valid email address. Your confirmation is sent there."),
  consultationTopic: z
    .string()
    .trim()
    .min(3, "Add a short description of your topic.")
    .max(300, "Please keep the topic under 300 characters."),
});

export const slotSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  timeSlot: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Choose a time."),
  durationHours: z.coerce
    .number()
    .int()
    .refine(
      (n): n is (typeof sessionLengths)[number] =>
        (sessionLengths as readonly number[]).includes(n),
      "Choose a session length.",
    ),
});

export const paymentSchema = z.object({
  transactionId: z
    .string()
    .trim()
    .min(4, "Enter the transaction ID or reference from your payment.")
    .max(100, "That reference is too long."),
});

export const bookingSchema = detailsSchema
  .merge(slotSchema)
  .merge(paymentSchema)
  .extend({
    // Honeypot: real people leave it empty.
    website: z.string().max(0).optional().or(z.literal("")),
  });

export type BookingInput = z.infer<typeof bookingSchema>;

/** Shape returned by every Server Action in this feature. */
export type ActionResult =
  | { ok: true; reference: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** Flatten Zod issues into { field: firstMessage }. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
