import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/layout/Section";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { EducationTimeline } from "@/components/sections/EducationTimeline";
import { CTA } from "@/components/sections/CTA";
import { services, HOURLY_RATE_NPR } from "@/content/services";
import { publications } from "@/content/publications";

export default function HomePage() {
  const recent = publications.slice(0, 3);

  return (
    <>
      <Hero />
      <About />
      <EducationTimeline />

      {/* Consulting teaser */}
      <Section id="services">
        <SectionHeader
          kicker="03 / Services"
          title="Research consultancy and training"
          lede={`One-to-one sessions at ${HOURLY_RATE_NPR} per hour, and longer engagements scoped and quoted to the work.`}
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {services.slice(0, 3).map((pkg) => (
            <article
              key={pkg.id}
              className="flex flex-col rounded-2xl border bg-white/[0.035] p-6"
            >
              <h3 className="text-lg font-semibold tracking-tight">
                {pkg.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {pkg.summary}
              </p>
              <p className="mt-3 font-display text-base font-semibold text-violet-light">
                {pkg.price}
              </p>
              <ul className="mt-4 space-y-1.5">
                {pkg.includes.slice(0, 3).map((line) => (
                  <li key={line} className="flex gap-2 text-sm">
                    <Check
                      className="mt-0.5 size-3.5 shrink-0 text-violet-light"
                      aria-hidden="true"
                    />
                    <span className="text-muted-foreground">{line}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/consulting#${pkg.id}`}
                className="mt-auto pt-5 text-sm font-medium text-violet-light underline-offset-4 hover:underline"
              >
                Read more
              </Link>
            </article>
          ))}
        </div>

        <Button asChild variant="outline" className="mt-8">
          <Link href="/consulting">
            All services and fees
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </Section>

      {/* Recent research */}
      <Section id="research" alt>
        <SectionHeader
          kicker="04 / Research"
          title="Recent publications"
          lede="Peer-reviewed work in financial econometrics, market efficiency and behavioral finance."
        />

        <ol className="mt-10 max-w-3xl">
          {recent.map((item) => (
            <li key={item.citation} className="border-b py-5 first:pt-0">
              <span className="font-display text-sm font-semibold text-violet-light tabular-nums">
                {item.year}
              </span>
              <p className="prose-academic mt-2">
                {item.citation}
                {item.outlet && <em> {item.outlet}</em>}
              </p>
            </li>
          ))}
        </ol>

        <Button asChild variant="outline" className="mt-8">
          <Link href="/research">
            All publications and conferences
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </Section>

      <CTA />
    </>
  );
}
