import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { npr } from "@/content/services";
import { engagementOutstandingNpr, outstanding, revenue } from "@/lib/money";
import { Container } from "@/components/layout/Section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminNav } from "@/components/admin/AdminNav";
import { StatCard } from "@/components/admin/StatCard";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Work",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  THESIS_REVIEW: "Thesis review",
  PAPER_REVIEW: "Paper review",
  DATA_ANALYSIS: "Data analysis",
  RESEARCH_CONSULTANCY: "Research consultancy",
  TRAINING: "Training",
  OTHER: "Other",
};

const STATUS_STYLE: Record<string, string> = {
  ENQUIRY: "bg-[#dbeafe] text-[#1e40af]",
  QUOTED: "bg-[#dbeafe] text-[#1e40af]",
  AGREED: "bg-[#d1fae5] text-[#065f46]",
  IN_PROGRESS: "bg-[#fef3c7] text-[#b45309]",
  DELIVERED: "bg-[#ede9fe] text-[#5b21b6]",
  CANCELLED: "bg-secondary text-muted-foreground",
};

const stamp = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kathmandu",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function EngagementsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const engagements = await prisma.engagement.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: true },
  });

  // An empty booking list is passed deliberately: this page reports only
  // the negotiated stream, and revenue() is the one place that knows how.
  const received = revenue([], engagements);
  const due = outstanding(engagements);
  const live = engagements.filter(
    (e) => !["DELIVERED", "CANCELLED"].includes(e.status),
  ).length;

  return (
    <Container className="py-10 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Work</h1>
          <p className="mt-1.5 max-w-xl text-muted-foreground">
            Reviews, analysis, commissioned research and training: everything
            agreed outside the booking page.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/engagements/new">
            <Plus aria-hidden="true" />
            Add work
          </Link>
        </Button>
      </div>

      <div className="mt-6">
        <AdminNav />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Received"
          value={npr(received.otherWorkNpr)}
          sublabel="All time, this work only"
        />
        <StatCard
          label="Outstanding"
          value={npr(due)}
          sublabel="Quoted but not received"
          tone={due > 0 ? "warn" : "default"}
        />
        <StatCard
          label="Live jobs"
          value={String(live)}
          sublabel="Not delivered or cancelled"
        />
      </div>

      {engagements.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed p-10 text-center">
          <Briefcase
            className="mx-auto mb-3 size-7 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="font-medium">No work recorded yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Add a thesis review, a training session or a commissioned study
            here and it counts towards your earnings on the overview.
          </p>
        </div>
      ) : (
        <ul className="mt-10 divide-y rounded-xl border bg-card">
          {engagements.map((e) => {
            const owed = engagementOutstandingNpr(e);
            return (
              <li key={e.id}>
                <Link
                  href={`/admin/engagements/${e.id}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 transition-colors hover:bg-muted/60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{e.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {TYPE_LABEL[e.type]} · {e.client.name}
                      {e.dueAt ? ` · due ${stamp.format(e.dueAt)}` : ""}
                    </span>
                  </span>

                  <Badge
                    variant="outline"
                    className={cn(
                      "border-transparent text-xs",
                      STATUS_STYLE[e.status],
                    )}
                  >
                    {e.status.replace("_", " ").toLowerCase()}
                  </Badge>

                  <span className="text-right tabular-nums">
                    {npr(e.amountPaidNpr)}
                    <span className="block text-xs text-muted-foreground">
                      of {npr(e.feeNpr)}
                    </span>
                  </span>

                  {owed > 0 && (
                    <Badge
                      variant="outline"
                      className="border-transparent bg-[#fef3c7] text-xs text-[#b45309]"
                    >
                      {npr(owed)} due
                    </Badge>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}
