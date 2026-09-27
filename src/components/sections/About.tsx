import { Section, SectionHeader } from "@/components/layout/Section";
import { bio, researchInterests } from "@/content/profile";

export function About() {
  return (
    <Section id="about">
      <SectionHeader kicker="01 / About" title="About" />

      <div className="mt-10 grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div className="space-y-5">
          {bio.map((paragraph) => (
            <p
              key={paragraph.slice(0, 40)}
              className="text-[1.0625rem] leading-[1.75] text-pretty"
            >
              {paragraph}
            </p>
          ))}
        </div>

        <div>
          <h3 className="text-lg font-semibold">Research interests</h3>
          <ul className="mt-5 space-y-5">
            {researchInterests.map((interest) => (
              <li
                key={interest.title}
                className="border-l-2 border-violet/25 pl-4"
              >
                <p className="font-medium text-violet-light">{interest.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {interest.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
