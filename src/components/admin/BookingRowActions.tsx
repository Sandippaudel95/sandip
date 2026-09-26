"use client";

import { useState, useTransition } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmBooking, rejectBooking } from "@/app/admin/actions";

/* Confirm is a single click. Reject asks for a reason first, because the
   reason is emailed to the client and "no reason given" is a poor message
   to receive about money. */
export function BookingRowActions({
  id,
  disabled,
}: {
  id: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await fn();
      setFeedback(result.message ?? null);
      if (result.ok) setAsking(false);
    });
  }

  if (disabled) return null;

  return (
    <div className="space-y-2">
      {!asking ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(() => confirmBooking(id))}
          >
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Check aria-hidden="true" />
            )}
            Verify &amp; confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setAsking(true)}
          >
            <X aria-hidden="true" />
            Reject
          </Button>
        </div>
      ) : (
        <div className="space-y-2 rounded-md border bg-muted/50 p-3">
          <label htmlFor={`note-${id}`} className="block text-xs font-medium">
            Reason, emailed to the client
          </label>
          <textarea
            id={`note-${id}`}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="e.g. No payment found against this reference."
            className="w-full rounded-md border bg-background px-2.5 py-2 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-ring"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => rejectBooking(id, note))}
            >
              {pending && (
                <Loader2 className="animate-spin" aria-hidden="true" />
              )}
              Confirm rejection
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setAsking(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {feedback && (
        <p role="status" className="text-xs text-muted-foreground">
          {feedback}
        </p>
      )}
    </div>
  );
}
