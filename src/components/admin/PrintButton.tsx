"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/* The only client-side part of the statement, so the page itself can stay
   a server component. Every browser's print dialog offers Save as PDF. */
export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <Button className="print-hide" onClick={() => window.print()}>
      <Printer aria-hidden="true" />
      {label}
    </Button>
  );
}
