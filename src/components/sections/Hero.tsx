import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Section";
import { profile, profileLinks, stats } from "@/content/profile";

/* The hero carries the whole point of the redesign: two practices, stated
   side by side, with one primary action. */
export function Hero() {
  return (
    <section className="border-b bg-gradient-to-b from-accent/40 to-background">
      <Container className="py-16 sm:py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {profile.role}
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              {profile.name}
            </h1>

            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {profile.affiliations.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty">
              {profile.tagline}
            </p>

            {/* The two strands, given equal visual weight. */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-card p-5">
                <BookOpen
                  className="size-5 text-navy"
                  aria-hidden="true"
                />
                <h2 className="mt-3 font-serif text-base font-semibold">
                  Academic research
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Management, economics and finance: market efficiency,
                  long-memory volatility and behavioral finance.
                </p>
              </div>

              <div className="rounded-lg border bg-card p-5">
                <LineChart
                  className="size-5 text-navy"
                  aria-hidden="true"
                />
                <h2 className="mt-3 font-serif text-base font-semibold">
                  Research consultancy
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  Consultation, thesis and paper review, data analysis,
                  commissioned studies and faculty training.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/book">
                  Book a Consultation
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/research">View research</Link>
              </Button>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {profileLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground underline-offset-4 hover:text-navy hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="order-first lg:order-last">
            <div className="relative mx-auto aspect-square w-56 overflow-hidden rounded-xl border bg-muted shadow-sm sm:w-72 lg:w-full lg:max-w-sm">
              <Image
                src={profile.photo}
                alt={`Portrait of ${profile.name}`}
                fill
                priority
                sizes="(max-width: 640px) 14rem, (max-width: 1024px) 18rem, 24rem"
                className="object-cover"
              />
            </div>
          </div>
        </div>

        <dl className="mt-14 grid grid-cols-2 gap-6 border-t pt-10 sm:gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block font-serif text-3xl font-semibold text-navy sm:text-4xl">
                  {stat.value}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {stat.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
