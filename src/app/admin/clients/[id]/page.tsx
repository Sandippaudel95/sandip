import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2, GraduationCap, Mail, Phone } from "lucide-react";
import { auth } from "@/lib/auth";
import { clientDetail } from "@/lib/crm";
import { revenue, outstanding } from "@/lib/money";
import { npr } from "@/content/services";
import { formatDateKey, nepalDateKey } from "@/lib/time";
import { Container } from "@/components/layout/Section";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/StatCard";
import { ClientTimeline } from "@/components/admin/ClientTimeline";
import { NextActionCard } from "@/components/admin/NextActionCard";

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

  const split = revenue(client.bookings, client.engagements);
  const due = outstanding(client.engagements);
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

        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/clients/${client.id}/edit`}>Edit details</Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Received"
          value={npr(split.totalNpr)}
          sublabel={`${npr(split.consultationsNpr)} sessions · ${npr(
            split.otherWorkNpr,
          )} other work`}
        />
        <StatCard
          label="Outstanding"
          value={npr(due)}
          sublabel="On live work"
          tone={due > 0 ? "warn" : "default"}
        />
        <StatCard
          label="History"
          value={String(client.bookings.length + client.engagements.length)}
          sublabel={`${client.bookings.length} sessions · ${client.engagements.length} other jobs`}
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
    </Container>
  );
}
