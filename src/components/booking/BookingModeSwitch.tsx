"use client";

import { useState } from "react";
import { BookOpen, CalendarClock, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkEnquiryForm } from "./WorkEnquiryForm";

/* Two different things are being asked for here, and they do not share a
   shape.
 *
 * An hourly consultation has a slot and a price, so it is picked from the
 * calendar and paid for. Reviews, analysis and training are quoted
 * individually, so there is no time to choose and nothing to pay yet;
 * showing a calendar for those would ask the client for something that
 * does not exist. The choice comes first, and each path then shows only
 * what it actually needs. */
export function BookingModeSwitch({
  consultation,
  email,
  qrSrc,
}: {
  /** The existing wizard, rendered on the server and passed through. */
  consultation: React.ReactNode;
  email: string;
  /** The same payment QR the consultation flow uses. */
  qrSrc: string | null;
}) {
  const [mode, setMode] = useState<"consultation" | "work">("consultation");

  const options = [
    {
      value: "consultation" as const,
      icon: CalendarClock,
      title: "A consultation",
      blurb: "An hour or two on a question. Pick a time and pay now.",
    },
    {
      value: "work" as const,
      icon: FileSearch,
      title: "A piece of work",
      blurb:
        "Thesis or paper review, data analysis, training. Quoted first, no date needed.",
    },
  ];

  return (
    <div>
      <fieldset>
        <legend className="text-sm font-semibold tracking-[0.12em] text-brand uppercase">
          What do you need?
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {options.map((o) => {
            const active = mode === o.value;
            return (
              <label
                key={o.value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors",
                  active
                    ? "border-brand/30 bg-brand-soft ring-1 ring-brand/30"
                    : "border-input hover:border-brand/30 hover:bg-accent/60",
                )}
              >
                <input
                  type="radio"
                  name="bookingMode"
                  value={o.value}
                  checked={active}
                  onChange={() => setMode(o.value)}
                  className="sr-only"
                />
                <o.icon
                  className={cn(
                    "mt-0.5 size-5 shrink-0",
                    active ? "text-brand" : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block font-medium">{o.title}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                    {o.blurb}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-8">
        {mode === "consultation" ? (
          consultation
        ) : (
          <>
            <div className="mb-6 flex gap-3 rounded-xl border bg-card p-4">
              <BookOpen
                className="mt-0.5 size-4 shrink-0 text-brand"
                aria-hidden="true"
              />
              <p className="text-sm leading-relaxed text-muted-foreground">
                This kind of work is priced per job rather than per hour, so
                there is no time to choose. Describe what you need and a
                quote will follow by email.
              </p>
            </div>
            <WorkEnquiryForm email={email} qrSrc={qrSrc} />
          </>
        )}
      </div>
    </div>
  );
}
