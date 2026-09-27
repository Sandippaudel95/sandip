import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Section";
import { profile, profileLinks, stats } from "@/content/profile";

/* The hero carries the whole point of the site: two practices, stated side
   by side, with one primary action. Dark ground with a violet glow behind
   the headline, following the reference design. */
export function Hero() {
  return (
    <section className="glow relative overflow-hidden border-b border-white/10">
      {/* Faint grid, far back, to stop the dark ground reading as flat. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(70%_50%_at_50%_0%,black,transparent)]"
      />

      <Container className="relative z-10 py-20 sm:py-24 lg:py-32">
        <div className="grid items-center gap-14 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
          <div>
            <p className="pill-label">{profile.role}</p>

            <h1 className="mt-7 text-5xl leading-[1.05] font-normal tracking-tight sm:text-6xl lg:text-7xl">
              {profile.name}
            </h1>

            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              {profile.affiliations.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>

            <p className="mt-7 max-w-xl text-lg leading-relaxed text-foreground/80 text-pretty">
              {profile.tagline}
            </p>

            {/* The two strands, given equal weight. */}
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="panel p-6">
                <BookOpen className="size-5 text-violet-light" aria-hidden="true" />
                <h2 className="mt-4 font-display text-lg">Academic research</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Management, economics and finance: market efficiency,
                  long-memory volatility and behavioral finance.
                </p>
              </div>

              <div className="panel p-6">
                <LineChart className="size-5 text-lime" aria-hidden="true" />
                <h2 className="mt-4 font-display text-lg">
                  Research consultancy
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Consultation, thesis and paper review, data analysis,
                  commissioned studies and faculty training.
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-white text-ink hover:bg-white/90"
              >
                <Link href="/book">
                  Book a Consultation
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/research">View research</Link>
              </Button>
            </div>

            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {profileLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground underline-offset-4 transition-colors hover:text-violet-light hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="order-first lg:order-last">
            <div className="relative mx-auto w-60 sm:w-72 lg:w-full lg:max-w-sm">
              {/* Glow behind the portrait. */}
              <div
                aria-hidden="true"
                className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-violet/30 via-violet/5 to-transparent blur-2xl"
              />
              <div className="relative aspect-square overflow-hidden rounded-[1.75rem] border border-white/15 bg-ink-raised">
                <Image
                  src={profile.photo}
                  alt={`Portrait of ${profile.name}`}
                  fill
                  priority
                  sizes="(max-width: 640px) 15rem, (max-width: 1024px) 18rem, 24rem"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stat row, big and light, as on the reference. */}
        <dl className="mt-20 grid grid-cols-2 gap-8 border-t border-white/10 pt-12 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="block bg-gradient-to-br from-white to-violet-light bg-clip-text font-display text-4xl font-light text-transparent sm:text-5xl">
                  {stat.value}
                </span>
                <span className="mt-2 block text-sm text-muted-foreground">
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
