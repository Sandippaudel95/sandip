import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import { QrCode, Info } from "lucide-react";
import { HOURLY_RATE_NPR } from "@/content/services";

/* ==========================================================================
   Payment details shown beside the booking calendar.

   TO ADD THE QR: save the image as one of

       public/images/payment-qr.png   (or .jpg / .webp)

   and rebuild. This is a server component in a static export, so the check
   below runs at build time and the result is baked into the HTML. No config
   flag to remember, and no broken image if the file is not there yet.
   ========================================================================== */

const CANDIDATES = [
  "images/payment-qr.png",
  "images/payment-qr.jpg",
  "images/payment-qr.jpeg",
  "images/payment-qr.webp",
];

function findQr(): string | null {
  for (const rel of CANDIDATES) {
    if (fs.existsSync(path.join(process.cwd(), "public", rel))) {
      return `/${rel}`;
    }
  }
  return null;
}

export function PaymentPanel() {
  const qr = findQr();

  return (
    <section
      aria-labelledby="payment-heading"
      className="mt-10 rounded-xl border bg-muted/40 p-6 sm:p-8"
    >
      <h2
        id="payment-heading"
        className="flex items-center gap-2.5 text-xl font-semibold tracking-tight"
      >
        <QrCode className="size-5 text-navy" aria-hidden="true" />
        Paying for your session
      </h2>

      <div className="mt-6 grid gap-8 sm:grid-cols-[auto_1fr] sm:gap-10">
        {qr && (
          <div className="mx-auto sm:mx-0">
            <div className="rounded-lg border bg-white p-3">
              <Image
                src={qr}
                alt="QR code for payment"
                width={200}
                height={200}
                className="size-[200px] object-contain"
              />
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Scan with your banking or Fonepay app
            </p>
          </div>
        )}

        <div className="min-w-0">
          <p className="font-serif text-2xl font-semibold text-navy">
            {HOURLY_RATE_NPR} per hour
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            For general consultation. Thesis review, paper review, data
            analysis, commissioned research and training are quoted
            separately.
          </p>

          <div className="mt-5 flex gap-3 rounded-lg border border-navy/20 bg-accent/50 p-4">
            <Info
              className="mt-0.5 size-4 shrink-0 text-navy"
              aria-hidden="true"
            />
            <div className="text-sm leading-relaxed">
              <p className="font-medium">
                Put your name and session date in the payment remarks.
              </p>
              <p className="mt-1 text-muted-foreground">
                Payments arrive without any booking attached to them, so the
                remarks are the only way to match yours to your session.
              </p>
            </div>
          </div>

          <ol className="mt-5 space-y-2 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">1.</span> Book your
              slot in the calendar above.
            </li>
            <li>
              <span className="font-medium text-foreground">2.</span> Pay{" "}
              {qr ? "using the QR code" : "using the details sent with your booking confirmation"}
              , with your name and session date in the remarks.
            </li>
            <li>
              <span className="font-medium text-foreground">3.</span> Keep the
              receipt. Send it on if I ask to confirm.
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
