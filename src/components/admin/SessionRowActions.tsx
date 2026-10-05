"use client";

import { useState, useTransition } from "react";
import { CheckCheck, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markCompleted, reopenBooking } from "@/app/admin/actions";

/* Closing off one day of an engagement.
 *
 * Marking completed opens a one-line note rather than firing immediately:
 * what a session covered is only fresh at the moment it finishes, and an
 * "add a note later" affordance is one nobody ever comes back to. The
 * field is optional, so it costs a click, not a decision. */
export function SessionRowActions({
  id,
  status,
  note,
}: {
  id: string;
  status: string;
  note?: string | null;
}) {
  const [pending, start] = useTransition();
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function complete() {
    setError(null);
    start(async () => {
      const res = await markCompleted(id, text);
      if (res.ok) {
        setWriting(false);
        setText("");
      } else {
        setError(res.message ?? "Could not update.");
      }
    });
  }

  if (status === "COMPLETED") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {note && (
          <p className="min-w-0 flex-1 text-right text-xs text-muted-foreground italic">
            {note}
          </p>
        )}
        <Button
          size="xs"
          variant="ghost"
          disabled={pending}
          className="text-muted-foreground"
          onClick={() =>
            start(async () => {
              await reopenBooking(id);
            })
          }
        >
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <RotateCcw aria-hidden="true" />
          )}
          Reopen
        </Button>
      </div>
    );
  }

  // Only a confirmed session can be completed; pending payment and
  // cancelled rows have nothing to close off.
  if (status !== "CONFIRMED") return null;

  if (!writing) {
    return (
      <Button size="xs" variant="outline" onClick={() => setWriting(true)}>
        <CheckCheck aria-hidden="true" />
        Mark completed
      </Button>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              complete();
            }
            if (e.key === "Escape") setWriting(false);
          }}
          maxLength={500}
          placeholder="What did you cover? (optional)"
          aria-label="Session note"
          className="min-w-0 flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-ring"
        />
        <Button size="xs" disabled={pending} onClick={complete}>
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <CheckCheck aria-hidden="true" />
          )}
          Complete
        </Button>
        <Button
          size="xs"
          variant="ghost"
          disabled={pending}
          onClick={() => setWriting(false)}
        >
          Cancel
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
