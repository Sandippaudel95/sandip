import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { Clock, Video, FileText } from "lucide-react";
import { Section } from "@/components/layout/Section";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { getAvailability, type DayAvailability } from "@/lib/slots";
import { getAvailabilitySettings } from "@/lib/availability";
import { profile } from "@/content/profile";
import { HOURLY_RATE, HOURLY_RATE_NPR } from "@/content/services";

export const metadata: Metadata = {
  title: "Book a Consultation",
  description:
    "Book a one-to-one research consultation with Sandip Paudel: methods and analysis advice for Bachelor, Master, MPhil and PhD students and faculty. Rs. 5,000 per hour.",
  alternates: { canonical: "/book" },
};

/* Availability depends on live bookings, so this page must not be cached. */
export const dynamic = "force-dynamic";

const QR_CANDIDATES = [
  "images/payment-qr.png",
  "images/payment-qr.jpg",
  "images/payment-qr.jpeg",
  "images/payment-qr.webp",
];

function findQr(): string | null {
  for (const rel of QR_CANDIDATES) {
    if (fs.existsSync(path.join(process.cwd(), "public", rel))) return `/${rel}`;
  }
  return null;
}

const expectations = [
  {
    icon: Clock,
    title: "Come with the question",
    detail:
      "The sharper the question, the more we get through. A stalled chapter, a model that will not converge, or an analysis you want checked.",
  },
  {
    icon: FileText,
    title: "Send material in advance",
    detail:
      "Drafts, datasets or a short brief, shared ahead of time, mean the session starts at the substance rather than the background.",
  },
  {
    icon: Video,
    title: "Online or in person",
    detail: `Most sessions run online. In-person sessions are at ${profile.office}.`,
  },
];

export default async function BookPage() {
  // One query per offered length: a 2-hour session needs two free hours back
  // to back, so the available sets genuinely differ.
  const rules = await getAvailabilitySettings();
  const lists = await Promise.all(
    rules.sessionLengths.map(
      async (h) => [h, await getAvailability(h, rules)] as const,
    ),
  );
  const availability = Object.fromEntries(lists) as Record<
    number,
    DayAvailability[]
  >;

  return (
    <>
      {/* Deliberately tighter and smaller than the other pages' headers.
          This is a utility page: arriving here from "Book a Consultation"
          should put the first step of the form on screen, not a title and
          a scrollbar. */}
      <Section className="pt-8 sm:pt-10 lg:pt-12">
        <header className="max-w-3xl">
          <p className="pill-label">Booking</p>
          <h1 className="mt-4 text-3xl leading-tight font-normal tracking-tight sm:text-4xl">
            Book a Consultation
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground text-pretty">
            One-to-one sessions for students and faculty, at {HOURLY_RATE_NPR}{" "}
            per hour. Pick a time, pay, and your booking is confirmed once the
            payment has been verified.
          </p>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-14">
          {/* The form leads on narrow screens. Reading three paragraphs of
              preamble before reaching it is the wrong way round. */}
          <aside className="order-2 lg:order-1">
            <h2 className="text-lg font-semibold">What to expect</h2>
            <ul className="mt-5 space-y-6">
              {expectations.map((item) => (
                <li key={item.title} className="flex gap-4">
                  <item.icon
                    className="mt-1 size-5 shrink-0 text-brand"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-8 rounded-lg border bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">
              Thesis review, paper review, data analysis, commissioned
              research and training are quoted separately. Email{" "}
              <a
                href={`mailto:${profile.emails[0]}`}
                className="font-medium text-brand underline underline-offset-4"
              >
                {profile.emails[0]}
              </a>{" "}
              about those.
            </p>
          </aside>

          <div className="order-1 min-w-0 lg:order-2">
            <BookingWizard
              availability={availability}
              qrSrc={findQr()}
              hourlyRate={HOURLY_RATE}
              sessionLengths={rules.sessionLengths}
              noticeHours={rules.minimumNoticeHours}
              windowDays={rules.bookingWindowDays}
              maxHoursPerDay={rules.maxHoursPerClientPerDay}
            />
          </div>
        </div>
      </Section>
    </>
  );
}
