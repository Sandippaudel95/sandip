import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarPlus,
  GraduationCap,
  Mail,
  Phone,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { clientDetail } from "@/lib/crm";
import {
  outstanding,
  advanceLeftNpr,
  billedNpr,
  receivedNpr,
  engagementEarnedNpr,
} from "@/lib/money";
import { npr } from "@/content/services";
import { formatDateKey, nepalDateKey } from "@/lib/time";
import { Container } from "@/components/layout/Section";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/StatCard";
import { ClientTimeline } from "@/components/admin/ClientTimeline";
import { NextActionCard } from "@/components/admin/NextActionCard";
import { PaymentsPanel } from "@/components/admin/PaymentsPanel";
import { DeleteClientCard } from "@/components/admin/DeleteClientCard";

export const metadata: Metadata = {
  title: "Client",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const { id } = await params;
  const client = await clientDetail(id);
  if (!client) notFound();

  const billed = billedNpr(client.bookings) +
    client.engagements.reduce((sum, e) => sum + e.feeNpr, 0);
  const received = receivedNpr(client.payments) +
    client.engagements.reduce((sum, e) => sum + engagementEarnedNpr(e), 0);
  const advanceLeft = advanceLeftNpr(client.payments, client.bookings);
  const liveSessions = client.bookings.filter(
    (b) => b.bookingStatus !== "CANCELLED",
  ).length;
  const deliveredCount = client.bookings.filter(
    (b) => b.bookingStatus === "COMPLETED",
  ).length;
  const due = outstanding(client.engagements, client.bookings, client.payments);
  const nextDue = client.nextActionDate
    ? client.nextActionDate.toISOString().slice(0, 10)
    : null;

  return (
    <Container className="py-10 sm:py-14">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-brand hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to clients
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {client.name}
          </h1>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Mail className="size-4" aria-hidden="true" />
              <a
                href={`mailto:${client.email}`}
                className="underline-offset-4 hover:text-brand hover:underline"
              >
                {client.email}
              </a>
            </li>
            {client.phone && (
              <li className="flex items-center gap-2">
                <Phone className="size-4" aria-hidden="true" />
                <a
                  href={`tel:${client.phone}`}
                  className="underline-offset-4 hover:text-brand hover:underline"
                >
                  {client.phone}
                </a>
              </li>
            )}
            {client.organisation && (
              <li className="flex items-center gap-2">
                <Building2 className="size-4" aria-hidden="true" />
                {client.organisation}
              </li>
            )}
            {client.level && (
              <li className="flex items-center gap-2">
                <GraduationCap className="size-4" aria-hidden="true" />
                {client.level}
              </li>
            )}
          </ul>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/admin/bookings/new?client=${client.id}`}>
              <CalendarPlus aria-hidden="true" />
              Book a session
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/clients/${client.id}/edit`}>Edit details</Link>
          </Button>
        </div>
      </div>

      {/* The three figures the engagement is actually run on. Billed is
          what was agreed, received is what arrived, and the advance is
          what is left of it once delivered sessions are taken off. */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total billed"
          value={npr(billed)}
          sublabel={`${liveSessions} session${liveSessions === 1 ? "" : "s"}${
            client.engagements.length
              ? ` · ${client.engagements.length} other job${client.engagements.length === 1 ? "" : "s"}`
              : ""
          }`}
        />
        <StatCard
          label="Advance received"
          value={npr(received)}
          sublabel={due > 0 ? `${npr(due)} still to pay` : "Paid in full"}
        />
        <StatCard
          label="Advance left"
          value={advanceLeft >= 0 ? npr(advanceLeft) : npr(-advanceLeft)}
          sublabel={
            advanceLeft < 0
              ? "Owed for delivered sessions"
              : `${deliveredCount} of ${liveSessions} delivered`
          }
          tone={advanceLeft <= 0 ? "warn" : "default"}
        />
      </div>

      <div className="mt-10">
        <NextActionCard
          clientId={client.id}
          nextAction={client.nextAction}
          dueKey={nextDue}
          overdue={Boolean(nextDue && nextDue <= nepalDateKey())}
          dueLabel={nextDue ? formatDateKey(nextDue) : null}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold tracking-[0.12em] text-brand uppercase">
          History
        </h2>
        <div className="mt-4">
          <ClientTimeline
            bookings={client.bookings}
            engagements={client.engagements}
          />
        </div>
      </section>

      {client.notes && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold tracking-[0.12em] text-brand uppercase">
            Notes
          </h2>
          <pre className="mt-4 rounded-xl border bg-card p-5 font-sans text-sm leading-relaxed whitespace-pre-wrap">
            {client.notes}
          </pre>
        </section>
      )}

      <PaymentsPanel
        clientId={client.id}
        payments={client.payments}
        advanceLeft={advanceLeft}
        dueNpr={due}
        sessionsRemaining={liveSessions - deliveredCount}
      />

      <DeleteClientCard
        id={client.id}
        name={client.name}
        bookingCount={client.bookings.length}
        engagementCount={client.engagements.length}
        // Money actually received, not sessions marked verified: the
        // payments cascade away with the client, so this is what comes
        // off the earnings figures.
        earnedNpr={received}
        isArchived={client.status === "ARCHIVED"}
      />
    </Container>
  );
}
