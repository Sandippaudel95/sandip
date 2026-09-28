"use client";

import Link from "next/link";
import { Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSession } from "@/lib/time";
import type { Draft } from "./BookingWizard";

export function StepSuccess({
  reference,
  draft,
  onBookAnother,
}: {
  reference: string;
  draft: Draft;
  onBookAnother: () => void;
}) {
  return (
    <div className="panel glow relative overflow-hidden p-8 text-center sm:p-12">
      <div
        className="relative z-10 mx-auto grid size-16 place-items-center rounded-full bg-brand-soft ring-1 ring-brand/30"
        aria-hidden="true"
      >
        <Hourglass className="size-7 text-brand" />
      </div>

      <h2 className="mt-5 text-2xl font-semibold tracking-tight">
        Booking received, awaiting verification
      </h2>

      <p className="mx-auto mt-3 max-w-prose text-muted-foreground">
        Your payment reference has been recorded. The booking will be
        confirmed once the payment has been verified, and you will get an
        email when that happens.
      </p>

      <dl className="mx-auto mt-6 max-w-md space-y-2 text-sm">
        <div className="flex justify-between gap-4 border-b pb-2">
          <dt className="text-muted-foreground">When</dt>
          <dd className="text-right font-medium">
            {formatSession(draft.date, draft.timeSlot, draft.durationHours)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-b pb-2">
          <dt className="text-muted-foreground">Reference</dt>
          <dd className="text-right font-mono text-xs">{reference}</dd>
        </div>
      </dl>

      <p className="mt-5 text-sm text-muted-foreground">
        A copy has been emailed to you. If it is not in your inbox, check your
        spam folder.
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">Back to the home page</Link>
        </Button>
        <Button variant="outline" onClick={onBookAnother}>
          Book another session
        </Button>
      </div>
    </div>
  );
}
