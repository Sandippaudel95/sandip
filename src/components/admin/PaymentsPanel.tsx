"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BanknoteArrowUp,
  Loader2,
  Mail,
  Plus,
  X,
} from "lucide-react";
import type { Payment } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { npr } from "@/content/services";
import { formatDateKey } from "@/lib/time";
import {
  deletePayment,
  recordPayment,
  requestPayment,
} from "@/app/admin/payments/actions";

/* Every instalment, with the date it arrived.
 *
 * A single running total would answer "how much" but not "when", and
 * when is the question that matters once money arrives in parts. */
export function PaymentsPanel({
  clientId,
  payments,
  advanceLeft,
  dueNpr,
  sessionsRemaining,
}: {
  clientId: string;
  payments: Payment[];
  advanceLeft: number;
  dueNpr: number;
  sessionsRemaining: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  // Worth asking for more only when the advance is spent and there is
  // still work booked to pay for.
  const depleted = advanceLeft <= 0 && dueNpr > 0;

  function add(formData: FormData) {
    setMessage(null);
    setErrors({});
    start(async () => {
      const res = await recordPayment(clientId, formData);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setMessage(res.message);
        return;
      }
      setAdding(false);
      router.refresh();
    });
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-[0.12em] text-brand uppercase">
          <BanknoteArrowUp className="size-4" aria-hidden="true" />
          Payments
        </h2>
        {!adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            Record a payment
          </Button>
        )}
      </div>

      {depleted && (
        <div className="mt-4 flex flex-wrap items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
          <AlertCircle
            className="mt-0.5 size-4 shrink-0 text-warning"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {advanceLeft < 0
                ? `Owes ${npr(-advanceLeft)} for sessions already delivered.`
                : "The advance has been fully used."}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {npr(dueNpr)} of the agreed total is still to pay
              {sessionsRemaining > 0 &&
                `, with ${sessionsRemaining} session${sessionsRemaining === 1 ? "" : "s"} still booked`}
              .
            </p>
          </div>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await requestPayment(clientId);
                setMessage(
                  res.ok
                    ? "Emailed the client."
                    : (res.message ?? "Could not send."),
                );
              })
            }
          >
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Mail aria-hidden="true" />
            )}
            Email about payment
          </Button>
        </div>
      )}

      {adding && (
        <form
          action={add}
          className="mt-4 grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-4"
        >
          <Field name="amountNpr" label="Amount (Rs.)" error={errors.amountNpr}>
            <input
              id="amountNpr"
              name="amountNpr"
              type="number"
              min={1}
              required
              className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm tabular-nums"
            />
          </Field>
          <Field name="receivedAt" label="Date received" error={errors.receivedAt}>
            <input
              id="receivedAt"
              name="receivedAt"
              type="date"
              required
              className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field name="method" label="Method" error={errors.method}>
            <input
              id="method"
              name="method"
              placeholder="eSewa, bank, cash"
              maxLength={60}
              className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <Field name="note" label="Note" error={errors.note}>
            <input
              id="note"
              name="note"
              maxLength={300}
              className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-4">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Save payment
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setAdding(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {message && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {message}
        </p>
      )}

      {payments.length > 0 ? (
        <ul className="mt-4 divide-y rounded-xl border bg-card">
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm"
            >
              <span className="w-32 shrink-0 text-muted-foreground">
                {formatDateKey(p.receivedAt.toISOString().slice(0, 10))}
              </span>
              <span className="font-medium tabular-nums">
                {npr(p.amountNpr)}
              </span>
              {p.method && (
                <span className="text-muted-foreground">{p.method}</span>
              )}
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {p.note}
              </span>
              <Button
                size="xs"
                variant="ghost"
                disabled={pending}
                aria-label={`Remove the ${npr(p.amountNpr)} payment`}
                className="text-muted-foreground hover:text-destructive"
                onClick={() =>
                  start(async () => {
                    await deletePayment(p.id);
                    router.refresh();
                  })
                }
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          Nothing received yet.
        </p>
      )}
    </section>
  );
}

function Field({
  name,
  label,
  error,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className={cn("mt-1 text-xs text-destructive")}>
          {error}
        </p>
      )}
    </div>
  );
}
