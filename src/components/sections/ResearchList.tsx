import { Award, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Conference, Publication, PublicationStatus } from "@/content/types";
import {
  publications,
  workingPapers,
  consultancyReports,
} from "@/content/publications";
import { conferences } from "@/content/conferences";
import { training } from "@/content/training";
import { researchInterests } from "@/content/profile";

/* Status badges reuse the restrained status palette from the old site
   rather than introducing new hues. */
const statusStyles: Record<PublicationStatus, string> = {
  published: "bg-[#d1fae5] text-[#065f46] border-transparent",
  "under-review": "bg-[#dbeafe] text-[#1e40af] border-transparent",
  revising: "bg-[#fef3c7] text-[#b45309] border-transparent",
  "in-progress": "bg-secondary text-secondary-foreground border-transparent",
};

function Citation({ item }: { item: Publication }) {
  return (
    <li className="border-b py-5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        {item.year && (
          <span className="font-serif text-sm font-semibold text-navy tabular-nums">
            {item.year}
          </span>
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
          className="mt-2 inline-flex items-center gap-1.5 text-sm text-navy underline-offset-4 hover:underline"
        >
          {item.doi.replace(/^https?:\/\//, "")}
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      )}
    </li>
  );
}

function ConferenceCard({ item }: { item: Conference }) {
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-lg border bg-card p-5",
        item.award && "border-navy/25 bg-accent/40",
      )}
    >
      {item.award && (
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-navy uppercase">
          <Award className="size-3.5" aria-hidden="true" />
          {item.award}
        </p>
      )}
      <p className="text-sm text-muted-foreground">{item.date}</p>
      <h3 className="mt-1.5 text-base leading-snug font-semibold">
        {item.paper}
      </h3>
      <p className="mt-auto pt-3 text-sm text-muted-foreground">{item.venue}</p>
    </article>
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
          <li key={interest.title} className="rounded-lg border bg-card p-5">
            <h3 className="font-serif text-base font-semibold text-navy">
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

      {/* Conferences */}
      <Subhead>Selected conference presentations</Subhead>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {conferences.map((item) => (
          <ConferenceCard key={`${item.date}-${item.paper}`} item={item} />
        ))}
      </div>

      {/* Training */}
      <Subhead>Selected training and workshops</Subhead>
      <ul className="mt-6 divide-y rounded-lg border bg-card">
        {training.map((item) => (
          <li
            key={`${item.date}-${item.title}`}
            className="grid gap-1 p-5 sm:grid-cols-[8rem_1fr] sm:gap-5"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {item.date}
            </p>
            <div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {item.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
