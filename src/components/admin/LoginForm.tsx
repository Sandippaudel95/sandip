"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { signInAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/booking/SubmitButton";

export function LoginForm() {
  const [error, formAction] = useActionState<string | null, FormData>(
    signInAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-2 w-full rounded-md border bg-background px-3 py-3 text-base focus:outline-2 focus:outline-offset-1 focus:outline-ring"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-2 w-full rounded-md border bg-background px-3 py-3 text-base focus:outline-2 focus:outline-offset-1 focus:outline-ring"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
        >
          <AlertCircle
            className="mt-1 size-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          {error}
        </p>
      )}

      <SubmitButton pendingLabel="Signing in…" className="w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
