import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { Container } from "@/components/layout/Section";
import { ClientForm } from "@/components/admin/ClientForm";

export const metadata: Metadata = {
  title: "Add client",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-brand hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to clients
      </Link>

      <h1 className="mt-5 text-3xl font-semibold tracking-tight">
        Add a client
      </h1>
      <p className="mt-2 text-muted-foreground">
        For someone who has not booked through the site.
      </p>

      <div className="mt-8">
        <ClientForm />
      </div>
    </Container>
  );
}
