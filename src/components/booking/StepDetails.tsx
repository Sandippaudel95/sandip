"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { detailsSchema, fieldErrorsOf } from "@/lib/validation";
import { formatSession } from "@/lib/time";
import type { Draft } from "./BookingWizard";

/* Validated with the same Zod schema the Server Action uses, so the two can
   never disagree. This is a convenience check only; the server re-validates
   everything on submit. */
export function StepDetails({
  draft,
  onChange,
  onBack,
  onNext,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function check() {
    const result = detailsSchema.safeParse({
      clientName: draft.clientName,
      clientEmail: draft.clientEmail,
      consultationTopic: draft.consultationTopic,
    });
    if (!result.success) {
      setErrors(fieldErrorsOf(result.error));
      return;
    }
    setErrors({});
    onNext();
  }

  const field = (name: keyof Draft, label: string, props: React.ComponentProps<"input">) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        value={String(draft[name] ?? "")}
        onChange={(e) => onChange({ [name]: e.target.value } as Partial<Draft>)}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        className={cn(
          "mt-1.5 w-full rounded-md border bg-background px-3 py-2.5 text-[0.9375rem]",
          "focus:outline-2 focus:outline-offset-1 focus:outline-ring",
          errors[name] && "border-destructive",
        )}
        {...props}
      />
      {errors[name] && (
        <p id={`${name}-error`} className="mt-1.5 text-sm text-destructive">
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/50 p-4 text-sm">
        <p className="font-medium">
          {formatSession(draft.date, draft.timeSlot, draft.durationHours)}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {field("clientName", "Full name", {
          type: "text",
          autoComplete: "name",
          maxLength: 100,
        })}
        {field("clientEmail", "Email", {
          type: "email",
          autoComplete: "email",
          maxLength: 200,
        })}
      </div>

      {field("consultationTopic", "What would you like to discuss?", {
        type: "text",
        maxLength: 300,
        placeholder: "e.g. Choosing a model for my thesis data",
      })}

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
        <Button onClick={check} size="lg">
          Continue to payment
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
