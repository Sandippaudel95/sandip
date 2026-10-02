"use client";

import { useActionState, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DayAvailability } from "@/lib/slots";
import type { ActionResult } from "@/lib/validation";
import { createBooking } from "@/app/(site)/book/actions";
import { StepDateTime } from "./StepDateTime";
import { StepDetails } from "./StepDetails";
import { StepPayment } from "./StepPayment";
import { StepSuccess } from "./StepSuccess";

export interface Draft {
  date: string;
  timeSlot: string;
  durationHours: number;
  clientName: string;
  clientEmail: string;
  consultationTopic: string;
}

const EMPTY: Draft = {
  date: "",
  timeSlot: "",
  durationHours: 1,
  clientName: "",
  clientEmail: "",
  consultationTopic: "",
};

const STEPS = ["Time", "Your details", "Payment"] as const;

interface WizardProps {
  /** Keyed by session length, computed on the server at request time. */
  availability: Record<number, DayAvailability[]>;
  qrSrc: string | null;
  hourlyRate: number;
}

/* Starting a second booking remounts the wizard rather than clearing state
   piecemeal. useActionState holds its result until the next submission, so
   resetting only the draft left the success screen rendering against an
   empty date. A new key resets the draft, the step and the action result
   together. */
export function BookingWizard(props: WizardProps) {
  const [instance, setInstance] = useState(0);
  return (
    <Wizard
      key={instance}
      {...props}
      onBookAnother={() => setInstance((n) => n + 1)}
    />
  );
}

function Wizard({
  availability,
  qrSrc,
  hourlyRate,
  onBookAnother,
}: WizardProps & { onBookAnother: () => void }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    createBooking,
    null,
  );

  const days = useMemo(
    () => availability[draft.durationHours] ?? [],
    [availability, draft.durationHours],
  );

  if (state?.ok === true) {
    return (
      <StepSuccess
        reference={state.reference}
        draft={draft}
        onBookAnother={onBookAnother}
      />
    );
  }

  return (
    <div>
      <ol className="mb-8 flex flex-wrap gap-x-2 gap-y-2" aria-label="Progress">
        {STEPS.map((label, i) => {
          const state =
            i < step ? "done" : i === step ? "current" : "upcoming";
          return (
            <li key={label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i >= step}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  state === "current" && "bg-brand-soft font-medium text-brand ring-1 ring-brand/30",
                  state === "done" &&
                    "cursor-pointer text-brand hover:bg-accent/60",
                  state === "upcoming" && "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-xs font-semibold",
                    state === "upcoming"
                      ? "bg-accent text-muted-foreground"
                      : "bg-brand text-primary-foreground",
                  )}
                  aria-hidden="true"
                >
                  {state === "done" ? <Check className="size-3" /> : i + 1}
                </span>
                {label}
              </button>
              {i < STEPS.length - 1 && (
                <span className="text-muted-foreground" aria-hidden="true">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {step === 0 && (
        <StepDateTime
          days={days}
          draft={draft}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <StepDetails
          draft={draft}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepPayment
          draft={draft}
          qrSrc={qrSrc}
          basePriceNpr={hourlyRate * draft.durationHours}
          formAction={formAction}
          result={state}
          onBack={() => setStep(1)}
          onPickAnotherTime={() => setStep(0)}
        />
      )}
    </div>
  );
}
