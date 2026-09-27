import { AlertTriangle } from "lucide-react";
import type { Booking } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatSession, nepalDateKey } from "@/lib/time";
import { npr } from "@/content/services";
import { BookingRowActions } from "./BookingRowActions";

/* Status colours reuse the palette already on the site rather than adding
   new ones: see the quartile and role badges in ResearchList. */
const paymentStyles: Record<Booking["paymentStatus"], string> = {
  PENDING: "bg-[#fef3c7] text-[#b45309] border-transparent",
  VERIFIED: "bg-[#d1fae5] text-[#065f46] border-transparent",
  REJECTED: "bg-destructive/10 text-destructive border-transparent",
};

const bookingStyles: Record<Booking["bookingStatus"], string> = {
  PENDING: "bg-[#dbeafe] text-[#1e40af] border-transparent",
  CONFIRMED: "bg-[#d1fae5] text-[#065f46] border-transparent",
  COMPLETED: "bg-[#ede9fe] text-[#5b21b6] border-transparent",
  CANCELLED: "bg-secondary text-muted-foreground border-transparent",
};

const stamp = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kathmandu",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

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
      {bookings.map((b) => {
        const awaiting =
          b.paymentStatus === "PENDING" && b.bookingStatus === "PENDING";

        return (
          <li
            key={b.id}
            className={cn(
              "rounded-xl border bg-card p-5",
              // Pending verification is the row that needs action, given the
              // same accent the site uses for its other highlights.
              awaiting && "border-navy/30 bg-accent/40 ring-1 ring-navy/10",
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

                <h3 className="mt-2.5 text-lg font-semibold">
                  {b.clientName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  <a
                    href={`mailto:${b.clientEmail}`}
                    className="underline-offset-4 hover:text-navy hover:underline"
                  >
                    {b.clientEmail}
                  </a>
                </p>

                <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">When</dt>
                    <dd className="font-medium">
                      {formatSession(
                        nepalDateKey(b.startsAt),
                        b.timeSlot,
                        b.durationHours,
                      )}
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
                      {npr(b.amountNpr)}
                      {b.discountNpr > 0 && (
                        <span className="ml-1.5 text-muted-foreground">
                          ({npr(b.discountNpr)} off
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
                  Submitted {stamp.format(b.createdAt)} · {b.id}
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
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
