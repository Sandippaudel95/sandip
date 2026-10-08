import { profile, profileLinks, researchInterests } from "@/content/profile";
import { HOURLY_RATE, services } from "@/content/services";
import type { ServicePackage } from "@/content/types";

/* ==========================================================================
   JSON-LD structured data.

   Built here as typed objects rather than written as JSON inside pages,
   so a field cannot be renamed in one place and forgotten in another,
   and so the site URL is stated once.

   What each type is for: Person carries the academic identity and the
   profiles that corroborate it, ProfessionalService describes the
   consultancy as a business with a place and a price, and Service
   describes one offering. Google treats them as separate claims, so a
   page that sells thesis review needs its own Service node rather than
   relying on the site-wide one.
   ========================================================================== */

/** Canonical host. The apex redirects here, so this is what is indexed. */
export const SITE_URL = "https://www.sandipaudel.com.np";

export const url = (path = "/") =>
  new URL(path, SITE_URL).toString().replace(/\/$/, path === "/" ? "/" : "");

const ORGANISATION = {
  "@type": "CollegeOrUniversity",
  name: "Lumbini Banijya Campus",
  parentOrganization: {
    "@type": "CollegeOrUniversity",
    name: "Tribhuvan University",
  },
} as const;

const ADDRESS = {
  "@type": "PostalAddress",
  streetAddress: "Department of Finance, Lumbini Banijya Campus",
  addressLocality: "Butwal",
  addressRegion: "Rupandehi",
  addressCountry: "NP",
} as const;

/** The academic identity, and the profiles that corroborate it. */
export function personSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}/#person`,
    name: profile.name,
    jobTitle: profile.role,
    description: profile.tagline,
    url: SITE_URL,
    image: url(profile.photo),
    email: `mailto:${profile.emails[0]}`,
    telephone: profile.phone,
    worksFor: ORGANISATION,
    affiliation: ORGANISATION,
    address: ADDRESS,
    // sameAs is what lets Google tie this page to the ORCID and Scholar
    // records, which is the strongest signal available for an academic.
    sameAs: profileLinks.map((l) => l.href),
    knowsAbout: researchInterests.map((r) => r.title),
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: "Deen Dayal Upadhyaya Gorakhpur University",
    },
  };
}

/** The consultancy as a business: a place, an area served, a price. */
export function professionalServiceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${SITE_URL}/#service`,
    name: `${profile.name} — Research Consultancy and Training`,
    description:
      "Academic research consultancy in Nepal: thesis and paper review, data analysis, commissioned research and faculty training, for students and institutions.",
    url: url("/consulting"),
    image: url(profile.photo),
    email: `mailto:${profile.emails[0]}`,
    telephone: profile.phone,
    address: ADDRESS,
    areaServed: { "@type": "Country", name: "Nepal" },
    provider: { "@id": `${SITE_URL}/#person` },
    priceRange: `NPR ${HOURLY_RATE}+`,
    currenciesAccepted: "NPR",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Research services",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.name, url: serviceUrl(s) },
      })),
    },
  };
}

export const serviceUrl = (s: ServicePackage) => url(`/consulting/${s.id}`);

/** One offering, on its own page. */
export function serviceSchema(s: ServicePackage) {
  // Only the hourly rate is a real number; everything else is quoted per
  // job, and inventing a figure for those would be a false price claim.
  const priced = s.price.includes("per hour");

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${serviceUrl(s)}#service`,
    name: s.name,
    description: s.summary,
    url: serviceUrl(s),
    serviceType: s.name,
    category: "Academic research consultancy",
    provider: { "@id": `${SITE_URL}/#person` },
    areaServed: { "@type": "Country", name: "Nepal" },
    audience: { "@type": "Audience", audienceType: s.audience },
    offers: {
      "@type": "Offer",
      priceCurrency: "NPR",
      ...(priced
        ? { price: HOURLY_RATE, unitText: "HOUR" }
        : { description: "Quoted per job after scoping" }),
      availability: "https://schema.org/InStock",
      url: url("/book"),
    },
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: url(t.path),
    })),
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}

/**
 * Render one or more schema objects into a script tag.
 *
 * Takes the object, not a string, so the JSON cannot drift out of shape,
 * and escapes `<` because a closing tag inside a JSON string would end
 * the script element early.
 */
export function JsonLd({ schema }: { schema: object | object[] }) {
  const payload = Array.isArray(schema) ? schema : [schema];
  return (
    <>
      {payload.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(s).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
