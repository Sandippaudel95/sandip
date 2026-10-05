import { AlertTriangle, Pencil } from "lucide-react";
import Link from "next/link";
import type { Booking } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateKey, formatTime, nepalDateKey } from "@/lib/time";
import { npr } from "@/content/services";
import { bookingIsEarned } from "@/lib/money";
import { BookingRowActions } from "./BookingRowActions";
import { SessionRowActions } from "./SessionRowActions";

/* Status colours reuse the palette already on the site rather than adding
   new ones: see the quartile and role badges in ResearchList. */
const paymentStyles: Record<Booking["paymentStatus"], string> = {
  PENDING: "bg-warning/15 text-warning border-transparent",
  VERIFIED: "bg-success/15 text-success border-transparent",
  REJECTED: "bg-destructive/10 text-destructive border-transparent",
};

const bookingStyles: Record<Booking["bookingStatus"], string> = {
  PENDING: "bg-brand-soft text-brand border-transparent",
  CONFIRMED: "bg-success/15 text-success border-transparent",
  COMPLETED: "bg-accent text-accent-foreground border-transparent",
  CANCELLED: "bg-secondary text-muted-foreground border-transparent",
};

const stamp = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kathmandu",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

/**
 * Group the rows that were booked and paid for together.
 *
 * Sessions share a groupId when they were one order. Shown as one card
 * per order rather than one per day, because they carry one payment and
 * one decision.
 */
function intoOrders(bookings: Booking[]): Booking[][] {
  const byGroup = new Map<string, Booking[]>();
  for (const b of bookings) {
    const key = b.groupId ?? b.id;
    byGroup.set(key, [...(byGroup.get(key) ?? []), b]);
  }
  return [...byGroup.values()].map((rows) =>
    [...rows].sort((x, y) => x.startsAt.getTime() - y.startsAt.getTime()),
  );
}

export function BookingsTable({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
        No bookings yet.
      </p>
    );
  }

  const today = nepalDateKey();

  return (
    <ul className="space-y-4">
      {intoOrders(bookings).map((sessions) => {
        // Order-level facts are identical across the rows; the first is
        // as good as any. Money and progress have to be aggregated.
        const b = sessions[0];
        const multi = sessions.length > 1;
        const totalNpr = sessions.reduce((sum, s) => sum + s.amountNpr, 0);
        const totalDiscount = sessions.reduce(
          (sum, s) => sum + s.discountNpr,
          0,
        );
        const earnedNpr = sessions
          .filter(bookingIsEarned)
          .reduce((sum, s) => sum + s.amountNpr, 0);
        const done = sessions.filter(
          (s) => s.bookingStatus === "COMPLETED",
        ).length;
        const live = sessions.filter(
          (s) => s.bookingStatus !== "CANCELLED",
        ).length;
        const awaiting =
          b.paymentStatus === "PENDING" && b.bookingStatus === "PENDING";
        // Derived, not taken from the first row: once days start getting
        // completed the sessions no longer share one status.
        const orderStatus = sessions.every(
          (s) => s.bookingStatus === "CANCELLED",
        )
          ? "CANCELLED"
          : sessions.some((s) => s.bookingStatus === "PENDING")
            ? "PENDING"
            : "CONFIRMED";

        return (
          <li
            key={b.groupId ?? b.id}
            className={cn(
              "rounded-xl border bg-card p-5",
              // Pending verification is the row that needs action, given
              // the same accent the site uses for its other highlights.
              awaiting && "border-brand/30 bg-accent/40 ring-1 ring-brand/30",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", paymentStyles[b.paymentStatus])}
                  >
                    Payment: {b.paymentStatus.toLowerCase()}
                  </Badge>
                  {!multi && (
                    <Badge
                      variant="outline"
                      className={cn("text-xs", bookingStyles[b.bookingStatus])}
                    >
                      Booking: {b.bookingStatus.toLowerCase()}
                    </Badge>
                  )}
                  {multi && (
                    <Badge variant="outline" className="text-xs">
                      {sessions.length} sessions
                    </Badge>
                  )}
                  {sessions.some((s) => s.emailFailed) && (
                    <Badge
                      variant="outline"
                      className="border-destructive/30 bg-destructive/10 text-xs text-destructive"
                    >
                      <AlertTriangle className="size-3" aria-hidden="true" />
                      Email not sent
                    </Badge>
                  )}
                </div>

                <h3 className="mt-3 text-lg font-semibold">{b.clientName}</h3>
                <p className="text-sm text-muted-foreground">
                  <a
                    href={`mailto:${b.clientEmail}`}
                    className="underline-offset-4 hover:text-brand hover:underline"
                  >
                    {b.clientEmail}
                  </a>
                </p>

                <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">Transaction</dt>
                    <dd className="font-mono text-xs break-all">
                      {b.transactionId}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">Amount</dt>
                    <dd className="font-medium">
                      {npr(totalNpr)}
                      {totalDiscount > 0 && (
                        <span className="ml-2 text-muted-foreground">
                          ({npr(totalDiscount)} off
                          {b.couponCode ? ` · ${b.couponCode}` : ""})
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <dt className="text-muted-foreground">Topic</dt>
                    <dd>{b.consultationTopic}</dd>
                  </div>
                  {b.adminNote && (
                    <div className="flex gap-2 sm:col-span-2">
                      <dt className="text-muted-foreground">Note</dt>
                      <dd>{b.adminNote}</dd>
                    </div>
                  )}
                </dl>

                <p className="mt-3 text-xs text-muted-foreground">
                  Submitted {stamp.format(b.createdAt)} · {b.groupId ?? b.id}
                </p>
              </div>

              {/* Order-level decisions: one payment, one approval. */}
              <div className="w-full sm:w-auto">
                <BookingRowActions
                  id={b.id}
                  status={orderStatus}
                  disabled={orderStatus === "CANCELLED"}
                  earnedLabel={earnedNpr > 0 ? npr(earnedNpr) : null}
                />
              </div>
            </div>

            {/* Progress, only where there is a run to be partway through. */}
            {multi && (
              <div className="mt-5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-medium tracking-[0.12em] text-brand uppercase">
                    Progress
                  </p>
                  <p className="text-sm tabular-nums">
                    <span className="font-medium">{done}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      of {live} completed
                    </span>
                  </p>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent"
                  role="progressbar"
                  aria-valuenow={done}
                  aria-valuemin={0}
                  aria-valuemax={live}
                  aria-label={`${done} of ${live} sessions completed`}
                >
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${live ? (done / live) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* One row per day, each closed off on its own. */}
            <ul className="mt-4 divide-y rounded-lg border">
              {sessions.map((s, i) => {
                const key = nepalDateKey(s.startsAt);
                return (
                  <li
                    key={s.id}
                    className={cn(
                      "flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm",
                      key === today && "bg-brand-soft/60",
                    )}
                  >
                    {multi && (
                      <span className="w-10 shrink-0 text-xs text-muted-foreground tabular-nums">
                        {i + 1}/{sessions.length}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{formatDateKey(key)}</span>
                      <span className="ml-2 text-muted-foreground tabular-nums">
                        {formatTime(s.timeSlot)} · {s.durationHours}h
                      </span>
                      {key === today && (
                        <Badge
                          variant="outline"
                          className="ml-2 border-transparent bg-brand text-xs text-primary-foreground"
                        >
                          today
                        </Badge>
                      )}
                    </span>

                    <Badge
                      variant="outline"
                      className={cn("text-xs", bookingStyles[s.bookingStatus])}
                    >
                      {s.bookingStatus.toLowerCase()}
                    </Badge>

                    <div className="flex w-full justify-end sm:w-auto">
                      <SessionRowActions
                        id={s.id}
                        status={s.bookingStatus}
                        note={s.sessionNote}
                      />
                    </div>

                    <Button
                      asChild
                      size="xs"
                      variant="ghost"
                      className="text-muted-foreground"
                    >
                      <Link href={`/admin/bookings/${s.id}/edit`}>
                        <Pencil aria-hidden="true" />
                        Edit
                      </Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
