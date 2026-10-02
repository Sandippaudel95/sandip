import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/layout/Section";
import { EngagementForm } from "@/components/admin/EngagementForm";

export const metadata: Metadata = {
  title: "Edit work",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditEngagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const { id } = await params;
  const [engagement, clients] = await Promise.all([
    prisma.engagement.findUnique({ where: { id } }),
    prisma.client.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!engagement) notFound();

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <Link
        href="/admin/engagements"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-brand hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to work
      </Link>

      <h1 className="mt-5 text-3xl font-semibold tracking-tight">
        {engagement.title}
      </h1>

      <div className="mt-8">
        <EngagementForm engagement={engagement} clients={clients} />
      </div>
    </Container>
  );
}
