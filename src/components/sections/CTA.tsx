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
        <div className="rounded-2xl bg-navy px-6 py-12 text-white sm:px-10 sm:py-14 lg:px-14">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {title}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/80 text-pretty">
              {body}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="bg-white text-navy hover:bg-white/90"
              >
                <Link href="/book">
                  Book a Consultation
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
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
