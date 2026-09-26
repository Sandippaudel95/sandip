"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, CalendarClock, AlertTriangle } from "lucide-react";
import {
  bookingConfig,
  isBookingConfigured,
  normalizeCalLink,
  normalizeCalendlyLink,
} from "@/lib/booking";
import { Button } from "@/components/ui/button";

/* The two vendor globals we touch. Both embeds are loaded as plain scripts
   rather than npm packages, to keep the bundle small (see CLAUDE.md). */
declare global {
  interface Window {
    Cal?: ((...args: unknown[]) => void) & { loaded?: boolean };
    Calendly?: {
      initInlineWidget: (opts: {
        url: string;
        parentElement: HTMLElement;
      }) => void;
    };
  }
}

/* Cal.com's official loader. embed.js does NOT define window.Cal itself: it
   drains a queue the page must install first, so loading the script alone
   fails with "Cal is not defined". This is the vendor snippet verbatim,
   injected inline so it runs synchronously. */
const CAL_EMBED_SRC = "https://app.cal.com/embed/embed.js";
const CAL_LOADER_ID = "cal-embed-loader";
const CAL_LOADER = `(function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "${CAL_EMBED_SRC}", "init");`;

function ensureCalLoader(): void {
  if (window.Cal || document.getElementById(CAL_LOADER_ID)) return;
  const el = document.createElement("script");
  el.id = CAL_LOADER_ID;
  el.textContent = CAL_LOADER;
  document.head.appendChild(el);
}

/** Load a script once; repeated calls for the same src share one promise. */
const scriptPromises = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const existing = scriptPromises.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(el);
  });

  scriptPromises.set(src, promise);
  return promise;
}

function loadStylesheet(href: string): void {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const el = document.createElement("link");
  el.rel = "stylesheet";
  el.href = href;
  document.head.appendChild(el);
}

type EmbedState = "loading" | "ready" | "error";

/* Both vendors refuse to mount twice into the same element and warn when
   asked to. React StrictMode runs effects twice in development, so track
   which elements are already initialised. React hands a remounted component
   a fresh node, so a genuine remount is never skipped. */
const mountedElements = new WeakSet<HTMLElement>();

export function BookingEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<EmbedState>("loading");
  const configured = isBookingConfigured();
  const { provider, link, fallbackEmail } = bookingConfig;

  useEffect(() => {
    if (!configured) return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    async function mount(target: HTMLElement) {
      if (mountedElements.has(target)) {
        setState("ready");
        return;
      }
      mountedElements.add(target);

      try {
        if (provider === "calendly") {
          loadStylesheet(
            "https://assets.calendly.com/assets/external/widget.css",
          );
          await loadScript(
            "https://assets.calendly.com/assets/external/widget.js",
          );
          if (cancelled || !window.Calendly) return;

          window.Calendly.initInlineWidget({
            url: normalizeCalendlyLink(link),
            parentElement: target,
          });
        } else {
          ensureCalLoader();
          if (cancelled || !window.Cal) {
            throw new Error("Cal.com embed loader did not install");
          }

          window.Cal("init", { origin: "https://cal.com" });
          window.Cal("inline", {
            elementOrSelector: target,
            calLink: normalizeCalLink(link),
            layout: "month_view",
          });
          window.Cal("ui", {
            layout: "month_view",
            hideEventTypeDetails: false,
            styles: { branding: { brandColor: "#0a2540" } },
          });
        }

        if (!cancelled) setState("ready");
      } catch {
        // Let the next mount retry rather than latching the element shut.
        mountedElements.delete(target);
        if (!cancelled) setState("error");
      }
    }

    void mount(el);

    return () => {
      cancelled = true;
    };
  }, [configured, provider, link]);

  /* ---------------------------------------------------------------
     Not set up yet: keep the route useful instead of showing a
     broken iframe. Mirrors how the previous site degraded.
     --------------------------------------------------------------- */
  if (!configured) {
    return (
      <div className="rounded-lg border border-dashed border-input bg-muted/50 p-8 text-center sm:p-12">
        <CalendarClock
          className="mx-auto mb-4 size-8 text-muted-foreground"
          aria-hidden="true"
        />
        <h2 className="text-xl font-semibold">Online booking opens shortly</h2>
        <p className="mx-auto mt-2 max-w-prose text-muted-foreground">
          The scheduling calendar is being set up. In the meantime, email me
          with a few times that suit you and the topic you would like to
          discuss, and I will confirm a slot directly.
        </p>
        <Button asChild className="mt-6">
          <a href={`mailto:${fallbackEmail}?subject=Consultation%20enquiry`}>
            <Mail aria-hidden="true" />
            Email to arrange a session
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div>
      {state === "error" && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <p>
            The booking calendar could not load. Check your connection and
            refresh, or{" "}
            <a
              href={`mailto:${fallbackEmail}?subject=Consultation%20enquiry`}
              className="font-medium text-navy underline underline-offset-4"
            >
              email me
            </a>{" "}
            to arrange a time.
          </p>
        </div>
      )}

      {/* Calendly's inline widget does not self-size, so the wrapper sets the
          height. Cal.com self-resizes, and treats these as a floor. */}
      <div
        ref={containerRef}
        data-testid="booking-embed"
        className="w-full min-h-[720px] overflow-hidden rounded-lg border bg-card sm:min-h-[760px] lg:min-h-[820px]"
        style={{ minWidth: 0 }}
        aria-busy={state === "loading"}
        aria-label="Booking calendar"
      />
    </div>
  );
}
