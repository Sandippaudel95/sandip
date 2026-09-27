import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { Clock, Video, FileText } from "lucide-react";
import { Section, SectionHeader } from "@/components/layout/Section";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { getAvailability, type DayAvailability } from "@/lib/slots";
import { sessionLengths } from "@/content/availability";
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
  const lists = await Promise.all(
    sessionLengths.map(async (h) => [h, await getAvailability(h)] as const),
  );
  const availability = Object.fromEntries(lists) as Record<
    number,
    DayAvailability[]
  >;

  return (
    <>
      <Section className="pb-0">
        <SectionHeader
          kicker="Booking"
          title="Book a Consultation"
          level={1}
          lede={`One-to-one sessions for students and faculty, at ${HOURLY_RATE_NPR} per hour. Pick a time, pay, and your booking is confirmed once the payment has been verified.`}
        />
      </Section>

      <Section className="pt-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-14">
          <aside>
            <h2 className="text-lg font-semibold">What to expect</h2>
            <ul className="mt-5 space-y-6">
              {expectations.map((item) => (
                <li key={item.title} className="flex gap-3.5">
                  <item.icon
                    className="mt-0.5 size-5 shrink-0 text-navy"
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
                className="font-medium text-navy underline underline-offset-4"
              >
                {profile.emails[0]}
              </a>{" "}
              about those.
            </p>
          </aside>

          <div className="min-w-0">
            <BookingWizard
              availability={availability}
              qrSrc={findQr()}
              hourlyRate={HOURLY_RATE}
            />
          </div>
        </div>
      </Section>
    </>
  );
}
