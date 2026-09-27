import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/layout/Section";
import { EngagementForm } from "@/components/admin/EngagementForm";

export const metadata: Metadata = {
  title: "Add work",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewEngagementPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const clients = await prisma.client.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <Link
        href="/admin/engagements"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-navy hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to work
      </Link>

      <h1 className="mt-5 text-3xl font-semibold tracking-tight">Add work</h1>
      <p className="mt-1.5 text-muted-foreground">
        A review, analysis, commissioned study or training session.
      </p>

      <div className="mt-8">
        <EngagementForm clients={clients} />
      </div>
    </Container>
  );
}
