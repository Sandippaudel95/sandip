import { AlertTriangle } from "lucide-react";
import type { Booking } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatSession, nepalDateKey } from "@/lib/time";
import { npr } from "@/content/services";
import { bookingIsEarned } from "@/lib/money";
import { BookingRowActions } from "./BookingRowActions";

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
 * Sessions share a groupId when they were one order. Shown as one card per
 * order rather than one per day, because they carry one payment and one
 * decision: two cards each offering "Verify" for the same transaction
 * invites verifying the same money twice.
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

  return (
    <ul className="space-y-4">
      {intoOrders(bookings).map((sessions) => {
        // Order-level facts are identical across the rows; the first is as
        // good as any. Money is the exception and has to be summed.
        const b = sessions[0];
        const totalNpr = sessions.reduce((sum, s) => sum + s.amountNpr, 0);
        const totalDiscount = sessions.reduce(
          (sum, s) => sum + s.discountNpr,
          0,
        );
        const earnedNpr = sessions
          .filter(bookingIsEarned)
          .reduce((sum, s) => sum + s.amountNpr, 0);
        const awaiting =
          b.paymentStatus === "PENDING" && b.bookingStatus === "PENDING";

        return (
          <li
            key={b.groupId ?? b.id}
            className={cn(
              "rounded-xl border bg-card p-5",
              // Pending verification is the row that needs action, given the
              // same accent the site uses for its other highlights.
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
                  <Badge
                    variant="outline"
                    className={cn("text-xs", bookingStyles[b.bookingStatus])}
                  >
                    Booking: {b.bookingStatus.toLowerCase()}
                  </Badge>
                  {b.emailFailed && (
                    <Badge
                      variant="outline"
                      className="border-destructive/30 bg-destructive/10 text-xs text-destructive"
                    >
                      <AlertTriangle className="size-3" aria-hidden="true" />
                      Email not sent
                    </Badge>
                  )}
                </div>

                <h3 className="mt-3 text-lg font-semibold">
                  {b.clientName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  <a
                    href={`mailto:${b.clientEmail}`}
                    className="underline-offset-4 hover:text-brand hover:underline"
                  >
                    {b.clientEmail}
                  </a>
                </p>

                <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div className="flex gap-2 sm:col-span-2">
                    <dt className="shrink-0 text-muted-foreground">
                      {sessions.length > 1
                        ? `${sessions.length} sessions`
                        : "When"}
                    </dt>
                    <dd className="font-medium">
                      {sessions.map((s) => (
                        <span key={s.id} className="block">
                          {formatSession(
                            nepalDateKey(s.startsAt),
                            s.timeSlot,
                            s.durationHours,
                          )}
                        </span>
                      ))}
                    </dd>
                  </div>
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
                  Submitted {stamp.format(b.createdAt)} ·{" "}
                  {b.groupId ?? b.id}
                </p>
              </div>

              <div className="w-full sm:w-auto">
                <BookingRowActions
                  id={b.id}
                  status={b.bookingStatus}
                  disabled={
                    b.bookingStatus !== "PENDING" &&
                    b.bookingStatus !== "CONFIRMED"
                  }
                  earnedLabel={earnedNpr > 0 ? npr(earnedNpr) : null}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
