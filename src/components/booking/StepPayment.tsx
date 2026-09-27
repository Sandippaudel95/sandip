"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Info,
  Loader2,
  QrCode,
  TicketPercent,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatSession } from "@/lib/time";
import { npr } from "@/content/services";
import type { ActionResult } from "@/lib/validation";
import { previewCoupon } from "@/app/book/actions";
import { SubmitButton } from "./SubmitButton";
import type { Draft } from "./BookingWizard";

interface AppliedCoupon {
  code: string;
  label: string;
  discountNpr: number;
  totalNpr: number;
}

export function StepPayment({
  draft,
  qrSrc,
  basePriceNpr,
  formAction,
  result,
  onBack,
  onPickAnotherTime,
}: {
  draft: Draft;
  qrSrc: string | null;
  /** Full price for the chosen length, computed on the server. */
  basePriceNpr: number;
  formAction: (formData: FormData) => void;
  result: ActionResult | null;
  onBack: () => void;
  onPickAnotherTime: () => void;
}) {
  const failed = result && result.ok === false ? result : null;
  const slotGone = failed?.message.includes("just been taken");

  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checking, startChecking] = useTransition();

  const total = applied ? applied.totalNpr : basePriceNpr;

  function apply() {
    const trimmed = code.trim();
    if (!trimmed) return;
    setCouponError(null);
    startChecking(async () => {
      const res = await previewCoupon(trimmed, draft.durationHours);
      if (!res.ok) {
        setApplied(null);
        setCouponError(res.message);
        return;
      }
      setApplied({
        code: res.quote.couponCode ?? trimmed,
        label: res.quote.couponLabel ?? "Discount applied",
        discountNpr: res.quote.discountNpr,
        totalNpr: res.quote.totalNpr,
      });
    });
  }

  function clearCoupon() {
    setApplied(null);
    setCouponError(null);
    setCode("");
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Held in wizard state; the action re-validates and re-prices. */}
      <input type="hidden" name="date" value={draft.date} />
      <input type="hidden" name="timeSlot" value={draft.timeSlot} />
      <input type="hidden" name="durationHours" value={draft.durationHours} />
      <input type="hidden" name="clientName" value={draft.clientName} />
      <input type="hidden" name="clientEmail" value={draft.clientEmail} />
      <input
        type="hidden"
        name="consultationTopic"
        value={draft.consultationTopic}
      />
      <input type="hidden" name="couponCode" value={applied?.code ?? ""} />
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

      {/* ---------------- Coupon ---------------- */}
      <div className="rounded-xl border p-5">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.12em] text-navy uppercase">
          <TicketPercent className="size-4" aria-hidden="true" />
          Coupon code
        </h2>

        {applied ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#065f46]/25 bg-[#d1fae5]/40 p-3.5">
            <p className="flex items-center gap-2 text-sm">
              <Check
                className="size-4 shrink-0 text-[#065f46]"
                aria-hidden="true"
              />
              <span>
                <span className="font-semibold">{applied.code}</span> applied
                — {applied.label}
              </span>
            </p>
            <button
              type="button"
              onClick={clearCoupon}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-navy hover:underline"
            >
              <X className="size-3.5" aria-hidden="true" />
              Remove
            </button>
          </div>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              <label htmlFor="coupon" className="sr-only">
                Coupon code
              </label>
              <input
                id="coupon"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  // Enter inside a form would submit the booking.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    apply();
                  }
                }}
                maxLength={40}
                autoComplete="off"
                placeholder="Enter code"
                aria-invalid={Boolean(couponError)}
                aria-describedby={couponError ? "coupon-error" : undefined}
                className={cn(
                  "min-w-0 flex-1 rounded-md border bg-background px-3 py-2.5 text-[0.9375rem] tracking-wide uppercase",
                  "focus:outline-2 focus:outline-offset-1 focus:outline-ring",
                  couponError && "border-destructive",
                )}
              />
              <Button
                type="button"
                variant="outline"
                onClick={apply}
                disabled={checking || !code.trim()}
              >
                {checking && (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                )}
                Apply
              </Button>
            </div>
            {couponError && (
              <p id="coupon-error" className="mt-2 text-sm text-destructive">
                {couponError}
              </p>
            )}
          </>
        )}
      </div>

      {/* ---------------- Amount and QR ---------------- */}
      <div className="rounded-xl border p-6">
        <h2 className="flex items-center gap-2.5 text-lg font-semibold">
          <QrCode className="size-5 text-navy" aria-hidden="true" />
          Pay {npr(total)}
        </h2>

        <div className="mt-5 grid gap-8 sm:grid-cols-[auto_1fr]">
          <div className="mx-auto sm:mx-0">
            {qrSrc ? (
              <>
                <div className="rounded-lg border bg-white p-3">
                  <Image
                    src={qrSrc}
                    alt="QR code for payment"
                    width={200}
                    height={200}
                    className="size-[200px] object-contain"
                    unoptimized
                  />
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Scan with your banking or Fonepay app
                </p>
              </>
            ) : (
              <div className="grid size-[214px] place-items-center rounded-lg border border-dashed bg-muted/50 p-4 text-center">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  The payment QR is not available yet. Submit the booking and
                  payment details will be sent to you by email.
                </p>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  {draft.durationHours} hour
                  {draft.durationHours > 1 ? "s" : ""} at{" "}
                  {npr(basePriceNpr / draft.durationHours)} each
                </dt>
                <dd className="tabular-nums">{npr(basePriceNpr)}</dd>
              </div>
              {applied && applied.discountNpr > 0 && (
                <div className="flex justify-between gap-4 text-[#065f46]">
                  <dt>Discount ({applied.code})</dt>
                  <dd className="tabular-nums">
                    &minus;{npr(applied.discountNpr)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-t pt-2">
                <dt className="font-medium">Total</dt>
                <dd className="font-serif text-xl font-semibold text-navy tabular-nums">
                  {npr(total)}
                </dd>
              </div>
            </dl>

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
              <label
                htmlFor="transactionId"
                className="block text-sm font-medium"
              >
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
