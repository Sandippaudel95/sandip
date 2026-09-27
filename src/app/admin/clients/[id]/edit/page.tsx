import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Container } from "@/components/layout/Section";
import { ClientForm } from "@/components/admin/ClientForm";

export const metadata: Metadata = {
  title: "Edit client",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <Link
        href={`/admin/clients/${client.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-navy hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to {client.name}
      </Link>

      <h1 className="mt-5 text-3xl font-semibold tracking-tight">
        Edit {client.name}
      </h1>

      <div className="mt-8">
        <ClientForm client={client} />
      </div>
    </Container>
  );
}
