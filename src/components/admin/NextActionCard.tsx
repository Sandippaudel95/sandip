"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { appendNote, clearNextAction } from "@/app/admin/clients/actions";

/* The follow-up on a client page: what is next, whether it is overdue, and
   a quick way to log what happened. Editing the action itself lives on the
   edit form; this is for acting on it. */
export function NextActionCard({
  clientId,
  nextAction,
  dueKey,
  dueLabel,
  overdue,
}: {
  clientId: string;
  nextAction: string | null;
  dueKey: string | null;
  dueLabel: string | null;
  overdue: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  function done() {
    start(async () => {
      await clearNextAction(clientId);
      setFeedback("Marked done.");
      router.refresh();
    });
  }

  function addNote() {
    const text = note.trim();
    if (!text) return;
    start(async () => {
      const res = await appendNote(clientId, text);
      setFeedback(res.ok ? "Note added." : (res.message ?? "Could not save."));
      if (res.ok) setNote("");
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5",
        overdue && "border-[#b45309]/30 bg-[#fef3c7]/40",
      )}
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-[0.12em] text-navy uppercase">
        <BellRing className="size-4" aria-hidden="true" />
        Next action
      </h2>

      {nextAction ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">{nextAction}</p>
            {dueLabel && (
              <p
                className={cn(
                  "mt-0.5 text-sm",
                  overdue ? "font-medium text-[#b45309]" : "text-muted-foreground",
                )}
              >
                Due {dueLabel}
                {overdue && dueKey ? " · overdue" : ""}
              </p>
            )}
          </div>
          <Button size="sm" onClick={done} disabled={pending}>
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Check aria-hidden="true" />
            )}
            Mark done
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing scheduled. Set one on the edit page to have it appear on the
          overview when it falls due.
        </p>
      )}

      <div className="mt-5 border-t pt-4">
        <label htmlFor="note" className="block text-sm font-medium">
          Add a note
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id="note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addNote();
              }
            }}
            maxLength={500}
            placeholder="What happened, or what was agreed"
            className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-ring"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={addNote}
            disabled={pending || !note.trim()}
          >
            <Plus aria-hidden="true" />
            Add
          </Button>
        </div>
        {feedback && (
          <p role="status" className="mt-2 text-xs text-muted-foreground">
            {feedback}
          </p>
        )}
      </div>
    </div>
  );
}
