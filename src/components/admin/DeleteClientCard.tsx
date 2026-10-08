"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Archive, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { npr } from "@/content/services";
import { deleteClient } from "@/app/admin/clients/actions";

/* Two steps, and the second one states the cost in rupees.
 *
 * Deleting a client takes their sessions and other work with them, which
 * moves the earnings figures on the dashboard. That is fine for a record
 * that should never have existed and bad for a real one, so the warning
 * names the amount rather than asking a vague "are you sure?". */
export function DeleteClientCard({
  id,
  name,
  bookingCount,
  engagementCount,
  earnedNpr,
  isArchived,
}: {
  id: string;
  name: string;
  bookingCount: number;
  engagementCount: number;
  /** Rupees this client contributes to earnings, so the warning can name a
      figure. Zero means nothing is lost, and the line is left out. */
  earnedNpr: number;
  isArchived: boolean;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const attached = [
    bookingCount > 0 &&
      `${bookingCount} session${bookingCount > 1 ? "s" : ""}`,
    engagementCount > 0 &&
      `${engagementCount} other job${engagementCount > 1 ? "s" : ""}`,
  ].filter(Boolean) as string[];

  function remove() {
    setError(null);
    startTransition(async () => {
      const result = await deleteClient(id);
      if (result.ok) {
        router.push("/admin/clients");
        router.refresh();
      } else {
        setError(result.message ?? "Could not delete.");
        setArmed(false);
      }
    });
  }

  return (
    <section className="mt-10 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-[0.12em] text-destructive uppercase">
        <AlertTriangle className="size-4" aria-hidden="true" />
        Danger zone
      </h2>

      {!armed ? (
        <>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Deleting <span className="font-medium text-foreground">{name}</span>{" "}
            removes the client and everything attached to them, permanently.
            {!isArchived && (
              <>
                {" "}
                To keep the history but take them out of the way, set their
                status to <span className="font-medium">archived</span> instead.
              </>
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setArmed(true)}
            >
              <Trash2 aria-hidden="true" />
              Delete client
            </Button>
            {!isArchived && (
              <Button asChild variant="outline">
                <Link href={`/admin/clients/${id}/edit`}>
                  <Archive aria-hidden="true" />
                  Archive instead
                </Link>
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm leading-relaxed">
            This will permanently delete{" "}
            <span className="font-medium">{name}</span>
            {attached.length > 0 && <> along with their {attached.join(" and ")}</>}
            .
          </p>
          {earnedNpr > 0 && (
            <p className="mt-2 text-sm leading-relaxed font-medium text-destructive">
              {npr(earnedNpr)} will come off your earnings totals.
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            This cannot be undone.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
              disabled={pending}
              onClick={remove}
            >
              {pending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              Yes, delete permanently
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setArmed(false)}
            >
              Cancel
            </Button>
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
