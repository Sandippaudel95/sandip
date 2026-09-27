import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { auth } from "@/lib/auth";
import { Container } from "@/components/layout/Section";
import { Button } from "@/components/ui/button";
import { AdminNav } from "@/components/admin/AdminNav";
import { StatCard } from "@/components/admin/StatCard";
import { AttentionPanel } from "@/components/admin/AttentionPanel";
import { SessionsPanel } from "@/components/admin/SessionsPanel";
import { signOutAction } from "@/app/admin/actions";
import { earnings, needsAttention, todaysBookings, upcomingBookings } from "@/lib/crm";
import { npr } from "@/content/services";
import { formatDateKey, nepalDateKey } from "@/lib/time";

export const metadata: Metadata = {
  title: "Overview",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Belt and braces: the proxy guards this route, but a bad matcher would
  // expose it silently, so the page checks the session itself.
  const session = await auth();
  if (!session?.user) redirect("/");

  const [money, attention, today, upcoming] = await Promise.all([
    earnings(),
    needsAttention(),
    todaysBookings(),
    upcomingBookings(14),
  ]);

  return (
    <Container className="py-10 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1.5 text-muted-foreground">
            {formatDateKey(nepalDateKey())}
          </p>
        </div>
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </form>
      </div>

      <div className="mt-6">
        <AdminNav />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Earned this month"
          value={npr(money.thisMonth.totalNpr)}
          sublabel={`${npr(money.thisMonth.consultationsNpr)} sessions · ${npr(
            money.thisMonth.otherWorkNpr,
          )} other work`}
        />
        <StatCard
          label="Earned this year"
          value={npr(money.thisYear.totalNpr)}
          sublabel={`${npr(money.allTime.totalNpr)} all time`}
        />
        <StatCard
          label="Outstanding"
          value={npr(money.outstandingNpr)}
          sublabel="Quoted but not yet received"
          tone={money.outstandingNpr > 0 ? "warn" : "default"}
        />
        <StatCard
          label="Sessions this week"
          value={String(money.sessionsThisWeek)}
          sublabel="Next seven days"
        />
      </div>

      <section className="mt-12">
        <h2 className="text-sm font-semibold tracking-[0.12em] text-navy uppercase">
          Needs attention
          {attention.total > 0 && (
            <span className="ml-2 rounded-full bg-[#fef3c7] px-2 py-0.5 text-[#b45309]">
              {attention.total}
            </span>
          )}
        </h2>
        <div className="mt-4">
          <AttentionPanel attention={attention} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-semibold tracking-[0.12em] text-navy uppercase">
          Today
        </h2>
        <div className="mt-4">
          <SessionsPanel
            bookings={today}
            emptyMessage="No sessions today."
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-semibold tracking-[0.12em] text-navy uppercase">
          Next 14 days
        </h2>
        <div className="mt-4">
          <SessionsPanel
            bookings={upcoming}
            emptyMessage="Nothing booked in the next two weeks."
            groupByDay
          />
        </div>
      </section>
    </Container>
  );
}
