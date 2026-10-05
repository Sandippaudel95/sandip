"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  confirmBooking,
  deleteBooking,
  rejectBooking,
} from "@/app/admin/actions";

/* Decisions that belong to the whole order: one payment, one approval.
 *
 * Closing off an individual day lives in SessionRowActions, on the
 * session row itself. Keeping them apart is what stops "Mark completed"
 * on a fifteen-day engagement silently completing only day one. */
export function BookingRowActions({
  id,
  status,
  disabled,
  earnedLabel,
}: {
  /** Any session of the order; the actions resolve the group themselves. */
  id: string;
  /** The order's state: PENDING while any session awaits verification. */
  status?: string;
  disabled?: boolean;
  /** Set when the order counts towards revenue, so the delete
      confirmation can say what removing it costs. */
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
        Delete this booking permanently, with all of its sessions? The client
        is not emailed.
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

  const feedbackLine = feedback && (
    <p role="status" className="text-xs text-muted-foreground">
      {feedback}
    </p>
  );

  // Nothing left to decide: cancelled, or already seen through.
  if (disabled) {
    return (
      <div className="space-y-2">
        {deleteControl}
        {feedbackLine}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!asking ? (
        <>
          <div className="flex flex-wrap gap-2">
            {status === "PENDING" && (
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
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => setAsking(true)}
            >
              <X aria-hidden="true" />
              {status === "PENDING" ? "Reject" : "Cancel booking"}
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
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Confirm
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

      {feedbackLine}
    </div>
  );
}
