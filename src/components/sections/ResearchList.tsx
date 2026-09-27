import Link from "next/link";
import { ExternalLink, ArrowRight, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConferenceCard } from "./ConferenceCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Publication, PublicationStatus } from "@/content/types";
import {
  publications,
  workingPapers,
  consultancyReports,
} from "@/content/publications";
import { conferences, featuredConferences } from "@/content/conferences";
import { training } from "@/content/training";
import { researchInterests } from "@/content/profile";

/* Status badges reuse the restrained status palette from the old site
   rather than introducing new hues. */
const quartileStyles: Record<
  NonNullable<Publication["quartile"]>,
  string
> = {
  Q1: "bg-lime/15 text-lime border-lime/30",
  Q2: "bg-violet/15 text-violet-light border-violet/30",
  Q3: "bg-amber-400/15 text-amber-300 border-amber-400/30",
  Q4: "bg-white/10 text-muted-foreground border-white/15",
};

const statusStyles: Record<PublicationStatus, string> = {
  published: "bg-lime/15 text-lime border-lime/25",
  "under-review": "bg-violet/15 text-violet-light border-violet/25",
  revising: "bg-amber-400/15 text-amber-300 border-amber-400/25",
  "in-progress": "bg-white/10 text-muted-foreground border-white/15",
};

function Citation({ item }: { item: Publication }) {
  return (
    <li
      className={cn(
        "border-b py-5 last:border-b-0",
        item.quartile === "Q1" &&
          "-mx-4 rounded-2xl border-b-0 bg-lime/[0.07] px-4 ring-1 ring-lime/20",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {item.year && (
          <span className="font-display text-sm font-semibold text-violet-light tabular-nums">
            {item.year}
          </span>
        )}
        {item.quartile && (
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-semibold",
              quartileStyles[item.quartile],
            )}
            title={`${item.quartile} journal`}
          >
            {item.quartile} journal
          </Badge>
        )}
        {item.statusLabel && (
          <Badge
            variant="outline"
            className={cn("text-xs", statusStyles[item.status])}
          >
            {item.statusLabel}
          </Badge>
        )}
      </div>

      <p className="prose-academic mt-2">
        {item.citation}
        {item.outlet && <em> {item.outlet}</em>}
      </p>

      {item.note && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {item.note}
        </p>
      )}

      {item.doi && (
        <a
          href={item.doi}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-violet-light underline-offset-4 hover:underline"
        >
          {item.doi.replace(/^https?:\/\//, "")}
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      )}
    </li>
  );
}

function Subhead({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-16 border-b pb-3 text-2xl font-semibold tracking-tight first:mt-0">
      {children}
    </h2>
  );
}

export function ResearchList() {
  return (
    <div>
      {/* Focus areas */}
      <Subhead>Research focus areas</Subhead>
      <ul className="mt-6 grid gap-5 sm:grid-cols-2">
        {researchInterests.map((interest) => (
          <li key={interest.title} className="rounded-2xl border bg-white/[0.035] p-5">
            <h3 className="font-display text-base font-semibold text-violet-light">
              {interest.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {interest.description}
            </p>
          </li>
        ))}
      </ul>

      {/* Peer-reviewed */}
      <Subhead>Peer-reviewed journal articles</Subhead>
      <ol className="mt-2">
        {publications.map((item) => (
          <Citation key={item.citation} item={item} />
        ))}
      </ol>

      {/* Working papers */}
      <Subhead>Working papers and manuscripts under review</Subhead>
      <ol className="mt-2">
        {workingPapers.map((item) => (
          <Citation key={item.citation} item={item} />
        ))}
      </ol>

      {/* Consultancy */}
      <Subhead>Research consultancy</Subhead>
      <ol className="mt-2">
        {consultancyReports.map((item) => (
          <Citation key={item.citation} item={item} />
        ))}
      </ol>

      {/* Conferences: highlights only, full list on its own page. */}
      <Subhead>Conference presentations</Subhead>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {featuredConferences.map((item) => (
          <ConferenceCard key={`${item.date}-${item.paper}`} item={item} />
        ))}
      </div>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/research/conferences">
          See all {conferences.length} conferences
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>

      {/* Training */}
      <Subhead>Training, credentials and workshops</Subhead>
      <ul className="mt-6 divide-y rounded-2xl border bg-white/[0.035]">
        {training.map((item) => (
          <li
            key={`${item.date}-${item.title}`}
            className={cn(
              "grid gap-1 p-5 sm:grid-cols-[8rem_1fr] sm:gap-5",
              item.credential && "bg-violet/[0.08]",
            )}
          >
            <p className="text-sm font-medium text-muted-foreground">
              {item.date}
            </p>
            <div>
              {item.badge && (
                <Badge className="mb-2 bg-violet text-white hover:bg-violet/85">
                  <BadgeCheck className="size-3.5" aria-hidden="true" />
                  {item.badge}
                </Badge>
              )}
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {item.organizer}
              </p>
              {item.detail && (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {item.detail}
                </p>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "mt-2.5 text-xs",
                  item.role === "Trainee"
                    ? "bg-white/8 text-muted-foreground border-white/15"
                    : "bg-violet/15 text-violet-light border-violet/30",
                )}
              >
                {item.role}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
