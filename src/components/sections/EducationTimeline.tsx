import { Section, SectionHeader } from "@/components/layout/Section";
import { education } from "@/content/education";

export function EducationTimeline() {
  return (
    <Section id="education" alt>
      <SectionHeader kicker="02 / Education" title="Education" />

      <ol className="mt-10 max-w-3xl">
        {education.map((entry) => (
          <li
            key={entry.degree}
            className="relative grid gap-1 border-l-2 border-border pb-8 pl-6 last:pb-0 sm:grid-cols-[10rem_1fr] sm:gap-6 sm:pl-8"
          >
            {/* Node on the rail */}
            <span
              className="absolute -left-[7px] top-2 size-3 rounded-full border-2 border-background bg-brand"
              aria-hidden="true"
            />

            <p className="text-sm font-medium text-muted-foreground sm:pt-1">
              {entry.period}
            </p>

            <div>
              <h3 className="text-lg font-semibold">{entry.degree}</h3>
              <p className="mt-1 text-base text-muted-foreground">
                {entry.institution}
              </p>
              {entry.detail && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {entry.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
