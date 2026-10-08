import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAvailabilitySettings } from "@/lib/availability";
import { Container } from "@/components/layout/Section";
import { AdminNav } from "@/components/admin/AdminNav";
import { AvailabilityForm } from "@/components/admin/AvailabilityForm";

export const metadata: Metadata = {
  title: "Availability",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const [rules, rows] = await Promise.all([
    getAvailabilitySettings(),
    prisma.blackoutDate.findMany({ orderBy: { date: "asc" } }),
  ]);

  const blackouts = rows.map((b) => ({
    id: b.id,
    // A plain DATE column: the stored value is the date itself, so slicing
    // the ISO string is right and timezone conversion would be wrong.
    date: b.date.toISOString().slice(0, 10),
    reason: b.reason,
  }));

  return (
    <Container className="py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Availability
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          When sessions can be booked. Changes take effect immediately.
        </p>
      </header>

      <div className="mt-6">
        <AdminNav />
      </div>

      <div className="mt-10">
        <AvailabilityForm rules={rules} blackouts={blackouts} />
      </div>
    </Container>
  );
}
