import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { clientDetail } from "@/lib/crm";
import { buildLedger } from "@/lib/ledger";
import {
  advanceLeftNpr,
  billedNpr,
  deliveredNpr,
  engagementEarnedNpr,
  outstanding,
  receivedNpr,
} from "@/lib/money";
import { npr } from "@/content/services";
import { profile } from "@/content/profile";
import { formatDateKey, nepalDateKey } from "@/lib/time";
import { Container } from "@/components/layout/Section";
import { Button } from "@/components/ui/button";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata: Metadata = {
  title: "Statement",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** A plain DATE column holds the date itself, so slicing the ISO string
    is right here and converting the zone would shift it. */
const dateKey = (d: Date) => d.toISOString().slice(0, 10);

/* Short form in the table. The long weekday version is what pushed the
   table wider than a phone, and a statement line does not need it. */
const rowDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kathmandu",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function LedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const { id } = await params;
  const client = await clientDetail(id);
  if (!client) notFound();

  const ledger = buildLedger(
    client.bookings,
    client.payments,
    client.engagements,
  );

  // Read from the same helpers the client page uses, so the summary here
  // cannot drift from the figures shown there.
  const agreed =
    billedNpr(client.bookings) +
    client.engagements.reduce((sum, e) => sum + e.feeNpr, 0);
  const received =
    receivedNpr(client.payments) +
    client.engagements.reduce((sum, e) => sum + engagementEarnedNpr(e), 0);
  const billed =
    deliveredNpr(client.bookings) +
    client.engagements.reduce(
      (sum, e) => (e.status === "DELIVERED" ? sum + e.feeNpr : sum),
      0,
    );
  const due = outstanding(client.engagements, client.bookings, client.payments);
  const advanceLeft = advanceLeftNpr(client.payments, client.bookings);

  const owes = ledger.closingNpr > 0;
  const inCredit = ledger.closingNpr < 0;

  return (
    <Container className="py-10">
      <div className="print-hide flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href={`/admin/clients/${client.id}`}>
            <ArrowLeft aria-hidden="true" />
            {client.name}
          </Link>
        </Button>
        <PrintButton />
      </div>

      <article className="mt-6 print:mt-0">
        {/* Letterhead. On screen this is just a heading; on paper it is
            what tells the client who the statement is from. */}
        <header className="flex flex-wrap items-start justify-between gap-6 border-b pb-6">
          <div>
            <p className="font-display text-xl font-semibold tracking-tight">
              {profile.name}
            </p>
            <p className="text-sm text-muted-foreground">{profile.role}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {profile.office}
              <br />
              {profile.emails[0]} · {profile.phone}
            </p>
          </div>
          <div className="text-right">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Statement of account
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              As at {formatDateKey(nepalDateKey())}
            </p>
          </div>
        </header>

        <section className="mt-6 flex flex-wrap justify-between gap-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Client
            </p>
            <p className="mt-1 font-medium">{client.name}</p>
            <p className="text-sm text-muted-foreground">{client.email}</p>
            {client.organisation && (
              <p className="text-sm text-muted-foreground">
                {client.organisation}
              </p>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            {[
              ["Agreed", npr(agreed)],
              ["Received", npr(received)],
              ["Billed", npr(billed)],
              ["Outstanding", npr(due)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground uppercase">
                  {label}
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {ledger.lines.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            Nothing has been delivered or paid yet, so there is nothing to
            show on a statement.
          </p>
        ) : (
          <>
            <div className="mt-8 -mx-4 overflow-x-auto px-4 print:mx-0 print:overflow-visible print:px-0">
            <table className="w-full min-w-[34rem] border-collapse text-sm print:min-w-0">
              <thead>
                <tr className="border-y text-left">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 text-right font-medium">Charge</th>
                  <th className="py-2 pr-4 text-right font-medium">Payment</th>
                  <th className="py-2 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledger.lines.map((l, i) => (
                  <tr key={`${l.kind}-${i}`} className="border-b">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {rowDate.format(new Date(`${dateKey(l.at)}T06:00:00Z`))}
                      {l.approximateDate && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (approx.)
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">{l.description}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {l.chargeNpr ? npr(l.chargeNpr) : ""}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {l.creditNpr ? npr(l.creditNpr) : ""}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {l.balanceNpr < 0
                        ? `${npr(-l.balanceNpr)} cr`
                        : npr(l.balanceNpr)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-b-2 font-medium">
                  <td className="py-2 pr-4" colSpan={2}>
                    Totals
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {npr(ledger.totalChargedNpr)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {npr(ledger.totalPaidNpr)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {ledger.closingNpr < 0
                      ? `${npr(-ledger.closingNpr)} cr`
                      : npr(ledger.closingNpr)}
                  </td>
                </tr>
              </tfoot>
            </table>
            </div>

            {/* Said in words as well as figures: "40,000 cr" in a column
                is not something a client should have to interpret. */}
            <p className="mt-6 text-sm leading-relaxed">
              {inCredit && (
                <>
                  <span className="font-medium">
                    {npr(-ledger.closingNpr)} remains in credit.
                  </span>{" "}
                  This covers future sessions as they are delivered.
                </>
              )}
              {owes && (
                <>
                  <span className="font-medium">
                    {npr(ledger.closingNpr)} is due for work already
                    delivered.
                  </span>{" "}
                  Payment can be made to the usual account.
                </>
              )}
              {!owes && !inCredit && (
                <span className="font-medium">
                  The account is settled in full.
                </span>
              )}
            </p>

            {due > 0 && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                A further {npr(due)} of the agreed total is not yet due, and
                becomes payable as the remaining work is delivered.
              </p>
            )}
          </>
        )}

        <footer className="mt-10 border-t pt-4 text-xs text-muted-foreground">
          Sessions are charged when they are delivered, so time that is
          booked but not yet held does not appear above. Please reply to{" "}
          {profile.emails[0]} if anything here does not match your records.
        </footer>
      </article>

      {advanceLeft < 0 && (
        <p className="print-hide mt-6 text-sm text-warning">
          Note for you, not shown to the client: this client is{" "}
          {npr(-advanceLeft)} into delivered work beyond their advance.
        </p>
      )}
    </Container>
  );
}
