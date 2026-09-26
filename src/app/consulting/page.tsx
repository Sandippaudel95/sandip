import type { Metadata } from "next";
import { Section, SectionHeader } from "@/components/layout/Section";
import { ServicePackages } from "@/components/sections/ServicePackages";
import { CTA } from "@/components/sections/CTA";

export const metadata: Metadata = {
  title: "Consulting Services",
  description:
    "Consulting in data analysis and econometrics, CRM and operational workflows, and business and economic strategy, for organisations in Nepal and beyond.",
  alternates: { canonical: "/consulting" },
};

const process = [
  {
    step: "01",
    title: "Scoping call",
    detail:
      "Thirty minutes to establish the question, what data exists, and whether I am the right person for it.",
  },
  {
    step: "02",
    title: "Proposal",
    detail:
      "A written scope with deliverables, timeline and fee. No work begins before you agree to it.",
  },
  {
    step: "03",
    title: "Analysis",
    detail:
      "The work itself, with a checkpoint partway through so findings are never a surprise at the end.",
  },
  {
    step: "04",
    title: "Handover",
    detail:
      "Report, underlying scripts and a walkthrough session, so your team can rerun the analysis later.",
  },
];

export default function ConsultingPage() {
  return (
    <>
      <Section className="pb-0">
        <SectionHeader
          kicker="Consulting"
          title="Consulting Services"
          lede="The same empirical standards I apply to published research, brought to commercial and institutional questions."
        />
      </Section>

      <Section className="pt-10">
        <ServicePackages />
      </Section>

      <Section alt>
        <SectionHeader
          kicker="Process"
          title="How an engagement runs"
          lede="Deliberately predictable, so you know what happens next at every stage."
        />

        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {process.map((item) => (
            <li key={item.step} className="rounded-lg border bg-card p-5">
              <span className="font-serif text-2xl font-semibold text-navy/30 tabular-nums">
                {item.step}
              </span>
              <h3 className="mt-2 font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {item.detail}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <CTA
        title="Start with a scoping call"
        body="Bring the question and whatever data you have. If the work is not a good fit for me, I will say so and point you elsewhere."
      />
    </>
  );
}
