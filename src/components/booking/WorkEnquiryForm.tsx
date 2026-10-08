"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { CheckCircle2, Clock, Loader2, QrCode, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createWorkEnquiry, type WorkResult } from "@/app/(site)/book/work-actions";

/* Negotiated work has no slot and no price yet, so this asks for none.
   What it needs is enough detail to quote from, which is why the
   description has a minimum length and the deadline is optional. */

const TYPES = [
  ["THESIS_REVIEW", "Thesis review"],
  ["PAPER_REVIEW", "Paper review"],
  ["DATA_ANALYSIS", "Data analysis"],
  ["RESEARCH_CONSULTANCY", "Research consultancy"],
  ["TRAINING", "Training"],
  ["OTHER", "Something else"],
] as const;

export function WorkEnquiryForm({
  email,
  qrSrc,
}: {
  email: string;
  qrSrc: string | null;
}) {
  /* Paying now only makes sense for someone who has already agreed a
     figure in conversation: nothing has been quoted at this point, so
     the form cannot tell them what to pay. Default is to wait. */
  const [payNow, setPayNow] = useState(false);

  /* Controlled on purpose. React resets a form once its action returns,
     so with uncontrolled inputs a mistyped email would wipe the whole
     description the client had just written. */
  const [values, setValues] = useState({
    type: "THESIS_REVIEW",
    title: "",
    notes: "",
    clientName: "",
    clientEmail: "",
    dueAt: "",
    amountNpr: "",
    transactionId: "",
  });
  const bind = (name: keyof typeof values) => ({
    value: values[name],
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => setValues((v) => ({ ...v, [name]: e.target.value })),
  });
  const [state, formAction] = useActionState<WorkResult | null, FormData>(
    createWorkEnquiry,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/10 p-8 text-center">
        <CheckCircle2
          className="mx-auto mb-4 size-8 text-success"
          aria-hidden="true"
        />
        <h2 className="font-display text-2xl">Request received</h2>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted-foreground">
          Work of this kind is quoted individually, so nothing has been
          priced or scheduled yet. A quote will follow by email, usually
          within a couple of days.
          {payNow &&
            " Your payment will be checked against the account and set against this work."}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Reference{" "}
          <span className="font-mono text-xs">{state.reference}</span>
        </p>
      </div>
    );
  }

  const errors = state?.ok === false ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-6">
      {/* Honeypot: real people leave it empty. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <Field name="type" label="What do you need?" error={errors.type}>
        <select
          id="type"
          name="type"
          {...bind("type")}
          className={inputClass(errors.type)}
        >
          {TYPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        name="title"
        label="Short title"
        hint="For example: Review of a masters thesis on credit risk."
        error={errors.title}
      >
        <input
          id="title"
          name="title"
          {...bind("title")}
          maxLength={200}
          required
          className={inputClass(errors.title)}
        />
      </Field>

      <Field
        name="notes"
        label="Tell me about the work"
        hint="Scope, length, the stage it is at, and anything that affects the timing. The more there is here, the more realistic the quote."
        error={errors.notes}
      >
        <textarea
          id="notes"
          name="notes"
          {...bind("notes")}
          rows={6}
          maxLength={3000}
          required
          className={inputClass(errors.notes)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="clientName" label="Your name" error={errors.clientName}>
          <input
            id="clientName"
            name="clientName"
            {...bind("clientName")}
            autoComplete="name"
            maxLength={100}
            required
            className={inputClass(errors.clientName)}
          />
        </Field>
        <Field name="clientEmail" label="Email" error={errors.clientEmail}>
          <input
            id="clientEmail"
            name="clientEmail"
            {...bind("clientEmail")}
            type="email"
            autoComplete="email"
            maxLength={200}
            required
            className={inputClass(errors.clientEmail)}
          />
        </Field>
      </div>

      <Field
        name="dueAt"
        label="Needed by"
        hint="Optional, but it helps to know."
        error={errors.dueAt}
      >
        <input
          id="dueAt"
          name="dueAt"
          {...bind("dueAt")}
          type="date"
          className={cn(inputClass(errors.dueAt), "sm:w-56")}
        />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium">Payment</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            {
              value: false,
              icon: Clock,
              title: "Send me a quote first",
              blurb: "Nothing to pay now. Most people choose this.",
            },
            {
              value: true,
              icon: QrCode,
              title: "I will pay now",
              blurb: "If a price has already been agreed with you.",
            },
          ].map((o) => (
            <label
              key={String(o.value)}
              className={cn(
                "flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors",
                payNow === o.value
                  ? "border-brand/30 bg-brand-soft ring-1 ring-brand/30"
                  : "border-input hover:border-brand/30 hover:bg-accent/60",
              )}
            >
              <input
                type="radio"
                name="payNow"
                value={o.value ? "now" : "later"}
                checked={payNow === o.value}
                onChange={() => setPayNow(o.value)}
                className="sr-only"
              />
              <o.icon
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  payNow === o.value ? "text-brand" : "text-muted-foreground",
                )}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{o.title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {o.blurb}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {payNow && (
        <div className="grid gap-6 rounded-xl border bg-card p-5 sm:grid-cols-[auto_1fr]">
          <div className="mx-auto sm:mx-0">
            {qrSrc ? (
              <>
                {/* White in both themes on purpose: a QR code needs a
                    light quiet zone to stay scannable. */}
                <div className="rounded-xl bg-white p-3">
                  <Image
                    src={qrSrc}
                    alt="QR code for payment"
                    width={180}
                    height={180}
                    className="size-[180px] object-contain"
                    unoptimized
                  />
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Scan to pay
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Email {email} for payment details.
              </p>
            )}
          </div>

          <div className="space-y-5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pay the amount you have agreed, then enter it below with the
              reference from your payment app. It is checked against the
              account before being set against your work.
            </p>
            <Field
              name="amountNpr"
              label="Amount you have paid (Rs.)"
              error={errors.amountNpr}
            >
              <input
                id="amountNpr"
                name="amountNpr"
                {...bind("amountNpr")}
                type="number"
                min={1}
                inputMode="numeric"
                className={cn(inputClass(errors.amountNpr), "sm:w-48")}
              />
            </Field>
            <Field
              name="transactionId"
              label="Transaction reference"
              hint="The reference shown in eSewa, Fonepay or your bank app."
              error={errors.transactionId}
            >
              <input
                id="transactionId"
                name="transactionId"
                {...bind("transactionId")}
                maxLength={100}
                className={inputClass(errors.transactionId)}
              />
            </Field>
          </div>
        </div>
      )}

      {state?.ok === false && state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <Submit />

      <p className="text-sm leading-relaxed text-muted-foreground">
        {payNow
          ? "Nothing is agreed until the quote is accepted; anything paid now is held against this work."
          : "No payment is taken now. You will be quoted first, and nothing is agreed until you accept it."}{" "}
        You can also just email{" "}
        <a
          href={`mailto:${email}`}
          className="font-medium text-brand underline underline-offset-4"
        >
          {email}
        </a>
        .
      </p>
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <Send aria-hidden="true" />
      )}
      Send request
    </Button>
  );
}

const inputClass = (error?: string) =>
  cn(
    "mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-ring",
    error && "border-destructive",
  );

function Field({
  name,
  label,
  hint,
  error,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
