import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HOURLY_RATE } from "@/content/services";
import { formatSession } from "@/lib/time";
import { nepalDateKey } from "@/lib/time";
import { Container } from "@/components/layout/Section";
import { Button } from "@/components/ui/button";
import { BookingForm } from "@/components/admin/BookingForm";

export const metadata: Metadata = {
  title: "Edit booking",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const { id } = await params;
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) notFound();

  // Other sessions of the same order, so the page can say what a status
  // change will reach beyond the one being edited.
  const siblings = booking.groupId
    ? await prisma.booking.findMany({
        where: { groupId: booking.groupId, id: { not: booking.id } },
        orderBy: { startsAt: "asc" },
      })
    : [];

  return (
    <Container className="py-10">
      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link href="/admin/bookings">
          <ArrowLeft aria-hidden="true" />
          Bookings
        </Link>
      </Button>

      <header className="mt-4">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Edit booking
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Currently{" "}
          {formatSession(
            nepalDateKey(booking.startsAt),
            booking.timeSlot,
            booking.durationHours,
          )}
          .
        </p>
      </header>

      {siblings.length > 0 && (
        <div className="mt-6 flex gap-3 rounded-xl border border-brand/30 bg-brand-soft p-4 text-sm">
          <Layers className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <p className="font-medium">
              One of {siblings.length + 1} sessions paid for together.
            </p>
            <p className="mt-1 text-muted-foreground">
              The date, time, length and amount below change this session
              only. Payment and booking status apply to all of them, because
              the order was paid for once.
            </p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {siblings.map((s) => (
                <li key={s.id}>
                  {formatSession(
                    nepalDateKey(s.startsAt),
                    s.timeSlot,
                    s.durationHours,
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mt-10 max-w-3xl">
        <BookingForm
          hourlyRate={HOURLY_RATE}
          booking={booking}
          groupSize={siblings.length + 1}
        />
      </div>
    </Container>
  );
}
