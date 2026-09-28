import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Container } from "@/components/layout/Section";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/admin/dashboard");

  return (
    <Container className="py-20 sm:py-28">
      <div className="mx-auto max-w-sm rounded-xl border bg-card p-7">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Booking administration.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </Container>
  );
}
