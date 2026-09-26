import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Section, SectionHeader } from "@/components/layout/Section";
import { ConferenceCard } from "@/components/sections/ConferenceCard";
import { CTA } from "@/components/sections/CTA";
import { conferences, conferencesByYear } from "@/content/conferences";

export const metadata: Metadata = {
  title: "Conference Presentations",
  description:
    "The full list of conference presentations by Sandip Paudel, covering market efficiency, NEPSE, financial econometrics, women's empowerment and bibliometric research, in Nepal and abroad.",
  alternates: { canonical: "/research/conferences" },
};

export default function ConferencesPage() {
  const groups = conferencesByYear();
  const awards = conferences.filter((c) => c.award).length;

  return (
    <>
      <Section className="pb-0">
        <Link
          href="/research"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-navy hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to research
        </Link>

        <SectionHeader
          className="mt-6"
          kicker="Research"
          title="Conference Presentations"
          level={1}
          lede={`${conferences.length} appearances at national and international conferences${
            awards ? `, including ${awards} presentation awards` : ""
          }.`}
        />
      </Section>

      <Section className="pt-10">
        {groups.map((group) => (
          <section key={group.year} className="mb-12 last:mb-0">
            <h2 className="flex items-baseline gap-3 border-b pb-3 font-serif text-2xl font-semibold">
              {group.year}
              <span className="text-sm font-normal text-muted-foreground">
                {group.items.length}{" "}
                {group.items.length === 1 ? "conference" : "conferences"}
              </span>
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <ConferenceCard
                  key={`${item.date}-${item.paper}`}
                  item={item}
                />
              ))}
            </div>
          </section>
        ))}
      </Section>

      <CTA
        title="Speaking and presentations"
        body="I present regularly at conferences in Nepal and abroad, and run research sessions for departments. Get in touch about either."
      />
    </>
  );
}
