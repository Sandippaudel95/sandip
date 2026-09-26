"use client";

import Image from "next/image";
import { AlertCircle, ArrowLeft, Info, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatSession } from "@/lib/time";
import { HOURLY_RATE_NPR } from "@/content/services";
import type { ActionResult } from "@/lib/validation";
import { SubmitButton } from "./SubmitButton";
import type { Draft } from "./BookingWizard";

/** Rate is per hour; the total follows the chosen length. */
function total(durationHours: number): string {
  const perHour = Number(HOURLY_RATE_NPR.replace(/[^\d]/g, ""));
  return `Rs. ${(perHour * durationHours).toLocaleString("en-IN")}`;
}

export function StepPayment({
  draft,
  qrSrc,
  formAction,
  result,
  onBack,
  onPickAnotherTime,
}: {
  draft: Draft;
  qrSrc: string | null;
  formAction: (formData: FormData) => void;
  result: ActionResult | null;
  onBack: () => void;
  onPickAnotherTime: () => void;
}) {
  const failed = result && result.ok === false ? result : null;
  const slotGone = failed?.message.includes("just been taken");

  return (
    <form action={formAction} className="space-y-6">
      {/* The wizard holds these in state; the action re-validates them. */}
      <input type="hidden" name="date" value={draft.date} />
      <input type="hidden" name="timeSlot" value={draft.timeSlot} />
      <input
        type="hidden"
        name="durationHours"
        value={draft.durationHours}
      />
      <input type="hidden" name="clientName" value={draft.clientName} />
      <input type="hidden" name="clientEmail" value={draft.clientEmail} />
      <input
        type="hidden"
        name="consultationTopic"
        value={draft.consultationTopic}
      />
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] size-0"
      />

      <div className="rounded-lg border bg-muted/50 p-4 text-sm">
        <p className="font-medium">
          {formatSession(draft.date, draft.timeSlot, draft.durationHours)}
        </p>
        <p className="mt-1 text-muted-foreground">
          {draft.clientName} · {draft.clientEmail}
        </p>
      </div>

      <div className="rounded-xl border p-6">
        <h2 className="flex items-center gap-2.5 text-lg font-semibold">
          <QrCode className="size-5 text-navy" aria-hidden="true" />
          Pay {total(draft.durationHours)}
        </h2>

        <div className="mt-5 grid gap-8 sm:grid-cols-[auto_1fr]">
          {qrSrc && (
            <div className="mx-auto sm:mx-0">
              <div className="rounded-lg border bg-white p-3">
                <Image
                  src={qrSrc}
                  alt="QR code for payment"
                  width={180}
                  height={180}
                  className="size-[180px] object-contain"
                />
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Scan with your banking or Fonepay app
              </p>
            </div>
          )}

          <div className="min-w-0">
            <p className="font-serif text-2xl font-semibold text-navy">
              {total(draft.durationHours)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {HOURLY_RATE_NPR} per hour × {draft.durationHours} hour
              {draft.durationHours > 1 ? "s" : ""}
            </p>

            <div className="mt-4 flex gap-3 rounded-lg border border-navy/20 bg-accent/50 p-4 text-sm">
              <Info
                className="mt-0.5 size-4 shrink-0 text-navy"
                aria-hidden="true"
              />
              <p>
                Pay the amount above, then enter the transaction ID or
                reference from your receipt. Your booking is confirmed once
                the payment has been verified.
              </p>
            </div>

            <div className="mt-5">
              <label htmlFor="transactionId" className="block text-sm font-medium">
                Transaction ID or payment reference
              </label>
              <input
                id="transactionId"
                name="transactionId"
                type="text"
                required
                maxLength={100}
                autoComplete="off"
                placeholder="From your payment receipt"
                aria-invalid={Boolean(failed?.fieldErrors?.transactionId)}
                className={cn(
                  "mt-1.5 w-full rounded-md border bg-background px-3 py-2.5 text-[0.9375rem]",
                  "focus:outline-2 focus:outline-offset-1 focus:outline-ring",
                  failed?.fieldErrors?.transactionId && "border-destructive",
                )}
              />
              {failed?.fieldErrors?.transactionId && (
                <p className="mt-1.5 text-sm text-destructive">
                  {failed.fieldErrors.transactionId}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {failed && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <AlertCircle
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <div>
            <p>{failed.message}</p>
            {slotGone && (
              <button
                type="button"
                onClick={onPickAnotherTime}
                className="mt-2 font-medium text-navy underline underline-offset-4"
              >
                Choose another time
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
        <SubmitButton pendingLabel="Submitting booking…">
          Submit booking
        </SubmitButton>
      </div>
    </form>
  );
}
