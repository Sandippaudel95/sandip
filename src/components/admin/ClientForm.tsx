"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, Loader2, Save } from "lucide-react";
import type { Client } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveClient } from "@/app/admin/clients/actions";

const STATUSES = ["LEAD", "ACTIVE", "PAST", "ARCHIVED"] as const;
const LEVELS = [
  "Bachelor",
  "Master",
  "MPhil",
  "PhD",
  "Faculty",
  "Institution",
  "Other",
] as const;

/** ISO date for a plain date column, or "" for the input. */
const dateValue = (d: Date | null) =>
  d ? d.toISOString().slice(0, 10) : "";

export function ClientForm({ client }: { client?: Client }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setMessage(null);
    start(async () => {
      const res = await saveClient(client?.id ?? null, formData);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setMessage(res.message);
        return;
      }
      setErrors({});
      router.push(`/admin/clients/${res.id}`);
      router.refresh();
    });
  }

  const field = (
    name: string,
    label: string,
    props: React.ComponentProps<"input"> = {},
    defaultValue = "",
  ) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={Boolean(errors[name])}
        className={cn(
          "mt-1.5 w-full rounded-lg border bg-background px-3 py-2.5 text-sm",
          "focus:outline-2 focus:outline-offset-1 focus:outline-ring",
          errors[name] && "border-destructive",
        )}
        {...props}
      />
      {errors[name] && (
        <p className="mt-1.5 text-sm text-destructive">{errors[name]}</p>
      )}
    </div>
  );

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        {field("name", "Name", { required: true, maxLength: 120 }, client?.name ?? "")}
        {field(
          "email",
          "Email",
          { type: "email", required: true, maxLength: 200 },
          client?.email ?? "",
        )}
        {field("phone", "Phone", { type: "tel", maxLength: 40 }, client?.phone ?? "")}
        {field(
          "organisation",
          "Campus or organisation",
          { maxLength: 160 },
          client?.organisation ?? "",
        )}

        <div>
          <label htmlFor="level" className="block text-sm font-medium">
            Level
          </label>
          <select
            id="level"
            name="level"
            defaultValue={client?.level ?? ""}
            className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-ring"
          >
            <option value="">Not set</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={client?.status ?? "ACTIVE"}
            className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-ring"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border bg-muted/40 p-5">
        <h2 className="text-sm font-semibold tracking-[0.12em] text-navy uppercase">
          Next action
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Anything dated today or earlier appears on the overview.
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_12rem]">
          {field(
            "nextAction",
            "What needs doing",
            { maxLength: 300, placeholder: "e.g. send feedback on chapter 3" },
            client?.nextAction ?? "",
          )}
          {field(
            "nextActionDate",
            "Due",
            { type: "date" },
            dateValue(client?.nextActionDate ?? null),
          )}
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={6}
          defaultValue={client?.notes ?? ""}
          maxLength={5000}
          className="mt-1.5 w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-ring"
        />
      </div>

      {message && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
        >
          <AlertCircle
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          {message}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {client ? "Save changes" : "Add client"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
