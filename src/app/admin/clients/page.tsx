import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Container } from "@/components/layout/Section";
import { AdminNav } from "@/components/admin/AdminNav";
import { ClientsTable } from "@/components/admin/ClientsTable";
import { clientSummaries } from "@/lib/crm";

export const metadata: Metadata = {
  title: "Clients",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const summaries = await clientSummaries();

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Clients</h1>
      <p className="mt-2 text-muted-foreground">
        {summaries.length} {summaries.length === 1 ? "person" : "people"}
      </p>

      <div className="mt-6">
        <AdminNav />
      </div>

      <div className="mt-8">
        <ClientsTable summaries={summaries} />
      </div>
    </Container>
  );
}
