import { Briefcase, CalendarDays } from "lucide-react";
import type { Booking, Engagement } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { npr } from "@/content/services";
import { formatSession, nepalDateKey } from "@/lib/time";
import { engagementOutstandingNpr, engagementRevenueDate } from "@/lib/money";

/* Bookings and engagements interleaved into one history, newest first.
   They are separate tables on purpose, so they are merged for display
   only — nothing here writes. */

const TYPE_LABEL: Record<Engagement["type"], string> = {
  THESIS_REVIEW: "Thesis review",
  PAPER_REVIEW: "Paper review",
  DATA_ANALYSIS: "Data analysis",
  RESEARCH_CONSULTANCY: "Research consultancy",
  TRAINING: "Training",
  OTHER: "Other work",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[#fef3c7] text-[#b45309]",
  CONFIRMED: "bg-[#d1fae5] text-[#065f46]",
  COMPLETED: "bg-[#ede9fe] text-[#5b21b6]",
  CANCELLED: "bg-secondary text-muted-foreground",
  ENQUIRY: "bg-[#dbeafe] text-[#1e40af]",
  QUOTED: "bg-[#dbeafe] text-[#1e40af]",
  AGREED: "bg-[#d1fae5] text-[#065f46]",
  IN_PROGRESS: "bg-[#fef3c7] text-[#b45309]",
  DELIVERED: "bg-[#ede9fe] text-[#5b21b6]",
};

const stamp = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kathmandu",
  day: "numeric",
  month: "short",
  year: "numeric",
});

type Entry =
  | { kind: "booking"; at: Date; booking: Booking }
  | { kind: "engagement"; at: Date; engagement: Engagement };

export function ClientTimeline({
  bookings,
  engagements,
}: {
  bookings: Booking[];
  engagements: Engagement[];
}) {
  const entries: Entry[] = [
    ...bookings.map<Entry>((b) => ({ kind: "booking", at: b.startsAt, booking: b })),
    ...engagements.map<Entry>((e) => ({
      kind: "engagement",
      at: engagementRevenueDate(e),
      engagement: e,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
        Nothing recorded for this client yet.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {entries.map((entry) => {
        if (entry.kind === "booking") {
          const b = entry.booking;
          return (
            <li key={`b-${b.id}`} className="flex flex-wrap gap-x-4 gap-y-2 p-4">
              <CalendarDays
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">Consultation</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatSession(
                    nepalDateKey(b.startsAt),
                    b.timeSlot,
                    b.durationHours,
                  )}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {b.consultationTopic}
                </p>
              </div>
              <span className="tabular-nums">{npr(b.amountNpr)}</span>
              <Badge
                variant="outline"
                className={cn(
                  "h-fit border-transparent text-xs",
                  STATUS_STYLE[b.bookingStatus],
                )}
              >
                {b.bookingStatus.toLowerCase()}
              </Badge>
            </li>
          );
        }

        const e = entry.engagement;
        const due = engagementOutstandingNpr(e);
        return (
          <li key={`e-${e.id}`} className="flex flex-wrap gap-x-4 gap-y-2 p-4">
            <Briefcase
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{e.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {TYPE_LABEL[e.type]} · {stamp.format(entry.at)}
              </p>
              {e.notes && (
                <p className="mt-0.5 text-sm text-muted-foreground">{e.notes}</p>
              )}
            </div>
            <span className="text-right tabular-nums">
              {npr(e.amountPaidNpr)}
              {due > 0 && (
                <span className="block text-xs text-[#b45309]">
                  {npr(due)} due
                </span>
              )}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "h-fit border-transparent text-xs",
                STATUS_STYLE[e.status],
              )}
            >
              {e.status.replace("_", " ").toLowerCase()}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
