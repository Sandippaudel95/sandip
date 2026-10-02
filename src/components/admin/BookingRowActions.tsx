"use client";

import { useState, useTransition } from "react";
import { Check, CheckCheck, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  confirmBooking,
  deleteBooking,
  markCompleted,
  rejectBooking,
  reopenBooking,
} from "@/app/admin/actions";

/* Confirm is a single click. Reject asks for a reason first, because the
   reason is emailed to the client and "no reason given" is a poor message
   to receive about money.

   Delete is offered on every row, including the cancelled and completed
   ones that have no other actions left — clearing out test entries and
   spam is the main reason to reach for it, and those are exactly the rows
   that are already past their useful actions. */
export function BookingRowActions({
  id,
  status,
  disabled,
  earnedLabel,
}: {
  id: string;
  status?: string;
  disabled?: boolean;
  /** Set when this booking counts towards revenue, so the confirmation can
      say what deleting it costs rather than asking a vague "are you sure?". */
  earnedLabel?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [asking, setAsking] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await fn();
      setFeedback(result.message ?? null);
      if (result.ok) {
        setAsking(false);
        setConfirmingDelete(false);
      }
    });
  }

  const deleteControl = confirmingDelete ? (
    <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
      <p className="text-xs leading-relaxed">
        Delete this booking permanently? It will not be emailed to the client.
        {earnedLabel && (
          <span className="mt-1 block font-medium text-destructive">
            {earnedLabel} will come off your earnings.
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => run(() => deleteBooking(id))}
        >
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 aria-hidden="true" />
          )}
          Delete
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setConfirmingDelete(false)}
        >
          Cancel
        </Button>
      </div>
    </div>
  ) : (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      className="text-muted-foreground hover:text-destructive"
      onClick={() => setConfirmingDelete(true)}
    >
      <Trash2 aria-hidden="true" />
      Delete
    </Button>
  );

  const status_ = feedback && (
    <p role="status" className="text-xs text-muted-foreground">
      {feedback}
    </p>
  );

  // A confirmed session that has happened is closed off here rather than in
  // the pending queue, so the two actions never appear together.
  if (status === "CONFIRMED") {
    return (
      <div className="space-y-2">
        {!confirmingDelete && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => markCompleted(id))}
          >
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <CheckCheck aria-hidden="true" />
            )}
            Mark completed
          </Button>
        )}
        {deleteControl}
        {status_}
      </div>
    );
  }

  // Completing is a single click on a row that looks like every other, so
  // it has to be reversible.
  if (status === "COMPLETED") {
    return (
      <div className="space-y-2">
        {!confirmingDelete && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => reopenBooking(id))}
          >
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw aria-hidden="true" />
            )}
            Mark as not completed
          </Button>
        )}
        {deleteControl}
        {status_}
      </div>
    );
  }

  // Cancelled bookings have nothing left to decide, but they can still be
  // cleared away.
  if (disabled) {
    return (
      <div className="space-y-2">
        {deleteControl}
        {status_}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!asking ? (
        <>
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
          {deleteControl}
        </>
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
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-ring"
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

      {status_}
    </div>
  );
}
