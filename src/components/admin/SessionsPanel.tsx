import Link from "next/link";
import { CalendarOff, Clock, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { npr } from "@/content/services";
import { formatDateKey, formatTime, nepalDateKey } from "@/lib/time";
import type { BookingWithClient } from "@/lib/crm";

/* Used for both Today and Upcoming: the same row, grouped by day when the
   list spans more than one. */
export function SessionsPanel({
  bookings,
  emptyMessage,
  groupByDay = false,
}: {
  bookings: BookingWithClient[];
  emptyMessage: string;
  groupByDay?: boolean;
}) {
  if (bookings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <CalendarOff
          className="mx-auto mb-3 size-7 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  const groups = new Map<string, BookingWithClient[]>();
  for (const b of bookings) {
    const key = nepalDateKey(b.startsAt);
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([day, items]) => (
        <div key={day}>
          {groupByDay && (
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              {formatDateKey(day)}
            </h3>
          )}
          <ul className="divide-y rounded-xl border bg-card">
            {items.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4"
              >
                <span className="flex items-center gap-2 font-medium tabular-nums">
                  <Clock
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {formatTime(b.timeSlot)}
                </span>

                <span className="text-muted-foreground">
                  {b.durationHours}h
                </span>

                <span className="min-w-0 flex-1">
                  {b.client ? (
                    <Link
                      href={`/admin/clients/${b.client.id}`}
                      className="font-medium text-brand underline-offset-4 hover:underline"
                    >
                      {b.clientName}
                    </Link>
                  ) : (
                    <span className="font-medium">{b.clientName}</span>
                  )}
                  <span className="block truncate text-sm text-muted-foreground">
                    {b.consultationTopic}
                  </span>
                </span>

                <span className="tabular-nums">{npr(b.amountNpr)}</span>

                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    b.bookingStatus === "CONFIRMED"
                      ? "border-transparent bg-success/15 text-success"
                      : b.bookingStatus === "COMPLETED"
                        ? "border-transparent bg-accent text-accent-foreground"
                        : "border-transparent bg-warning/15 text-warning",
                  )}
                >
                  {b.bookingStatus === "PENDING"
                    ? "unpaid"
                    : b.bookingStatus.toLowerCase()}
                </Badge>

                <Video
                  className="size-4 text-muted-foreground"
                  aria-label="Online session"
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
