import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Section";
import { profile } from "@/content/profile";

export function CTA({
  title = "Work with me",
  body = "Whether it is a thesis that has stalled, a dataset you are not sure how to analyse, or a paper coming back from reviewers, the first conversation is the same: what question are we answering?",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        {/* A tinted surface, not a solid brand block, so the text uses the
            ordinary foreground tokens and stays legible in both themes. */}
        <div className="glow relative overflow-hidden rounded-[2rem] border border-brand/30 bg-gradient-to-br from-brand-soft via-card to-background px-6 py-14 sm:px-12 sm:py-16 lg:px-16">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-4xl leading-[1.1] font-normal tracking-tight sm:text-5xl">
              {title}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
              {body}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-brand text-primary-foreground hover:bg-brand/90"
              >
                <Link href="/book">
                  Book a Consultation
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={`mailto:${profile.emails[0]}`}>
                  <Mail aria-hidden="true" />
                  Email me
                </a>
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
