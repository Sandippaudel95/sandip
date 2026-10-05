"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, Send } from "lucide-react";
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

export function WorkEnquiryForm({ email }: { email: string }) {
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
          defaultValue="THESIS_REVIEW"
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
          type="date"
          className={cn(inputClass(errors.dueAt), "sm:w-56")}
        />
      </Field>

      {state?.ok === false && state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <Submit />

      <p className="text-sm leading-relaxed text-muted-foreground">
        No payment is taken now. You will be quoted first, and nothing is
        agreed until you accept it. You can also just email{" "}
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
