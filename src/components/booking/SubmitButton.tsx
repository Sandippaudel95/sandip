"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* Must be rendered inside the <form> it submits: useFormStatus reads the
   status of the nearest enclosing form, and returns false if it is called
   from the same component that renders the form. */
export function SubmitButton({
  children,
  pendingLabel = "Submitting…",
  className,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={cn("min-w-44", className)}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
