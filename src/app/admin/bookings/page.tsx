import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/layout/Section";
import { AdminNav } from "@/components/admin/AdminNav";
import { BookingsTable } from "@/components/admin/BookingsTable";

export const metadata: Metadata = {
  title: "Bookings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const awaiting = bookings.filter(
    (b) => b.paymentStatus === "PENDING" && b.bookingStatus === "PENDING",
  );

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Bookings</h1>
      <p className="mt-1.5 text-muted-foreground">
        {awaiting.length > 0
          ? `${awaiting.length} awaiting verification`
          : "Nothing awaiting verification"}
        {" · "}
        {bookings.length} total
      </p>

      <div className="mt-6">
        <AdminNav />
      </div>

      {awaiting.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold tracking-[0.12em] text-navy uppercase">
            Awaiting verification
          </h2>
          <p className="mt-1.5 mb-5 text-sm text-muted-foreground">
            Check each transaction ID against your bank or Fonepay app before
            confirming.
          </p>
          <BookingsTable bookings={awaiting} />
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-sm font-semibold tracking-[0.12em] text-navy uppercase">
          All bookings
        </h2>
        <div className="mt-5">
          <BookingsTable bookings={bookings} />
        </div>
      </section>
    </Container>
  );
}
