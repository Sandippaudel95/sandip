import Link from "next/link";
import {
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Orbit,
  Code,
  ExternalLink,
} from "lucide-react";
import { profile, profileLinks } from "@/content/profile";

// lucide v1 dropped brand marks, so these are generic stand-ins.
const iconFor: Record<string, typeof ExternalLink> = {
  "Google Scholar": GraduationCap,
  ORCID: Orbit,
  GitHub: Code,
};

export function Footer() {
  return (
    <footer className="mt-24 border-t bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span
                className="grid size-9 place-items-center rounded-md bg-navy font-serif text-sm font-semibold text-white"
                aria-hidden="true"
              >
                SP
              </span>
              <div>
                <p className="font-serif font-semibold">{profile.name}</p>
                <p className="text-sm text-muted-foreground">{profile.role}</p>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Research in financial econometrics and market efficiency, and
              research consultancy, review and training across Nepal.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold tracking-wide text-navy uppercase">
              Contact
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex gap-3">
                <Mail
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="flex flex-col gap-1">
                  {profile.emails.map((email) => (
                    <a
                      key={email}
                      href={`mailto:${email}`}
                      className="break-all text-muted-foreground underline-offset-4 hover:text-navy hover:underline"
                    >
                      {email}
                    </a>
                  ))}
                </span>
              </li>
              <li className="flex gap-3">
                <Phone
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <a
                  href={profile.phoneHref}
                  className="text-muted-foreground underline-offset-4 hover:text-navy hover:underline"
                >
                  {profile.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <MapPin
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">{profile.office}</span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold tracking-wide text-navy uppercase">
              Elsewhere
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              {profileLinks.map((link) => {
                const Icon = iconFor[link.label] ?? ExternalLink;
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 text-muted-foreground underline-offset-4 hover:text-navy hover:underline"
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {link.label}
                    </a>
                  </li>
                );
              })}
              <li>
                <Link
                  href="/book"
                  className="inline-flex items-center gap-3 font-medium text-navy underline-offset-4 hover:underline"
                >
                  Book a consultation
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t pt-6 text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} {profile.name}. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
