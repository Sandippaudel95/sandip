import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock,
  Receipt,
} from "lucide-react";
import { npr } from "@/content/services";
import { formatDateKey, formatSession, nepalDateKey } from "@/lib/time";
import type { Attention } from "@/lib/crm";

/* One list of everything waiting on Sandip, so nothing needs remembering:
   payments to check, follow-ups now due, work past its date, and sessions
   that have finished but were never closed off. */

function Row({
  icon: Icon,
  tone,
  title,
  detail,
  href,
  action,
}: {
  icon: typeof BellRing;
  tone: "amber" | "violet" | "red" | "blue";
  title: string;
  detail: string;
  href: string;
  action: string;
}) {
  const tones = {
    amber: "text-[#b45309] bg-[#fef3c7]",
    violet: "text-[#5b21b6] bg-[#ede9fe]",
    red: "text-destructive bg-destructive/10",
    blue: "text-[#1e40af] bg-[#dbeafe]",
  } as const;

  return (
    <li className="flex flex-wrap items-start gap-3 border-b py-3.5 last:border-b-0">
      <span
        className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${tones[tone]}`}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
      </div>
      <Link
        href={href}
        className="shrink-0 self-center text-sm font-medium text-navy underline-offset-4 hover:underline"
      >
        {action}
      </Link>
    </li>
  );
}

export function AttentionPanel({ attention }: { attention: Attention }) {
  if (attention.total === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <CheckCircle2
          className="mx-auto mb-3 size-7 text-[#065f46]"
          aria-hidden="true"
        />
        <p className="font-medium">Nothing needs attention</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No payments to verify, no follow-ups due, no work overdue.
        </p>
      </div>
    );
  }

  const today = nepalDateKey();

  return (
    <ul className="rounded-xl border bg-card px-5">
      {attention.awaitingVerification.map((b) => (
        <Row
          key={`pay-${b.id}`}
          icon={Receipt}
          tone="amber"
          title={`Verify payment from ${b.clientName}`}
          detail={`${npr(b.amountNpr)} · ref ${b.transactionId} · ${formatSession(
            nepalDateKey(b.startsAt),
            b.timeSlot,
            b.durationHours,
          )}`}
          href="/admin/bookings"
          action="Review"
        />
      ))}

      {attention.followUpsDue.map((c) => {
        const due = c.nextActionDate
          ? c.nextActionDate.toISOString().slice(0, 10)
          : today;
        return (
          <Row
            key={`follow-${c.id}`}
            icon={BellRing}
            tone="violet"
            title={c.nextAction ?? `Follow up with ${c.name}`}
            detail={`${c.name} · due ${formatDateKey(due)}${due < today ? " · overdue" : ""}`}
            href={`/admin/clients/${c.id}`}
            action="Open"
          />
        );
      })}

      {attention.overdueWork.map((e) => (
        <Row
          key={`work-${e.id}`}
          icon={AlertTriangle}
          tone="red"
          title={`${e.title} is overdue`}
          detail={`${e.client.name} · was due ${formatDateKey(
            e.dueAt!.toISOString().slice(0, 10),
          )}`}
          href="/admin/engagements"
          action="Open"
        />
      ))}

      {attention.toComplete.map((b) => (
        <Row
          key={`done-${b.id}`}
          icon={Clock}
          tone="blue"
          title={`Session with ${b.clientName} has finished`}
          detail={`${formatSession(
            nepalDateKey(b.startsAt),
            b.timeSlot,
            b.durationHours,
          )} · mark it completed`}
          href="/admin/bookings"
          action="Close off"
        />
      ))}
    </ul>
  );
}
