# Paid consultation booking: setup guide

The website stays on GitHub Pages. Bookings, fees and payment proofs are stored in a free **Supabase** project, and emails are sent through **Resend**. Setup takes about 30 minutes and only has to be done once.

Until you finish step 1, `booking.html`, `booking-status.html` and `admin.html` run in **preview mode**: they show example times, bookings and a sample QR code so you can try the whole flow, but nothing is saved or emailed.

> **Already set up the earlier (free) version?** Re-run the new `supabase/schema.sql` (step 2), redeploy the function with the new code (step 4), then upload your QR code on the admin page (step 8). Your fees and cancellation policy are filled in automatically. Your existing slots, bookings and login are kept.

## What was added

| File | Purpose |
| --- | --- |
| `booking.html` | Public booking page: service, level, hours, time, details, then QR payment and proof upload |
| `booking-status.html` | Private status page each client reaches from their email link |
| `admin.html` | Your page to verify payments, confirm or reject bookings, open hours, set fees, and upload the QR code |
| `assets/js/booking-common.js` | Shared code: data access, formatting, and the payment panel |
| `assets/js/booking.js`, `booking-status.js`, `admin.js` | Page logic |
| `assets/js/booking-config.js` | The two Supabase values you fill in (step 1) |
| `assets/css/booking.css` | Styles, using the site's existing colours and fonts |
| `supabase/schema.sql` | Database tables, security rules, file storage, your fees and refund policy (step 2) |
| `supabase/functions/booking-api/index.ts` | Server code: reserves times, receives payment proofs, sends emails (step 4) |

## How it works

1. You open one-hour slots on the admin page. Fees depend only on session length: **Rs. 5,000 for 1 hour, Rs. 7,000 for 2 hours, Rs. 10,000 for 3 hours**, the same for every service and level (Bachelor, Master, MPhil, PhD).
2. A visitor chooses a service, their level and a 1, 2 or 3 hour session, then a start time. Only start times with enough back-to-back open hours are offered.
3. After entering their details, the time is **reserved for 30 minutes** and they see the amount, your QR code, bank details, and a booking reference to write in the payment remarks.
4. They upload a screenshot or PDF of the payment. They immediately see "Payment submitted, awaiting confirmation" and get an email with a private status link. You get an email with the payment proof attached.
5. You check your bank or Fonepay app, then click **Confirm booking** or **Reject payment** on the admin page. The client is emailed and their status page updates.
6. Reservations with no proof after 30 minutes are released automatically. If someone uploads proof after their reservation expired, it is still saved for you to review. If the time has been taken meanwhile, the admin page warns you so you can offer another time or refund.

Payment proofs are stored privately: only you can open them, from the admin page.

> **Security note.** The Resend API key lives only in Supabase as a secret. It is never in the website's code, so visitors cannot see it. Because your old key was shared in a chat, create a **new** Resend key for this (step 5) and delete the old one in the Resend dashboard.

---

## Step 1. Create the Supabase project and connect the site

1. Go to https://supabase.com, sign up, and click **New project**.
2. Pick any name (for example `sandip-bookings`), set a strong database password and save it somewhere safe, and choose the region **South Asia (Mumbai)**, which is closest to Nepal.
3. When the project is ready, open **Project Settings** and find:
   - the **Project URL** (looks like `https://abcdxyz.supabase.co`)
   - the **anon public** key, or the **publishable** key (starts with `sb_publishable_`)
4. Open `assets/js/booking-config.js` and paste them in:

```js
supabaseUrl: 'https://abcdxyz.supabase.co',
supabaseKey: 'your-anon-or-publishable-key',
```

Both values are designed to be public. Never paste the **service_role** or **secret** key into the website.

## Step 2. Create the database

1. Open `supabase/schema.sql` and, at the very bottom, change `sandip.paudel@lbc.edu.np` to the email you want to sign in with on the admin page, if it is different.
2. In Supabase, go to **SQL Editor**, then **New query**, paste the whole file, and click **Run**. You should see "Success. No rows returned."

## Step 3. Create your admin login

1. Go to **Authentication**, then **Users**, then **Add user**, then **Create new user**.
2. Enter the same email as in step 2, choose a password, and tick **Auto Confirm User**.
3. Go to **Authentication** and open the sign-in/providers settings. Turn **off** "Allow new users to sign up". Only you need an account. Others could not see anything even if they signed up, but this keeps things tidy.
4. Go to **Authentication**, then **URL Configuration**:
   - set **Site URL** to `https://sandipaudel.com.np`
   - add `https://sandipaudel.com.np/admin.html` under **Redirect URLs**, so "Forgot your password?" works.

## Step 4. Deploy the booking function

**Using the dashboard (no installs):**

1. Go to **Edge Functions** and click **Deploy a new function**, then choose **Via Editor**.
2. Name it exactly `booking-api`.
3. Delete the sample code, paste the entire contents of `supabase/functions/booking-api/index.ts`, and click **Deploy**.
4. Open the function's settings and turn **off** "Verify JWT" (it may be labelled "Enforce JWT verification"). The function checks admin sign-in itself, and visitors need to reach it without logging in.

**Or using the Supabase CLI:**

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-ID
supabase functions deploy booking-api --no-verify-jwt
```

## Step 5. Add the secrets (including the Resend key)

1. In Resend (https://resend.com), go to **API Keys**, then **Create API key**. Give it **Sending access** only. Copy it, then **delete the old key** you shared earlier.
2. In Supabase, go to **Edge Functions**, then **Secrets**, and add:

| Name | Value |
| --- | --- |
| `RESEND_API_KEY` | the new key from Resend |
| `ADMIN_EMAIL` | where "verify payment" notices (with the proof attached) should go, e.g. `sandip.paudel@lbc.edu.np` |
| `FROM_EMAIL` | `Sandip Paudel <bookings@sandipaudel.com.np>` (after step 6) |
| `SITE_URL` | `https://sandipaudel.com.np` |
| `ALLOWED_ORIGINS` | `https://sandipaudel.com.np` (optional; blocks other websites from using your function) |
| `OFFICE_LOCATION` | optional; the address shown for in-person sessions |

## Step 6. Verify your domain in Resend

Resend only sends to *other people's* addresses from a domain you have verified. Without this, visitors will not receive their emails. Bookings are still saved, and the admin page will warn you.

1. In Resend, go to **Domains**, then **Add domain**, and enter `sandipaudel.com.np`.
2. Resend shows several DNS records (TXT and MX). Add them wherever your domain's DNS is managed, which is the same place the GitHub Pages records for `sandipaudel.com.np` were added.
3. Click **Verify**. It can take anywhere from a few minutes to a few hours.
4. Make sure the `FROM_EMAIL` secret uses that domain, e.g. `bookings@sandipaudel.com.np`. That address does not need a real inbox; replies go to `ADMIN_EMAIL`.

## Step 7. Publish to GitHub

Copy all the files into your `sandip` repository, then commit and push:

```bash
git add .
git commit -m "Add research consultation booking system"
git push
```

GitHub Pages will update within a minute or two.

## Step 8. Check fees, add payment details and open hours

Open `https://sandipaudel.com.np/admin.html` and sign in.

1. **Services and fees.** Your fees (Rs. 5,000 / 7,000 / 10,000 for 1 / 2 / 3 hours) are already filled in by `schema.sql`. Check them, and edit the service names and descriptions if you like.
2. **Payment details.** Upload your bank or Fonepay QR code (PNG or JPG, up to 2 MB) and enter the account name and, if you like, bank and account number and payment instructions. Your cancellation and refund policy is already filled in; edit the wording if needed. Visitors must agree to it before submitting payment proof, and it is included in their emails and on their status page. After uploading the QR, scan it from the booking page with your phone to check it works.
3. **Time slots.** Open hours. For 2- or 3-hour sessions, open consecutive hours, for example `10:00, 11:00, 12:00`.

## Step 9. Test it

1. In a private browser window, open `https://sandipaudel.com.np/booking.html` and book a 1-hour session with an email you can check. Hours starting within the next 12 hours are hidden, so choose a later day.
2. On the payment step, upload any screenshot as a test proof.
3. Check that you received the "Verify payment" email with the attachment, and the client received "Payment received" with a status link.
4. On the admin page, open the **To verify** tab, click **View payment proof**, then **Confirm booking**. Check the confirmation email and that the status page now says "Booking confirmed".

---

## Everyday use

- **To verify:** bookings with payment proof. Open the proof, check the amount and reference in your bank app, then confirm (add a Google Meet or Zoom link for online sessions) or reject with a reason.
- **Awaiting payment:** visitors who reserved a time but have not uploaded proof yet. You can mark one as paid (for example, if they paid in cash) or cancel it.
- **Confirmed:** upcoming sessions. After a session, click **Mark completed**. Cancellation requests arrive by email, as your policy says. Cancel the booking on this tab and send the refund (full, or 50% within 24 hours) from your bank app; the system does not move money.
- **Time slots:** open, hide or delete one-hour slots.
- **Services and fees:** change fees or services at any time. Existing bookings keep the price they were booked at.
- **Payment details:** replace the QR code or update the refund policy.

## Changing things

| To change | Edit |
| --- | --- |
| Fees, services, QR code, refund policy | The admin page (no code changes needed) |
| Minimum notice (currently 12 hours) | `interval '12 hours'` in two places in `schema.sql` (re-run it) |
| Reservation time while paying (currently 30 minutes) | `HOLD_MINUTES` in `index.ts` (redeploy) |
| Maximum open bookings per person (currently 3) | `MAX_ACTIVE_PER_EMAIL` in `index.ts` (redeploy) |
| Email wording | The `layout(...)` calls in `index.ts` (redeploy) |

## Troubleshooting

- **Booking page says "Open times could not be loaded":** check the URL and key in `booking-config.js`, and that step 2 ran without errors.
- **"This account is not on the admin list":** the email in the `admins` table (step 2) must match your login email exactly.
- **"Booking will open soon" instead of services:** no session fee is set, or no service has "Show on booking page" ticked (step 8).
- **QR upload fails:** make sure step 2 ran completely, including section 11 (file storage). Re-running `schema.sql` is safe.
- **Booking fails with a server error:** go to **Edge Functions**, then `booking-api`, then **Logs**. The most common causes are "Verify JWT" still being on or a missing secret.
- **"The email could not be sent":** booking and payment proof are still saved. check that your domain is verified in Resend and that `FROM_EMAIL` uses it. The function logs show Resend's exact error.
- **Free-tier pause:** Supabase pauses free projects after about a week with no activity. Regular bookings and admin visits keep it active; if it pauses, click **Restore** in the dashboard.
