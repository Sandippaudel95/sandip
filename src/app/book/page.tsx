import type { Metadata } from "next";
import { Clock, Video, FileText } from "lucide-react";
import { Section, SectionHeader } from "@/components/layout/Section";
import { BookingEmbed } from "@/components/booking/BookingEmbed";
import { profile } from "@/content/profile";

export const metadata: Metadata = {
  title: "Book a Consultation",
  description:
    "Book a one-to-one consultation with Sandip Paudel: research supervision and methods advice for Bachelor, Master, MPhil and PhD students, or a scoping call for organisational consulting work.",
  alternates: { canonical: "/book" },
};

const expectations = [
  {
    icon: Clock,
    title: "Come with the question",
    detail:
      "The sharper the question, the more we get through. A stalled chapter, a model that will not converge, or a decision you need evidence for.",
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

export default function BookPage() {
  return (
    <>
      <Section className="pb-0">
        <SectionHeader
          kicker="Booking"
          title="Book a Consultation"
          lede="One-to-one sessions for research students, and scoping calls for organisations. Pick a time that suits you below."
        />
      </Section>

      <Section className="pt-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-12">
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
              Cannot find a time that works? Email{" "}
              <a
                href={`mailto:${profile.emails[0]}`}
                className="font-medium text-navy underline underline-offset-4"
              >
                {profile.emails[0]}
              </a>{" "}
              with a few times that suit you.
            </p>
          </aside>

          <div className="min-w-0">
            <BookingEmbed />
          </div>
        </div>
      </Section>
    </>
  );
}
