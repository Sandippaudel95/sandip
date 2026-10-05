import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HOURLY_RATE } from "@/content/services";
import { Container } from "@/components/layout/Section";
import { Button } from "@/components/ui/button";
import { BookingForm } from "@/components/admin/BookingForm";

export const metadata: Metadata = {
  title: "Add booking",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  // Arrived from a client row: prefill who it is for, so booking an
  // existing client does not mean retyping their details and risking a
  // typo that creates a second client record.
  const { client: clientId } = await searchParams;
  const client = clientId
    ? await prisma.client.findUnique({ where: { id: clientId } })
    : null;

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
          Add a booking
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {client
            ? `For ${client.name}. Adding it here takes the time off the public calendar so nobody can book over it.`
            : "For sessions agreed somewhere else — WhatsApp, Facebook, TikTok or in person. Adding it here takes the time off the public calendar so nobody can book over it."}
        </p>
      </header>

      <div className="mt-10 max-w-3xl">
        <BookingForm
          hourlyRate={HOURLY_RATE}
          defaultClient={
            client ? { name: client.name, email: client.email } : undefined
          }
        />
      </div>
    </Container>
  );
}
