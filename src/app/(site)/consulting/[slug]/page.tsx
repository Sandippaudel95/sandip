import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Mail } from "lucide-react";
import { services } from "@/content/services";
import { profile } from "@/content/profile";
import {
  JsonLd,
  breadcrumbSchema,
  serviceSchema,
} from "@/lib/schema";
import { Section, Container } from "@/components/layout/Section";
import { Button } from "@/components/ui/button";

/* One page per service.
 *
 * The /consulting index sells all five at once, which gives a search for
 * "thesis review Nepal" nothing specific to match: one page cannot be
 * the best answer to five different questions. These are generated from
 * the same array that drives the index, so the content has one home and
 * a new service gets a page, a sitemap entry and its own Service schema
 * without anything else being touched. */

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.id }));
}

const find = (slug: string) => services.find((s) => s.id === slug);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = find(slug);
  if (!service) return {};

  return {
    title: `${service.name} in Nepal`,
    description: `${service.summary} ${service.price}. For ${service.audience.toLowerCase()}`.slice(
      0,
      300,
    ),
    alternates: { canonical: `/consulting/${service.id}` },
    openGraph: {
      type: "article",
      title: `${service.name} | ${profile.name}`,
      description: service.summary,
      url: `/consulting/${service.id}`,
    },
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = find(slug);
  if (!service) notFound();

  const others = services.filter((s) => s.id !== service.id);

  return (
    <>
      <JsonLd
        schema={[
          serviceSchema(service),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Services", path: "/consulting" },
            { name: service.name, path: `/consulting/${service.id}` },
          ]),
        ]}
      />

      <Section className="pt-10 pb-0 sm:pt-12">
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link href="/consulting" className="underline-offset-4 hover:text-brand hover:underline">
            Services
          </Link>
          <span className="mx-2" aria-hidden="true">
            /
          </span>
          <span className="text-foreground">{service.name}</span>
        </nav>

        <header className="mt-6 max-w-3xl">
          <p className="pill-label">Research consultancy</p>
          {/* The one h1, carrying the keyword this page exists to answer. */}
          <h1 className="mt-4 text-4xl leading-[1.1] font-normal tracking-tight sm:text-5xl">
            {service.name} in Nepal
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
            {service.summary}
          </p>
        </header>
      </Section>

      <Section className="pt-10">
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr] lg:gap-14">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-[0.12em] text-brand uppercase">
              Who it is for
            </h2>
            <p className="mt-3 leading-relaxed text-pretty">{service.audience}</p>

            <h2 className="mt-10 text-sm font-semibold tracking-[0.12em] text-brand uppercase">
              What is included
            </h2>
            <ul className="mt-4 space-y-3">
              {service.includes.map((line) => (
                <li key={line} className="flex gap-3 leading-relaxed">
                  <Check
                    className="mt-1 size-4 shrink-0 text-brand"
                    aria-hidden="true"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <h2 className="mt-10 text-sm font-semibold tracking-[0.12em] text-brand uppercase">
              How it runs
            </h2>
            <p className="mt-3 leading-relaxed">{service.format}</p>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border bg-card p-6">
              <p className="text-sm text-muted-foreground">Fee</p>
              <p className="mt-1 font-display text-2xl font-semibold text-brand">
                {service.price}
              </p>
              {service.priceNote && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {service.priceNote}
                </p>
              )}

              <Button asChild className="mt-6 w-full">
                <Link href="/book">
                  Book or request this
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="mt-3 w-full">
                <a href={`mailto:${profile.emails[0]}`}>
                  <Mail aria-hidden="true" />
                  Ask a question
                </a>
              </Button>
            </div>
          </aside>
        </div>
      </Section>

      <Section alt>
        <Container className="px-0">
          <h2 className="text-sm font-semibold tracking-[0.12em] text-brand uppercase">
            Other services
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/consulting/${s.id}`}
                  className="block h-full rounded-xl border bg-card p-5 transition-colors hover:border-brand/30 hover:bg-accent/60"
                >
                  <h3 className="font-medium">{s.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.summary}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </>
  );
}
