# Sandip Paudel: personal website

Next.js site for [sandipaudel.com.np](https://sandipaudel.com.np), covering academic research and consulting work.

Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · statically exported to GitHub Pages.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
```

```bash
npm run build   # static export into out/
npx serve out   # preview the built site the way Pages serves it
```

## Turning on booking

Open `src/lib/booking.ts`, set `provider` and paste your scheduling link:

```ts
provider: "cal",                          // or "calendly"
link: "sandip-paudel/consultation",       // Cal.com: user/event-type
// link: "https://calendly.com/you/30min" // Calendly: the full URL
```

Until a link is set, `/book` stays online and shows an email fallback instead of an empty widget. For Cal.com use the full `user/event-type` form; a bare username renders your whole event-type list and is very tall.

You can supply the link at build time instead, via the `NEXT_PUBLIC_BOOKING_PROVIDER` and `NEXT_PUBLIC_BOOKING_LINK` repository variables, which the deploy workflow passes through.

## Editing content

No markup changes needed. Everything lives in `src/content/`:

| File | Holds |
| --- | --- |
| `profile.ts` | Name, titles, bio, research interests, stats, contact details |
| `publications.ts` | Journal articles, working papers, commissioned reports |
| `conferences.ts` | Conference presentations |
| `training.ts` | Training and workshops |
| `education.ts` | Degrees |
| `services.ts` | Services and fees. `HOURLY_RATE_NPR` sets the hourly rate shown on `/`, `/consulting` and `/book` |

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes `out/`.

One-time setup: in **Settings → Pages**, set Source to **GitHub Actions**. The site will not update until that is changed.

Two files in `public/` must stay there:

- `CNAME` — the custom domain unbinds on the first deploy without it
- `.nojekyll` — without it Jekyll strips the `_next/` directory and the site loses all CSS and JS

## Adding the payment QR

Save the image as `public/images/payment-qr.png` (`.jpg` and `.webp` also work) and rebuild. `PaymentPanel` checks for the file at build time, so there is no config flag to set, and if the file is absent the panel simply omits the QR rather than showing a broken image.

## Replacing the portrait

`public/images/sandip-photo.webp` is 800×800 and ~74 KB. Static export runs no image optimizer, so a replacement must be compressed before it is committed:

```bash
npm i -D sharp
node -e "require('sharp')('input.png').resize(800,800,{fit:'cover',position:'top'}).webp({quality:82}).toFile('public/images/sandip-photo.webp')"
npm un sharp
```

## legacy/

The previous hand-written site, including the Supabase QR-payment booking system that was never switched on. Kept for reference and excluded from the build and from TypeScript. Nothing in it is served.
