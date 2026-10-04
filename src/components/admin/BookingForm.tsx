"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, CalendarPlus, Loader2, Save } from "lucide-react";
import type { Booking } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { nepalDateKey } from "@/lib/time";
import {
  createManualBooking,
  updateBooking,
} from "@/app/admin/bookings/actions";

/* Adding and editing take the same fields, so they are the same form.
   Adding covers work agreed off-site, where the point is to get the time
   onto the calendar so the booking page stops offering it. Editing covers
   moving a session when plans change, and fixing payment details. */
export function BookingForm({
  hourlyRate,
  booking,
  groupSize = 1,
}: {
  hourlyRate: number;
  /** Omitted when adding. */
  booking?: Booking;
  /** Sessions in this order, so the form can say what a status change
      will touch. */
  groupSize?: number;
}) {
  const editing = Boolean(booking);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [hours, setHours] = useState(booking?.durationHours ?? 1);
  // Always controlled: switching between value and defaultValue mid-life
  // makes React drop the input's state.
  const [amount, setAmount] = useState<number | null>(
    booking ? booking.amountNpr : null,
  );

  function onSubmit(formData: FormData) {
    setMessage(null);
    setErrors({});
    start(async () => {
      const res = booking
        ? await updateBooking(booking.id, formData)
        : await createManualBooking(formData);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setMessage(res.message);
        return;
      }
      router.push("/admin/bookings");
      router.refresh();
    });
  }

  const field = (
    name: string,
    label: string,
    input: React.ReactNode,
    hint?: string,
  ) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      {input}
      {hint && !errors[name] && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
      {errors[name] && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {errors[name]}
        </p>
      )}
    </div>
  );

  const inputClass = (name: string) =>
    cn(
      "mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-ring",
      errors[name] && "border-destructive",
    );

  return (
    <form action={onSubmit} className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold tracking-[0.12em] text-brand uppercase">
          Client
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {field(
            "clientName",
            "Name",
            <input
              id="clientName"
              name="clientName"
              defaultValue={booking?.clientName}
              required
              maxLength={100}
              className={inputClass("clientName")}
            />,
          )}
          {field(
            "clientEmail",
            "Email",
            <input
              id="clientEmail"
              name="clientEmail"
              type="email"
              defaultValue={booking?.clientEmail}
              required
              maxLength={200}
              className={inputClass("clientEmail")}
            />,
            "An existing client with this address is reused, not duplicated.",
          )}
          <div className="sm:col-span-2">
            {field(
              "consultationTopic",
              "Topic",
              <input
                id="consultationTopic"
                name="consultationTopic"
                defaultValue={booking?.consultationTopic}
                required
                maxLength={300}
                className={inputClass("consultationTopic")}
              />,
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold tracking-[0.12em] text-brand uppercase">
          When
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {editing
            ? "Change these to move the session."
            : "You can book any time you have agreed."}{" "}
          Opening hours, the notice period and the daily cap are not applied
          here. Overlapping another booking is still refused.
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {field(
            "date",
            "Date",
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={booking ? nepalDateKey(booking.startsAt) : undefined}
              required
              className={inputClass("date")}
            />,
          )}
          {field(
            "timeSlot",
            "Start time",
            <input
              id="timeSlot"
              name="timeSlot"
              type="time"
              defaultValue={booking?.timeSlot}
              required
              step={900}
              className={inputClass("timeSlot")}
            />,
            "Nepal time.",
          )}
          {field(
            "durationHours",
            "Length (hours)",
            <input
              id="durationHours"
              name="durationHours"
              type="number"
              min={1}
              max={12}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value) || 1)}
              required
              className={inputClass("durationHours")}
            />,
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold tracking-[0.12em] text-brand uppercase">
          Payment
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {field(
            "amountNpr",
            "Amount (Rs.)",
            <input
              id="amountNpr"
              name="amountNpr"
              type="number"
              min={0}
              required
              // Follows the hours until the admin types their own figure,
              // since negotiated work is often not the standard rate.
              value={amount ?? hourlyRate * hours}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className={inputClass("amountNpr")}
            />,
            amount === null ? `${hours} × Rs. ${hourlyRate}` : undefined,
          )}
          {field(
            "paymentStatus",
            "Payment status",
            <select
              id="paymentStatus"
              name="paymentStatus"
              defaultValue={booking?.paymentStatus ?? "PENDING"}
              className={inputClass("paymentStatus")}
            >
              <option value="PENDING">Not paid yet</option>
              <option value="VERIFIED">Paid and verified</option>
              <option value="REJECTED">Payment rejected</option>
            </select>,
            groupSize > 1
              ? `Applies to all ${groupSize} sessions in this booking.`
              : "Only verified payments count towards earnings.",
          )}
          {field(
            "bookingStatus",
            "Booking status",
            <select
              id="bookingStatus"
              name="bookingStatus"
              defaultValue={booking?.bookingStatus ?? "CONFIRMED"}
              className={inputClass("bookingStatus")}
            >
              <option value="CONFIRMED">Confirmed</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Already happened</option>
              <option value="CANCELLED">Cancelled</option>
            </select>,
          )}
          <div className="sm:col-span-2">
            {field(
              "transactionId",
              "Payment reference (optional)",
              <input
                id="transactionId"
                name="transactionId"
                defaultValue={booking?.transactionId}
                maxLength={100}
                className={inputClass("transactionId")}
              />,
              "Bank or Fonepay reference, if there is one.",
            )}
          </div>
          <div className="sm:col-span-3">
            {field(
              "adminNote",
              "Note (optional)",
              <input
                id="adminNote"
                name="adminNote"
                defaultValue={booking?.adminNote ?? ""}
                maxLength={500}
                placeholder="e.g. Agreed over WhatsApp, paying on the day"
                className={inputClass("adminNote")}
              />,
              "Where the lead came from, or anything worth remembering.",
            )}
          </div>
        </div>

        <label className="mt-5 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="notify"
            className="mt-0.5 size-4 rounded border-input"
          />
          <span>
            {editing
              ? "Email the client about this change"
              : "Email the client a confirmation"}
            <span className="block text-xs text-muted-foreground">
              {editing
                ? "A moved session gets a reschedule notice, not a confirmation."
                : "Off by default: you have usually just spoken to them."}
            </span>
          </span>
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : editing ? (
            <Save aria-hidden="true" />
          ) : (
            <CalendarPlus aria-hidden="true" />
          )}
          {editing ? "Save changes" : "Add booking"}
        </Button>
        {message && (
          <p
            role="alert"
            className="flex items-center gap-2 text-sm text-destructive"
          >
            <AlertCircle className="size-4" aria-hidden="true" />
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
