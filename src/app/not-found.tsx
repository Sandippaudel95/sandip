import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Section";

export default function NotFound() {
  return (
    <Container className="py-24 text-center sm:py-32">
      <p className="font-display text-6xl font-light text-brand/50">404</p>
      <h1 className="mt-4 text-4xl font-normal tracking-tight">
        Page not found
      </h1>
      <p className="mx-auto mt-3 max-w-md text-muted-foreground">
        That page does not exist, or it has moved since the site was
        redesigned.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">Go to the home page</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/research">Browse research</Link>
        </Button>
      </div>
    </Container>
  );
}
