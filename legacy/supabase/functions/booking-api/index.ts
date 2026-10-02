// ==========================================================================
// booking-api: Supabase Edge Function (version 2: paid bookings)
//
// Actions
//   create_hold     (public)  reserve 1-3 consecutive hours for 30 minutes
//   submit_payment  (public)  upload payment proof for a held booking
//   get_status      (public)  status page, needs reference + private token
//   update_booking  (admin)   confirm, reject, cancel or complete a booking
//
// Secrets (Dashboard -> Edge Functions -> Secrets):
//   RESEND_API_KEY   Resend key (required)
//   ADMIN_EMAIL      where "payment to verify" notices go (required)
//   FROM_EMAIL       e.g. "Sandip Paudel <bookings@sandipaudel.com.np>"
//   SITE_URL         e.g. https://sandipaudel.com.np
//   OFFICE_LOCATION  address used for in-person sessions (optional)
//   ALLOWED_ORIGINS  e.g. https://sandipaudel.com.np (optional)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// ==========================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const TZ = "Asia/Kathmandu";
const HOLD_MINUTES = 30;
const MAX_ACTIVE_PER_EMAIL = 3;
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

const env = (k: string, fallback = "") => Deno.env.get(k) ?? fallback;
const SUPABASE_URL = env("SUPABASE_URL");
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = env("RESEND_API_KEY");
const ADMIN_EMAIL = env("ADMIN_EMAIL");
const FROM_EMAIL = env("FROM_EMAIL", "Sandip Paudel <onboarding@resend.dev>");
const SITE_URL = env("SITE_URL", "https://sandipaudel.com.np").replace(/\/$/, "");
const OFFICE = env(
  "OFFICE_LOCATION",
  "Department of Finance, Lumbini Banijya Campus, Butwal, Rupandehi, Nepal",
);
const ALLOWED = env("ALLOWED_ORIGINS").split(",").map((s) => s.trim()).filter(Boolean);

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const LEVELS: Record<string, string> = {
  bachelor: "Bachelor",
  master: "Master",
  mphil: "MPhil",
  phd: "PhD",
};

// --------------------------------------------------------------------------
// HTTP helpers
// --------------------------------------------------------------------------
function corsHeaders(origin: string | null): Record<string, string> {
  const allow = ALLOWED.length === 0
    ? "*"
    : (origin && ALLOWED.includes(origin) ? origin : ALLOWED[0]);
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// --------------------------------------------------------------------------
// Text helpers
// --------------------------------------------------------------------------
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const npr = (n: number | string | null) =>
  "Rs. " + Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

function fmtRange(startIso: string, endIso: string) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(s);
  const t = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(d);
  return `${day}, ${t(s)} to ${t(e)} (Nepal time)`;
}

const modeLabel = (m: string) => (m === "in_person" ? "In person" : "Online");

function toBase64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

// Identify the file from its first bytes, not from its name.
function sniffFile(b: Uint8Array): { ext: string; type: string } | null {
  if (b.length > 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { ext: "png", type: "image/png" };
  }
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { ext: "jpg", type: "image/jpeg" };
  }
  if (b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) {
    return { ext: "pdf", type: "application/pdf" };
  }
  if (
    b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return { ext: "webp", type: "image/webp" };
  }
  return null;
}

// --------------------------------------------------------------------------
// Data helpers
// --------------------------------------------------------------------------
type Booking = {
  id: string;
  reference: string;
  access_token: string;
  service_id: string;
  level: string;
  hours: number;
  rate_npr: number;
  amount_npr: number;
  name: string;
  email: string;
  phone: string | null;
  affiliation: string | null;
  topic: string;
  stage: string | null;
  message: string | null;
  mode: string;
  status: string;
  hold_expires_at: string | null;
  transaction_id: string | null;
  proof_path: string | null;
  slot_conflict: boolean;
  admin_note: string | null;
};

async function loadBookingDetails(b: Booking) {
  const [{ data: rows }, { data: svc }] = await Promise.all([
    db.from("booking_slots").select("slot:slots(starts_at, duration_min)").eq("booking_id", b.id),
    db.from("services").select("name").eq("id", b.service_id).maybeSingle(),
  ]);
  const slots = ((rows ?? []) as { slot: { starts_at: string; duration_min: number } | null }[])
    .map((r) => r.slot)
    .filter((s): s is { starts_at: string; duration_min: number } => !!s)
    .sort((a, c) => a.starts_at.localeCompare(c.starts_at));
  const start = slots[0]?.starts_at ?? null;
  const last = slots[slots.length - 1];
  const end = last
    ? new Date(new Date(last.starts_at).getTime() + last.duration_min * 60000).toISOString()
    : null;
  return {
    serviceName: (svc as { name?: string } | null)?.name ?? b.service_id ?? "Consultation",
    start,
    end,
    when: start && end ? fmtRange(start, end) : "Time to be arranged",
  };
}

const statusLink = (b: Booking) =>
  `${SITE_URL}/booking-status.html?ref=${encodeURIComponent(b.reference)}&t=${b.access_token}`;

function gcalLink(serviceName: string, start: string, end: string, b: Booking, note: string) {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `${serviceName} with Sandip Paudel`,
    dates: `${f(start)}/${f(end)}`,
    details: `Booking ${b.reference}. Topic: ${b.topic}${note ? `\n\n${note}` : ""}`,
    location: b.mode === "in_person" ? OFFICE : "Online",
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

// --------------------------------------------------------------------------
// Email
// --------------------------------------------------------------------------
function layout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Arial,Helvetica,sans-serif;color:#374151">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px">
<tr><td style="background:#0a2540;border-radius:10px 10px 0 0;padding:18px 24px;color:#ffffff;font-family:Georgia,serif;font-size:17px">Sandip Paudel</td></tr>
<tr><td style="padding:28px 24px 8px">
<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:21px;color:#0a2540;font-weight:600">${esc(title)}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 24px 24px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb">
Assistant Professor of Finance, Lumbini Banijya Campus<br>
<a href="${esc(SITE_URL)}" style="color:#0a2540">${esc(SITE_URL.replace(/^https?:\/\//, ""))}</a>
</td></tr></table></td></tr></table></body></html>`;
}

function detailsTable(rows: [string, string][]) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0 20px;font-size:14px;border-collapse:collapse">
${rows.filter(([, v]) => v).map(([k, v]) =>
    `<tr><td style="padding:8px 12px 8px 0;color:#6b7280;vertical-align:top;white-space:nowrap;border-bottom:1px solid #f3f4f6">${esc(k)}</td><td style="padding:8px 0;color:#111827;border-bottom:1px solid #f3f4f6;white-space:pre-wrap">${esc(v)}</td></tr>`
  ).join("")}
</table>`;
}

const para = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${t}</p>`;
const button = (href: string, label: string) =>
  `<p style="margin:4px 0 20px"><a href="${esc(href)}" style="display:inline-block;background:#0a2540;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:6px;font-size:14px">${esc(label)}</a></p>`;

type Mail = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: string }[];
};

async function sendEmail(m: Mail) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [m.to],
      subject: m.subject,
      html: m.html,
      ...(m.replyTo ? { reply_to: m.replyTo } : {}),
      ...(m.attachments?.length ? { attachments: m.attachments } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function sendAll(msgs: Mail[]) {
  const results = await Promise.allSettled(msgs.map(sendEmail));
  const failed = results
    .map((r, i) => (r.status === "rejected" ? `${msgs[i].to}: ${r.reason}` : null))
    .filter(Boolean) as string[];
  if (failed.length) console.error("Email failures:", failed);
  return failed;
}

async function cancellationHtml() {
  const { data } = await db.from("payment_settings").select("refund_policy").eq("id", 1).maybeSingle();
  const policy = (data as { refund_policy?: string } | null)?.refund_policy;
  return `<div style="margin:4px 0 18px;padding:12px 14px;background:#f6f7f9;border-radius:6px;font-size:13px;line-height:1.55;color:#374151">
<strong style="color:#0a2540">Cancellation and refund</strong><br>${esc(policy || "To cancel, reply to this email with your booking reference.")}</div>`;
}

function summaryRows(b: Booking, serviceName: string, when: string): [string, string][] {
  return [
    ["Reference", b.reference],
    ["Service", serviceName],
    ["Level", LEVELS[b.level] ?? b.level ?? ""],
    ["When", when],
    ["Duration", `${b.hours} hour${b.hours > 1 ? "s" : ""}`],
    ["Format", modeLabel(b.mode)],
    ["Amount", npr(b.amount_npr)],
  ];
}

// --------------------------------------------------------------------------
// Action: create_hold (public)
// --------------------------------------------------------------------------
const HOLD_ERRORS: Record<string, [number, string]> = {
  SLOT_UNAVAILABLE: [409, "That time is no longer available. Please choose another."],
  SLOT_TAKEN: [409, "Someone has just reserved that time. Please choose another."],
  NOT_CONSECUTIVE: [409, "Those hours are not all available back to back. Choose fewer hours or another start time."],
  MODE_CONFLICT: [409, "Those hours have different formats (online and in person). Choose another start time."],
  NO_RATE: [400, "Sessions of that length are not available right now. Please choose another length."],
  NO_SERVICE: [400, "That service is not available right now. Please choose another."],
  INVALID_LEVEL: [400, "Choose your academic level."],
  INVALID_HOURS: [400, "Choose 1, 2 or 3 hours."],
};

async function createHold(p: Record<string, unknown>) {
  if (clean(p.website, 200)) throw new HttpError(400, "Your request could not be processed.");

  const slotId = clean(p.slot_id, 64);
  const hours = Number(p.hours);
  const serviceId = clean(p.service_id, 40);
  const level = clean(p.level, 20);
  const name = clean(p.name, 100);
  const email = clean(p.email, 200).toLowerCase();
  const topic = clean(p.topic, 200);

  if (!UUID_RE.test(slotId)) throw new HttpError(400, "Choose a time.");
  if (![1, 2, 3].includes(hours)) throw new HttpError(400, "Choose 1, 2 or 3 hours.");
  if (!serviceId) throw new HttpError(400, "Choose a service.");
  if (!LEVELS[level]) throw new HttpError(400, "Choose your academic level.");
  if (name.length < 2) throw new HttpError(400, "Enter your full name.");
  if (!EMAIL_RE.test(email)) throw new HttpError(400, "Enter a valid email address.");
  if (topic.length < 3) throw new HttpError(400, "Describe your research topic or assignment briefly.");

  const { count } = await db
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .in("status", ["held", "payment_submitted", "confirmed"]);
  if ((count ?? 0) >= MAX_ACTIVE_PER_EMAIL) {
    throw new HttpError(429, `You already have ${MAX_ACTIVE_PER_EMAIL} open bookings. Please wait until those are completed.`);
  }

  const { data, error } = await db.rpc("create_hold", {
    p_slot_id: slotId,
    p_hours: hours,
    p_service_id: serviceId,
    p_level: level,
    p_name: name,
    p_email: email,
    p_phone: clean(p.phone, 30),
    p_affiliation: clean(p.affiliation, 200),
    p_topic: topic,
    p_stage: clean(p.stage, 60),
    p_message: clean(p.message, 3000),
    p_mode: clean(p.mode, 20),
    p_hold_minutes: HOLD_MINUTES,
  });

  if (error) {
    const code = Object.keys(HOLD_ERRORS).find((k) => (error.message ?? "").includes(k));
    if (code) throw new HttpError(HOLD_ERRORS[code][0], HOLD_ERRORS[code][1]);
    throw error;
  }

  const b = data as Booking;
  const d = await loadBookingDetails(b);
  return {
    ok: true,
    reference: b.reference,
    token: b.access_token,
    amount_npr: b.amount_npr,
    rate_npr: b.rate_npr,
    hours: b.hours,
    mode: b.mode,
    hold_expires_at: b.hold_expires_at,
    service_name: d.serviceName,
    starts_at: d.start,
    ends_at: d.end,
  };
}

// --------------------------------------------------------------------------
// Access by reference + private token (status page and proof upload)
// --------------------------------------------------------------------------
async function findByToken(ref: string, token: string) {
  if (!ref || !UUID_RE.test(token)) throw new HttpError(404, "Booking not found. Check the link in your email.");
  await db.rpc("expire_stale_holds");
  const { data } = await db
    .from("bookings")
    .select("*")
    .eq("reference", ref)
    .eq("access_token", token)
    .maybeSingle<Booking>();
  if (!data) throw new HttpError(404, "Booking not found. Check the link in your email.");
  return data;
}

// --------------------------------------------------------------------------
// Action: submit_payment (public, multipart form)
// --------------------------------------------------------------------------
async function submitPayment(form: FormData) {
  const b = await findByToken(clean(form.get("reference"), 20), clean(form.get("token"), 64));

  if (b.status === "payment_submitted") {
    throw new HttpError(409, "Payment proof for this booking has already been received and is being reviewed.");
  }
  if (!["held", "expired"].includes(b.status)) {
    throw new HttpError(409, "This booking can no longer accept payment proof.");
  }

  const file = form.get("proof");
  if (!(file instanceof File) || file.size === 0) throw new HttpError(400, "Attach a screenshot or PDF of your payment.");
  if (file.size > MAX_PROOF_BYTES) throw new HttpError(400, "The file is larger than 5 MB. Please upload a smaller screenshot.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffFile(bytes);
  if (!kind) throw new HttpError(400, "Upload a JPG, PNG, WEBP or PDF file.");

  const path = `${b.id}/${Date.now()}.${kind.ext}`;
  const { error: upErr } = await db.storage
    .from("payment-proofs")
    .upload(path, bytes, { contentType: kind.type, upsert: false });
  if (upErr) throw upErr;

  // A late payment after the hold expired: try to get the same hours back.
  let conflict = false;
  if (b.status === "expired") {
    const { data: ok } = await db.rpc("reactivate_hold", { p_booking_id: b.id });
    conflict = ok !== true;
  }

  const { data: updated, error } = await db
    .from("bookings")
    .update({
      status: "payment_submitted",
      transaction_id: clean(form.get("transaction_id"), 100) || null,
      proof_path: path,
      payment_submitted_at: new Date().toISOString(),
      hold_expires_at: null,
      slot_conflict: conflict,
    })
    .eq("id", b.id)
    .select("*")
    .single<Booking>();
  if (error) throw error;

  const d = await loadBookingDetails(updated);
  const rows = summaryRows(updated, d.serviceName, d.when);

  const clientHtml = layout(
    "Payment received, awaiting confirmation",
    para(`Dear ${esc(updated.name)},`) +
      para(
        "Thank you. Your payment proof has been received. Your booking will be confirmed once the payment has been verified, and you will receive another email when that happens.",
      ) +
      detailsTable(rows) +
      button(statusLink(updated), "Check booking status") +
      para("Keep this email. The button above always shows the latest status of your booking.") +
      await cancellationHtml(),
  );

  const adminHtml = layout(
    "Payment to verify",
    para(`<strong>${esc(updated.name)}</strong> has booked and uploaded payment proof (attached).`) +
      (conflict
        ? para(
          `<strong style="color:#9f1239">Note:</strong> this payment arrived after the 30-minute hold expired and the time has since been taken by someone else. Arrange another time with the client, or refund.`,
        )
        : "") +
      detailsTable([
        ...rows,
        ["Transaction ID", updated.transaction_id ?? ""],
        ["Email", updated.email],
        ["Phone", updated.phone ?? ""],
        ["Institution", updated.affiliation ?? ""],
        ["Stage", updated.stage ?? ""],
        ["Topic", updated.topic],
        ["Message", updated.message ?? ""],
      ]) +
      button(`${SITE_URL}/admin.html`, "Verify in admin page"),
  );

  const msgs: Mail[] = [{
    to: updated.email,
    subject: `Payment received for booking ${updated.reference}`,
    html: clientHtml,
    replyTo: ADMIN_EMAIL || undefined,
  }];
  if (ADMIN_EMAIL) {
    msgs.push({
      to: ADMIN_EMAIL,
      subject: `Verify payment: ${updated.reference}, ${npr(updated.amount_npr)}, ${updated.name}`,
      html: adminHtml,
      replyTo: updated.email,
      attachments: [{ filename: `payment-${updated.reference}.${kind.ext}`, content: toBase64(bytes) }],
    });
  }
  const failures = await sendAll(msgs);
  return { ok: true, status: updated.status, email_warning: failures.length > 0 };
}

// --------------------------------------------------------------------------
// Action: get_status (public)
// --------------------------------------------------------------------------
async function getStatus(p: Record<string, unknown>) {
  const b = await findByToken(clean(p.reference, 20), clean(p.token, 64));
  const d = await loadBookingDetails(b);
  const showNote = ["confirmed", "rejected", "cancelled", "completed"].includes(b.status);
  return {
    ok: true,
    booking: {
      reference: b.reference,
      status: b.status,
      name: b.name,
      service_name: d.serviceName,
      level: b.level,
      hours: b.hours,
      rate_npr: b.rate_npr,
      amount_npr: b.amount_npr,
      mode: b.mode,
      topic: b.topic,
      starts_at: d.start,
      ends_at: d.end,
      hold_expires_at: b.hold_expires_at,
      transaction_id: b.transaction_id,
      note: showNote ? b.admin_note : null,
      calendar_link: b.status === "confirmed" && d.start && d.end
        ? gcalLink(d.serviceName, d.start, d.end, b, b.admin_note ?? "")
        : null,
      location: b.mode === "in_person" ? OFFICE : null,
    },
  };
}

// --------------------------------------------------------------------------
// Action: update_booking (admin only)
// --------------------------------------------------------------------------
async function requireAdmin(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Please sign in.");
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user?.email) throw new HttpError(401, "Please sign in again.");
  const { data: admin } = await db.from("admins").select("email").ilike("email", data.user.email).maybeSingle();
  if (!admin) throw new HttpError(403, "This account is not an admin.");
}

const ALLOWED_FROM: Record<string, string[]> = {
  confirmed: ["held", "payment_submitted", "expired", "pending"],
  rejected: ["held", "payment_submitted", "expired", "pending"],
  cancelled: ["held", "payment_submitted", "confirmed", "pending"],
  completed: ["confirmed"],
};

async function updateBooking(req: Request, p: Record<string, unknown>) {
  await requireAdmin(req);

  const id = clean(p.booking_id, 64);
  const status = clean(p.status, 20);
  const note = clean(p.note, 2000);
  const notify = p.notify !== false;

  if (!ALLOWED_FROM[status]) throw new HttpError(400, "Unknown action.");

  const { data: current } = await db.from("bookings").select("*").eq("id", id).maybeSingle<Booking>();
  if (!current) throw new HttpError(404, "Booking not found.");
  if (!ALLOWED_FROM[status].includes(current.status)) {
    throw new HttpError(409, `A booking that is "${current.status.replace("_", " ")}" cannot be changed to "${status}".`);
  }

  // Confirming a booking whose hours were released: take them back first.
  if (status === "confirmed" && (current.slot_conflict || current.status === "expired")) {
    const { data: ok } = await db.rpc("reactivate_hold", { p_booking_id: id });
    if (ok !== true) {
      throw new HttpError(409, "This time has been taken by another booking. Cancel this one (and refund), or ask the client to book another time.");
    }
  }

  const { data: b, error } = await db
    .from("bookings")
    .update({
      status,
      ...(note ? { admin_note: note } : {}),
      ...(status === "confirmed" ? { slot_conflict: false, hold_expires_at: null } : {}),
    })
    .eq("id", id)
    .select("*")
    .single<Booking>();
  if (error) throw error;

  let failures: string[] = [];
  if (notify && status !== "completed") {
    const d = await loadBookingDetails(b);
    const rows = summaryRows(b, d.serviceName, d.when);
    const statusPara = para(`<a href="${esc(statusLink(b))}" style="color:#0a2540">View booking status</a>`);
    let subject = "";
    let html = "";

    if (status === "confirmed") {
      subject = `Booking confirmed: ${b.reference}`;
      html = layout(
        "Your booking is confirmed",
        para(`Dear ${esc(b.name)},`) +
          para("Your payment has been verified and your consultation is confirmed.") +
          detailsTable([
            ...rows,
            ["Where", b.mode === "in_person" ? OFFICE : "Online"],
            ["Note", note],
          ]) +
          (d.start && d.end ? button(gcalLink(d.serviceName, d.start, d.end, b, note), "Add to Google Calendar") : "") +
          para(
            "Please send or bring any drafts, data or questions you would like to discuss.",
          ) + await cancellationHtml() + statusPara,
      );
    } else if (status === "rejected") {
      subject = `Payment not accepted: ${b.reference}`;
      html = layout(
        "Your payment could not be verified",
        para(`Dear ${esc(b.name)},`) +
          para("Unfortunately the payment for this booking could not be verified, so the booking has not been confirmed and the time has been released.") +
          detailsTable([...rows, ["Reason", note]]) +
          para("If you believe this is a mistake, reply to this email with your payment details.") +
          button(`${SITE_URL}/booking.html`, "Book again") + statusPara,
      );
    } else {
      subject = `Booking cancelled: ${b.reference}`;
      html = layout(
        "Your booking has been cancelled",
        para(`Dear ${esc(b.name)},`) +
          para("This booking has been cancelled.") +
          detailsTable([...rows, ["Reason", note]]) +
          para("If you had already paid, you will be contacted about a refund or another time.") +
          button(`${SITE_URL}/booking.html`, "Choose another time") + statusPara,
      );
    }
    failures = await sendAll([{ to: b.email, subject, html, replyTo: ADMIN_EMAIL || undefined }]);
  }

  return { ok: true, booking: b, email_warning: failures.length > 0 };
}

// --------------------------------------------------------------------------
// Router
// --------------------------------------------------------------------------
Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  try {
    const type = req.headers.get("content-type") ?? "";
    let result;
    if (type.includes("multipart/form-data")) {
      const form = await req.formData();
      if (form.get("action") !== "submit_payment") throw new HttpError(400, "Unknown action.");
      result = await submitPayment(form);
    } else {
      const body = await req.json().catch(() => ({}));
      switch (body?.action) {
        case "create_hold": result = await createHold(body); break;
        case "get_status": result = await getStatus(body); break;
        case "update_booking": result = await updateBooking(req, body); break;
        default: throw new HttpError(400, "Unknown action.");
      }
    }
    return json(result, 200, origin);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status, origin);
    console.error(err);
    return json({ error: "Something went wrong on the server. Please try again." }, 500, origin);
  }
});
