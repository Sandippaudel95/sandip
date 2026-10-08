"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarPlus, Search, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { npr } from "@/content/services";
import type { ClientSummary } from "@/lib/crm";

const statusStyles: Record<string, string> = {
  LEAD: "bg-brand-soft text-brand border-transparent",
  ACTIVE: "bg-success/15 text-success border-transparent",
  PAST: "bg-secondary text-muted-foreground border-transparent",
  ARCHIVED: "bg-secondary text-muted-foreground border-transparent",
};

const stamp = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kathmandu",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function ClientsTable({ summaries }: { summaries: ClientSummary[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return summaries.filter((s) => {
      if (status !== "ALL" && s.client.status !== status) return false;
      if (!q) return true;
      return [s.client.name, s.client.email, s.client.organisation ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [summaries, query, status]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="client-search" className="sr-only">
            Search clients
          </label>
          <input
            id="client-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email or organisation"
            className="w-full rounded-full border bg-background py-3 pr-4 pl-9 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-ring"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {["ALL", "LEAD", "ACTIVE", "PAST", "ARCHIVED"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full px-3 py-2 text-xs font-medium transition-colors",
                status === s
                  ? "bg-brand text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {s === "ALL" ? "All" : s.toLowerCase()}
            </button>
          ))}
        </div>

        <Button asChild size="sm">
          <Link href="/admin/clients/new">
            <UserPlus aria-hidden="true" />
            Add client
          </Link>
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed p-10 text-center">
          <Users
            className="mx-auto mb-3 size-7 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-muted-foreground">
            {summaries.length === 0
              ? "No clients yet. They are created automatically from bookings, or add one by hand."
              : "No clients match that search."}
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y rounded-xl border bg-card">
          {filtered.map((s) => (
            // The row is a link, so the booking shortcut sits beside it
            // rather than inside: a link inside a link is invalid, and
            // clicking Book should not also open the client.
            <li
              key={s.client.id}
              className="flex items-center gap-2 pr-4 transition-colors hover:bg-muted/60"
            >
              <Link
                href={`/admin/clients/${s.client.id}`}
                className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 p-4"
              >
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{s.client.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {s.client.email}
                    {s.client.organisation ? ` · ${s.client.organisation}` : ""}
                  </span>
                </span>

                <Badge
                  variant="outline"
                  className={cn("text-xs", statusStyles[s.client.status])}
                >
                  {s.client.status.toLowerCase()}
                </Badge>

                <span className="text-sm text-muted-foreground">
                  {s.bookingCount} session{s.bookingCount === 1 ? "" : "s"}
                  {s.engagementCount > 0 && ` · ${s.engagementCount} job${s.engagementCount === 1 ? "" : "s"}`}
                </span>

                <span className="tabular-nums">{npr(s.totalPaidNpr)}</span>

                {s.outstandingNpr > 0 && (
                  <Badge
                    variant="outline"
                    className="border-transparent bg-warning/15 text-xs text-warning"
                  >
                    {npr(s.outstandingNpr)} due
                  </Badge>
                )}

                <span className="w-28 text-right text-sm text-muted-foreground">
                  {s.lastActivity ? stamp.format(s.lastActivity) : "—"}
                </span>
              </Link>

              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link href={`/admin/bookings/new?client=${s.client.id}`}>
                  <CalendarPlus aria-hidden="true" />
                  <span className="hidden sm:inline">Book</span>
                  <span className="sr-only sm:hidden">
                    Book a session for {s.client.name}
                  </span>
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
