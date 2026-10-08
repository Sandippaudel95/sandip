# sandipaudel.com.np — Phase 1 technical plan

## Where this actually starts

This is not a greenfield build. The site exists, runs on the stack the
brief recommends, and most of the objectives are already shipped. This
plan therefore covers **the gap**, not a rebuild, so no budget goes on
re-specifying what works.

Current stack, matching the brief's recommendation:

| Layer | Choice | State |
|---|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript | Built |
| Styling | Tailwind v4, shadcn/ui, light + dark on system default | Built |
| Database | Neon Postgres via Prisma 7 with a driver adapter | Built, 9 migrations |
| Auth | NextAuth v5, credentials, bcrypt, three guard layers | Built |
| Email | Resend, domain `mail.sandipaudel.com.np`, DKIM + SPF verified | Built |
| Hosting | Vercel, Cloudflare DNS | Built, **deployed build is stale** |

### Objective by objective

| # | Objective | State |
|---|---|---|
| 1 | UX/UI overhaul | **Done.** Light/dark on a 4px grid, every route WCAG AA verified by measurement |
| 2 | Advanced technical SEO | **Largely missing.** See below — this is the real work |
| 3 | Robust backend | **Done.** Exclusion constraint prevents double-booking at the database, advisory locks serialise the daily cap |
| 4 | Booking management | **Done, and beyond the brief.** Multi-day engagements, admin-managed availability, manual bookings, reschedule |
| 5 | Payments & ledger | **Done.** Ledger, advances and statements built; bank QR confirmed as the payment method |

### What objective 2 is missing

The brief calls SEO critical. It is the least complete part:

- **No `sitemap.xml`** — nothing generated
- **No `robots.txt`** — crawlers get no directive, and `/admin` is not disallowed
- **No JSON-LD anywhere** — no `Person`, no `ProfessionalService`, no `Service`
- **No per-page canonicals** on the home page
- **No Twitter card** tags; OpenGraph exists at root only
- **No OG images** — link previews have no image
- **No keyword-bearing service URLs.** Everything lives on one `/consulting`
  page, so "thesis review" and "data analysis" have no page to rank

And across the brief as a whole:

- **No test framework at all.** Phase 3 asks for unit tests on booking
  validation; there is no runner, no test script, no test file
- **No Lighthouse audit** has ever been run
- **14 commits unpushed**, and production still serves a build from
  28 September — including the old admin password hash

## Proposed work

### A. SEO architecture

**URL structure.** The five services already exist as structured data in
`src/content/services.ts` with slugs that match the target keywords, so
generating a page each is cheap and directly on-target:

```
/                              Person + ProfessionalService
/research                      publications, CollectionPage
/research/conferences          existing
/consulting                    service index, ItemList
/consulting/thesis-review      Service          <- new
/consulting/paper-review       Service          <- new
/consulting/data-analysis      Service          <- new
/consulting/research-consultancy  Service       <- new
/consulting/research-training  Service          <- new
/book                          existing
```

One generated route (`/consulting/[slug]`) driven by the existing
content array, not five hand-written pages.

**Heading hierarchy.** Exactly one `<h1>` per page, carrying the page's
primary keyword. `SectionHeader` (`src/components/layout/Section.tsx`)
already takes a `level` prop for this; the plan includes an audit that
every route uses it correctly, since a second `h1` is easy to introduce
and invisible until a crawler complains.

**Structured data**, as a typed helper in `src/lib/schema.ts` rather than
hand-written JSON in pages:

| Type | Where | Carries |
|---|---|---|
| `Person` | home | name, jobTitle, affiliation, `sameAs` to ORCID and Google Scholar, `knowsAbout` the research areas |
| `ProfessionalService` | home | `areaServed: Nepal`, address, `priceRange`, service types |
| `Service` | each service page | provider, `areaServed`, `offers` with the real price |
| `BreadcrumbList` | nested routes | real hierarchy |
| `FAQPage` | `/book` | the existing "What to expect" items, already written |

**Files**: `src/app/sitemap.ts`, `src/app/robots.ts` (disallowing
`/admin` and `/api`), `alternates.canonical` on every route, Twitter
card tags at root, and `opengraph-image.tsx` for generated previews.

**Apex vs www** must be settled: the apex currently 308s to `www` while
the metadata canonicals point at the apex. Those disagree, and search
engines will pick one for you if you don't.

### B. Tests

Vitest, as the only new dependency, chosen because the code that most
needs covering is already pure and database-free by design:

- `src/lib/slots.ts` — availability, notice window, the daily cap
- `src/lib/money.ts` — the five figures, `splitByHours` rounding
- `src/lib/ledger.ts` — running balance, ordering, approximate dates
- `src/lib/run.ts` — repeat date generation including weekday skipping
- `src/lib/time.ts` — the Nepal +05:45 conversions

These have been verified by hand repeatedly during the build; tests make
that permanent.

### C. Payment gateways — **dropped**

Confirmed 8 October: there is no eSewa or Khalti merchant account, and
payment stays on the bank QR with a transaction reference.

That flow is already built and in use — the QR on the booking page and
on the work request form, the reference captured at submission, and
verification by hand against the account before a booking is confirmed.
Objective 5 is therefore complete as it stands, and no gateway adapter
is needed.

### D. Deploy and audit

Push the 14 commits, deploy, then run Lighthouse against production and
fix what it finds. Running it against `localhost` would measure the dev
server, which is meaningless.

## Database schema

Already built and migrated — included for completeness, not as a
proposal. `Booking` (sessions, grouped by `groupId` into paid-together
orders, with a Postgres exclusion constraint over `tstzrange` preventing
overlap), `Client`, `Engagement` (negotiated work), `Payment` (the
money ledger), `AvailabilitySetting` and `BlackoutDate` (admin-managed
rules). See `prisma/schema.prisma`.

## Verification

1. `sitemap.xml` and `robots.txt` resolve; sitemap lists every public
   route and no admin route
2. Every JSON-LD block passes Google's Rich Results Test
3. One `h1` per page, asserted programmatically across all public routes
4. Canonicals agree with the redirect target
5. `npx vitest run` green
6. Lighthouse against **production**: SEO 100, Accessibility 100,
   Performance ≥ 90 on mobile
7. `npm run build`, `tsc`, `lint` clean

## Recommended order

1. **A** — SEO architecture. The brief's critical item, and the only one that compounds with time
2. **D (partial)** — push and deploy, so there is something to audit
3. **B** — tests
4. **D** — Lighthouse, then fix
5. ~~C — payment adapters~~ — dropped, bank QR confirmed

## Decisions I need from you

~~1. Apex or www~~ — settled: **www**, matching the existing redirect.
~~2. Merchant accounts~~ — settled: **none, bank QR stays**.

Remaining: whether to deploy before or after the tests in B. Production
is still serving the build from 28 September.
