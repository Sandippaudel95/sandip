import type { Booking, Client, Engagement } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays, nepalDateKey, nepalToUtc } from "@/lib/time";
import {
  paymentRevenueDate,
  engagementRevenueDate,
  outstanding,
  revenue,
  type RevenueSplit,
} from "@/lib/money";

/* ==========================================================================
   Every read the CRM dashboard needs.

   Kept out of the pages so the date arithmetic lives in one place. "Today"
   means today in Nepal, never on the server: Vercel runs UTC, and a session
   at 23:30 Nepal time is still 17:45 UTC the same day, so a naive server-
   local window would put it on the wrong side of midnight.
   ========================================================================== */

/** Start of a Nepal calendar day, as a UTC instant. */
const dayStart = (dateKey: string) => nepalToUtc(dateKey, "00:00");

/** [start, end) covering one Nepal day. */
export function nepalDayRange(dateKey: string): { gte: Date; lt: Date } {
  return { gte: dayStart(dateKey), lt: dayStart(addDays(dateKey, 1)) };
}

/** First day of the Nepal month containing `dateKey`, as "YYYY-MM-01". */
export const monthStartKey = (dateKey: string) => `${dateKey.slice(0, 7)}-01`;

/** First day of the Nepal year containing `dateKey`. */
export const yearStartKey = (dateKey: string) => `${dateKey.slice(0, 4)}-01-01`;

export type BookingWithClient = Booking & { client: Client | null };

/** Sessions running today in Nepal, cancelled ones excluded. */
export async function todaysBookings(): Promise<BookingWithClient[]> {
  const today = nepalDateKey();
  return prisma.booking.findMany({
    where: {
      startsAt: nepalDayRange(today),
      bookingStatus: { not: "CANCELLED" },
    },
    orderBy: { startsAt: "asc" },
    include: { client: true },
  });
}

/** Sessions from tomorrow to `days` ahead. Today is handled separately. */
export async function upcomingBookings(days = 14): Promise<BookingWithClient[]> {
  const today = nepalDateKey();
  return prisma.booking.findMany({
    where: {
      startsAt: {
        gte: dayStart(addDays(today, 1)),
        lt: dayStart(addDays(today, days + 1)),
      },
      bookingStatus: { not: "CANCELLED" },
    },
    orderBy: { startsAt: "asc" },
    include: { client: true },
  });
}

export interface Attention {
  awaitingVerification: BookingWithClient[];
  /** Clients whose next action is due today or has passed. */
  followUpsDue: Client[];
  /** Live work past its due date. */
  overdueWork: (Engagement & { client: Client })[];
  /** Confirmed sessions that have already finished and need closing off. */
  toComplete: BookingWithClient[];
  total: number;
}

export async function needsAttention(): Promise<Attention> {
  const today = nepalDateKey();
  const todayDate = new Date(`${today}T00:00:00.000Z`);
  const now = new Date();

  const [awaitingVerification, followUpsDue, overdueWork, toComplete] =
    await Promise.all([
      prisma.booking.findMany({
        where: { paymentStatus: "PENDING", bookingStatus: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: { client: true },
      }),
      prisma.client.findMany({
        where: {
          nextActionDate: { lte: todayDate },
          status: { not: "ARCHIVED" },
        },
        orderBy: { nextActionDate: "asc" },
      }),
      prisma.engagement.findMany({
        where: {
          dueAt: { lt: todayDate },
          status: { notIn: ["DELIVERED", "CANCELLED"] },
        },
        orderBy: { dueAt: "asc" },
        include: { client: true },
      }),
      prisma.booking.findMany({
        where: { bookingStatus: "CONFIRMED", endsAt: { lt: now } },
        orderBy: { startsAt: "asc" },
        include: { client: true },
      }),
    ]);

  return {
    awaitingVerification,
    followUpsDue,
    overdueWork,
    toComplete,
    total:
      awaitingVerification.length +
      followUpsDue.length +
      overdueWork.length +
      toComplete.length,
  };
}

export interface Earnings {
  thisMonth: RevenueSplit;
  thisYear: RevenueSplit;
  allTime: RevenueSplit;
  /** Quoted on live engagements but not yet received. */
  outstandingNpr: number;
  /** Sessions in the next seven days, for the header figure. */
  sessionsThisWeek: number;
}

export async function earnings(): Promise<Earnings> {
  const today = nepalDateKey();
  const monthStart = dayStart(monthStartKey(today));
  const yearStart = dayStart(yearStartKey(today));

  // Pulled whole and split in memory: the arithmetic rules live in money.ts,
  // and at this volume one round trip beats six aggregate queries.
  const [payments, bookings, engagements, sessionsThisWeek] =
    await Promise.all([
      prisma.payment.findMany({ select: { amountNpr: true, receivedAt: true } }),
      prisma.booking.findMany({
        select: { bookingStatus: true, amountNpr: true },
      }),
      prisma.engagement.findMany({
        select: {
          status: true,
          feeNpr: true,
          amountPaidNpr: true,
          completedAt: true,
          createdAt: true,
        },
      }),
      prisma.booking.count({
        where: {
          startsAt: {
            gte: dayStart(today),
            lt: dayStart(addDays(today, 7)),
          },
          bookingStatus: { not: "CANCELLED" },
        },
      }),
    ]);

  const since = (from: Date) => ({
    payments: payments.filter((p) => paymentRevenueDate(p) >= from),
    engagements: engagements.filter((e) => engagementRevenueDate(e) >= from),
  });

  const month = since(monthStart);
  const year = since(yearStart);

  return {
    thisMonth: revenue(month.payments, month.engagements),
    thisYear: revenue(year.payments, year.engagements),
    allTime: revenue(payments, engagements),
    // Unpaid session time now counts as outstanding too, not just quoted
    // engagement work: a half-paid 30-hour package owes the balance.
    outstandingNpr: outstanding(engagements, bookings, payments),
    sessionsThisWeek,
  };
}

export interface ClientSummary {
  client: Client;
  bookingCount: number;
  engagementCount: number;
  /** Everything received from this client, both streams. */
  totalPaidNpr: number;
  outstandingNpr: number;
  /** Most recent session or engagement, for sorting and display. */
  lastActivity: Date | null;
}

export async function clientSummaries(): Promise<ClientSummary[]> {
  const clients = await prisma.client.findMany({
    include: { bookings: true, engagements: true, payments: true },
    orderBy: { updatedAt: "desc" },
  });

  return clients
    .map((c) => {
      const split = revenue(c.payments, c.engagements);
      const dates: Date[] = [
        ...c.bookings.map((b) => b.startsAt),
        ...c.engagements.map((e) => engagementRevenueDate(e)),
      ];
      return {
        client: c,
        bookingCount: c.bookings.length,
        engagementCount: c.engagements.length,
        totalPaidNpr: split.totalNpr,
        outstandingNpr: outstanding(c.engagements, c.bookings, c.payments),
        lastActivity: dates.length
          ? new Date(Math.max(...dates.map((d) => d.getTime())))
          : null,
      };
    })
    .sort(
      (a, b) =>
        (b.lastActivity?.getTime() ?? 0) - (a.lastActivity?.getTime() ?? 0),
    );
}

/** One client with everything attached, for the detail page. */
export async function clientDetail(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      bookings: { orderBy: { startsAt: "desc" } },
      engagements: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { receivedAt: "desc" } },
    },
  });
}

/**
 * Find or create the client behind an email.
 *
 * Always matches on the lowercased address: Client.email is unique, so two
 * spellings of one address would otherwise collide.
 */
export async function upsertClientByEmail(
  email: string,
  name: string,
): Promise<Client> {
  const normalised = email.trim().toLowerCase();
  return prisma.client.upsert({
    where: { email: normalised },
    update: {},
    create: { email: normalised, name: name.trim() },
  });
}
