import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/layout/Section";
import { ResearchList } from "@/components/sections/ResearchList";
import { CTA } from "@/components/sections/CTA";

export const metadata: Metadata = {
  title: "Research and Publications",
  description:
    "Peer-reviewed articles, working papers, conference presentations and research training by Sandip Paudel, covering financial econometrics, market efficiency, NEPSE and behavioral finance.",
  alternates: { canonical: "/research" },
};

export default function ResearchPage() {
  return (
    <>
      <Section className="pb-0">
        <SectionHeader
          kicker="Research"
          title="Research and Publications"
          lede="Work in financial econometrics, market efficiency and behavioral finance, with applications to the Nepal Stock Exchange and Nepali households."
        />
      </Section>

      <Section className="pt-10">
        <ResearchList />
      </Section>

      <CTA
        title="Research collaboration"
        body="I welcome inquiries about collaboration, supervision, workshops and academic referee requests."
      />
    </>
  );
}
