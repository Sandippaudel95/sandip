"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, Loader2, Save, Trash2 } from "lucide-react";
import type { Client, Engagement } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  deleteEngagement,
  saveEngagement,
} from "@/app/admin/engagements/actions";

const TYPES = [
  ["THESIS_REVIEW", "Thesis review"],
  ["PAPER_REVIEW", "Paper review"],
  ["DATA_ANALYSIS", "Data analysis"],
  ["RESEARCH_CONSULTANCY", "Research consultancy"],
  ["TRAINING", "Training"],
  ["OTHER", "Other"],
] as const;

const STATUSES = [
  ["ENQUIRY", "Enquiry"],
  ["QUOTED", "Quoted"],
  ["AGREED", "Agreed"],
  ["IN_PROGRESS", "In progress"],
  ["DELIVERED", "Delivered"],
  ["CANCELLED", "Cancelled"],
] as const;

const dateValue = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : "";

export function EngagementForm({
  engagement,
  clients,
}: {
  engagement?: Engagement;
  clients: Pick<Client, "id" | "name" | "email">[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [clientId, setClientId] = useState(engagement?.clientId ?? "");

  function onSubmit(formData: FormData) {
    setMessage(null);
    start(async () => {
      const res = await saveEngagement(engagement?.id ?? null, formData);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setMessage(res.message);
        return;
      }
      setErrors({});
      router.push("/admin/engagements");
      router.refresh();
    });
  }

  function onDelete() {
    if (!engagement) return;
    start(async () => {
      await deleteEngagement(engagement.id);
      router.push("/admin/engagements");
      router.refresh();
    });
  }

  const input = (
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
          "mt-2 w-full rounded-lg border bg-background px-3 py-3 text-sm",
          "focus:outline-2 focus:outline-offset-1 focus:outline-ring",
          errors[name] && "border-destructive",
        )}
        {...props}
      />
      {errors[name] && (
        <p className="mt-2 text-sm text-destructive">{errors[name]}</p>
      )}
    </div>
  );

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="rounded-xl border bg-muted/40 p-5">
        <label htmlFor="clientId" className="block text-sm font-medium">
          Client
        </label>
        <select
          id="clientId"
          name="clientId"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="mt-2 w-full rounded-lg border bg-background px-3 py-3 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-ring"
        >
          <option value="">— New client —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.email})
            </option>
          ))}
        </select>

        {/* Shown only when no existing client is chosen. */}
        {!clientId && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {input("newClientName", "New client name", { maxLength: 120 })}
            {input("newClientEmail", "New client email", {
              type: "email",
              maxLength: 200,
            })}
          </div>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="type" className="block text-sm font-medium">
            Type of work
          </label>
          <select
            id="type"
            name="type"
            defaultValue={engagement?.type ?? "THESIS_REVIEW"}
            className="mt-2 w-full rounded-lg border bg-background px-3 py-3 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-ring"
          >
            {TYPES.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
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
            defaultValue={engagement?.status ?? "ENQUIRY"}
            className="mt-2 w-full rounded-lg border bg-background px-3 py-3 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-ring"
          >
            {STATUSES.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {input(
        "title",
        "Title",
        { required: true, maxLength: 200, placeholder: "e.g. MPhil thesis review, chapters 1-4" },
        engagement?.title ?? "",
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {input(
          "feeNpr",
          "Agreed fee (Rs.)",
          { type: "number", min: 0, step: 100 },
          String(engagement?.feeNpr ?? 0),
        )}
        {input(
          "amountPaidNpr",
          "Received so far (Rs.)",
          { type: "number", min: 0, step: 100 },
          String(engagement?.amountPaidNpr ?? 0),
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {input("startedAt", "Started", { type: "date" }, dateValue(engagement?.startedAt))}
        {input("dueAt", "Due", { type: "date" }, dateValue(engagement?.dueAt))}
        {input(
          "completedAt",
          "Completed",
          { type: "date" },
          dateValue(engagement?.completedAt),
        )}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={engagement?.notes ?? ""}
          maxLength={5000}
          className="mt-2 w-full rounded-lg border bg-background px-3 py-3 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-ring"
        />
      </div>

      {message && (
        <p
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
        >
          <AlertCircle
            className="mt-1 size-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {engagement ? "Save changes" : "Add work"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        {engagement && (
          <Button
            type="button"
            variant="destructive"
            onClick={onDelete}
            disabled={pending}
            className="ml-auto"
          >
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
