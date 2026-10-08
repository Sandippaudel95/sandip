-- ==========================================================================
-- Research consultation booking system: database schema (version 2)
-- Paid, per-hour bookings with QR payment and admin verification.
--
-- Run this in Supabase: Dashboard -> SQL Editor -> New query -> paste the
-- whole file -> Run.
--
-- Safe to run on a new project AND to re-run over the earlier version:
-- existing slots, bookings and admins are kept.
-- ==========================================================================


-- 1. ADMINS ----------------------------------------------------------------
create table if not exists public.admins (
    email text primary key
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.admins
        where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;


-- 2. SERVICES AND HOURLY RATES --------------------------------------------
create table if not exists public.services (
    id          text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
    name        text not null check (char_length(name) between 2 and 80),
    description text check (char_length(description) <= 400),
    sort_order  integer not null default 0,
    is_active   boolean not null default true,
    created_at  timestamptz not null default now()
);

-- Per-level hourly rates. Not used for pricing any more (fees now depend
-- only on session length, see duration_prices below); kept so that
-- level-based pricing can be switched back on later without data loss.
create table if not exists public.service_rates (
    service_id text not null references public.services(id) on delete cascade on update cascade,
    level      text not null check (level in ('bachelor', 'master', 'mphil', 'phd')),
    rate_npr   numeric(10, 2) check (rate_npr is null or rate_npr >= 0),
    primary key (service_id, level)
);

insert into public.services (id, name, description, sort_order) values
    ('research-consultation', 'Research consultation',
     'Focused advice on a specific research question: design, methods, data analysis, or interpreting results.', 1),
    ('proposal-writing', 'Proposal writing consultation',
     'Help shaping a thesis or research proposal: problem statement, objectives, literature review, and methodology.', 2),
    ('research-supervision', 'Detailed research supervision',
     'In-depth, step-by-step guidance through your thesis or research project, one session at a time.', 3),
    ('assignment-consultation', 'Assignment consultation',
     'Guidance on understanding, structuring, and improving course assignments and research reports.', 4)
on conflict (id) do nothing;

insert into public.service_rates (service_id, level, rate_npr)
select s.id, l.level, null
from public.services s
cross join (values ('bachelor'), ('master'), ('mphil'), ('phd')) as l(level)
on conflict do nothing;


-- Session fees by length (same for every service and level).
-- Edit these on the admin page ("Services and fees" tab).
create table if not exists public.duration_prices (
    hours     integer primary key check (hours between 1 and 3),
    price_npr numeric(10, 2) check (price_npr is null or price_npr >= 0)
);
insert into public.duration_prices (hours, price_npr) values
    (1, 5000), (2, 7000), (3, 10000)
on conflict (hours) do nothing;


-- 3. PAYMENT DETAILS SHOWN TO VISITORS --------------------------------------
create table if not exists public.payment_settings (
    id             integer primary key default 1 check (id = 1),
    account_name   text check (char_length(account_name) <= 120),
    bank_name      text check (char_length(bank_name) <= 120),
    account_number text check (char_length(account_number) <= 60),
    instructions   text check (char_length(instructions) <= 1000),
    refund_policy  text check (char_length(refund_policy) <= 2000),
    qr_url         text,
    qr_path        text,
    updated_at     timestamptz not null default now()
);
insert into public.payment_settings (id) values (1) on conflict (id) do nothing;
update public.payment_settings
set refund_policy = 'Full refund if you cancel at least 24 hours before your session. If you cancel less than 24 hours before the session, 50% of the fee is refunded. To cancel or request a refund, email sandip.paudel@lbc.edu.np with your booking reference.'
where id = 1 and refund_policy is null;


-- 4. TIME SLOTS (one-hour blocks) --------------------------------------------
create table if not exists public.slots (
    id           uuid primary key default gen_random_uuid(),
    starts_at    timestamptz not null,
    duration_min integer     not null default 60 check (duration_min between 15 and 240),
    mode         text        not null default 'either'
                 check (mode in ('online', 'in_person', 'either')),
    is_active    boolean     not null default true,
    created_at   timestamptz not null default now(),
    unique (starts_at)
);
create index if not exists slots_starts_at_idx on public.slots (starts_at);


-- 5. BOOKINGS ---------------------------------------------------------------
-- Status flow:
--   held               time reserved, waiting for payment (30 minutes)
--   payment_submitted  proof uploaded, waiting for you to verify
--   confirmed          you verified the payment
--   completed          session done
--   rejected           payment not accepted
--   cancelled          cancelled by you
--   expired            no payment proof within the hold time
create table if not exists public.bookings (
    id                   uuid primary key default gen_random_uuid(),
    slot_id              uuid references public.slots(id) on delete restrict,   -- first hour
    reference            text,
    access_token         uuid not null default gen_random_uuid(),
    service_id           text references public.services(id) on update cascade,
    level                text,
    hours                integer,
    rate_npr             numeric(10, 2),
    amount_npr           numeric(10, 2),
    name                 text not null check (char_length(name) between 2 and 100),
    email                text not null check (char_length(email) <= 200),
    phone                text check (char_length(phone) <= 30),
    affiliation          text check (char_length(affiliation) <= 200),
    topic                text not null check (char_length(topic) between 3 and 200),
    stage                text check (char_length(stage) <= 60),
    message              text check (char_length(message) <= 3000),
    mode                 text not null check (mode in ('online', 'in_person')),
    status               text not null default 'held',
    hold_expires_at      timestamptz,
    transaction_id       text check (char_length(transaction_id) <= 100),
    proof_path           text,
    payment_submitted_at timestamptz,
    slot_conflict        boolean not null default false,
    admin_note           text check (char_length(admin_note) <= 2000),
    created_at           timestamptz not null default now(),
    updated_at           timestamptz not null default now()
);

-- Upgrade path from version 1 (adds new columns if they are missing).
alter table public.bookings add column if not exists reference text;
alter table public.bookings add column if not exists access_token uuid not null default gen_random_uuid();
alter table public.bookings add column if not exists service_id text references public.services(id) on update cascade;
alter table public.bookings add column if not exists level text;
alter table public.bookings add column if not exists hours integer;
alter table public.bookings add column if not exists rate_npr numeric(10, 2);
alter table public.bookings add column if not exists amount_npr numeric(10, 2);
alter table public.bookings add column if not exists hold_expires_at timestamptz;
alter table public.bookings add column if not exists transaction_id text;
alter table public.bookings add column if not exists proof_path text;
alter table public.bookings add column if not exists payment_submitted_at timestamptz;
alter table public.bookings add column if not exists slot_conflict boolean not null default false;
alter table public.bookings alter column slot_id drop not null;
alter table public.bookings alter column status set default 'held';

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check check (status in
    ('held', 'payment_submitted', 'confirmed', 'completed', 'rejected', 'cancelled', 'expired', 'pending'));

alter table public.bookings drop constraint if exists bookings_level_check;
alter table public.bookings add constraint bookings_level_check
    check (level is null or level in ('bachelor', 'master', 'mphil', 'phd'));

alter table public.bookings drop constraint if exists bookings_hours_check;
alter table public.bookings add constraint bookings_hours_check
    check (hours is null or hours between 1 and 3);

create unique index if not exists bookings_reference_key on public.bookings (reference);
create index if not exists bookings_status_idx on public.bookings (status);


-- 6. WHICH HOURS EACH BOOKING OCCUPIES --------------------------------------
create table if not exists public.booking_slots (
    booking_id uuid not null references public.bookings(id) on delete cascade,
    slot_id    uuid not null references public.slots(id) on delete restrict,
    released   boolean not null default false,
    primary key (booking_id, slot_id)
);

-- Version 1 used one slot per booking; copy those links over, then
-- remove the old one-booking-per-slot index.
insert into public.booking_slots (booking_id, slot_id, released)
select b.id, b.slot_id, b.status not in ('pending', 'confirmed', 'held', 'payment_submitted')
from public.bookings b
where b.slot_id is not null
on conflict do nothing;

drop index if exists public.bookings_one_active_per_slot;

-- The key rule: an hour can belong to only ONE active booking.
create unique index if not exists booking_slots_one_active
    on public.booking_slots (slot_id)
    where not released;


-- 7. AUTOMATIC HOUSEKEEPING -------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch
    before update on public.bookings
    for each row execute function public.touch_updated_at();

-- When a booking is rejected, cancelled or expires, free its hours.
create or replace function public.release_booking_slots()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if new.status in ('rejected', 'cancelled', 'expired')
       and old.status is distinct from new.status then
        update public.booking_slots set released = true where booking_id = new.id;
    end if;
    return new;
end;
$$;

drop trigger if exists bookings_release on public.bookings;
create trigger bookings_release
    after update of status on public.bookings
    for each row execute function public.release_booking_slots();

-- Unpaid holds older than their expiry time become 'expired'.
create or replace function public.expire_stale_holds()
returns void language sql security definer set search_path = public as $$
    update public.bookings
    set status = 'expired'
    where status = 'held' and hold_expires_at < now();
$$;


-- 8. PUBLIC: list open hours -------------------------------------------------
-- Minimum notice: hours starting within the next 12 hours are hidden.
create or replace function public.get_available_slots()
returns table (id uuid, starts_at timestamptz, duration_min integer, mode text)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
    perform public.expire_stale_holds();
    return query
        select s.id, s.starts_at, s.duration_min, s.mode
        from public.slots s
        where s.is_active
          and s.starts_at > now() + interval '12 hours'
          and not exists (
              select 1 from public.booking_slots bs
              where bs.slot_id = s.id and not bs.released
          )
        order by s.starts_at
        limit 1000;
end;
$$;


-- 9. SERVER ONLY: reserve hours for a new booking --------------------------
-- Called by the booking-api Edge Function. Everything happens in one
-- transaction, so two visitors can never hold the same hour.
create or replace function public.create_hold(
    p_slot_id      uuid,
    p_hours        integer,
    p_service_id   text,
    p_level        text,
    p_name         text,
    p_email        text,
    p_phone        text,
    p_affiliation  text,
    p_topic        text,
    p_stage        text,
    p_message      text,
    p_mode         text,
    p_hold_minutes integer default 30
)
returns public.bookings
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
    v_first  public.slots;
    v_next   public.slots;
    v_rate   numeric;
    v_ids    uuid[];
    v_fixed  text := null;
    v_mode   text;
    v_ref    text;
    v_b      public.bookings;
    i        integer;
begin
    perform public.expire_stale_holds();

    if p_hours is null or p_hours < 1 or p_hours > 3 then
        raise exception 'INVALID_HOURS';
    end if;

    select * into v_first from public.slots
    where id = p_slot_id and is_active and starts_at > now() + interval '12 hours';
    if not found then
        raise exception 'SLOT_UNAVAILABLE';
    end if;

    if not exists (select 1 from public.services where id = p_service_id and is_active) then
        raise exception 'NO_SERVICE';
    end if;
    if p_level is null or p_level not in ('bachelor', 'master', 'mphil', 'phd') then
        raise exception 'INVALID_LEVEL';
    end if;

    -- The fee depends only on the session length.
    select price_npr into v_rate
    from public.duration_prices
    where hours = p_hours and price_npr is not null;
    if v_rate is null then
        raise exception 'NO_RATE';
    end if;

    v_ids := array[v_first.id];
    if v_first.mode <> 'either' then v_fixed := v_first.mode; end if;

    for i in 1 .. p_hours - 1 loop
        select * into v_next from public.slots
        where is_active
          and starts_at = v_first.starts_at + make_interval(mins => v_first.duration_min * i);
        if not found then
            raise exception 'NOT_CONSECUTIVE';
        end if;
        if v_next.mode <> 'either' then
            if v_fixed is not null and v_fixed <> v_next.mode then
                raise exception 'MODE_CONFLICT';
            end if;
            v_fixed := v_next.mode;
        end if;
        v_ids := v_ids || v_next.id;
    end loop;

    v_mode := coalesce(v_fixed, p_mode);
    if v_mode not in ('online', 'in_person') then v_mode := 'online'; end if;

    loop
        v_ref := 'SP-' || lpad((floor(random() * 1000000))::integer::text, 6, '0');
        exit when not exists (select 1 from public.bookings where reference = v_ref);
    end loop;

    begin
        insert into public.bookings (
            slot_id, reference, service_id, level, hours, rate_npr, amount_npr,
            name, email, phone, affiliation, topic, stage, message, mode,
            status, hold_expires_at
        ) values (
            v_first.id, v_ref, p_service_id, p_level, p_hours, round(v_rate / p_hours, 2), v_rate,
            p_name, p_email, nullif(p_phone, ''), nullif(p_affiliation, ''), p_topic,
            nullif(p_stage, ''), nullif(p_message, ''), v_mode,
            'held', now() + make_interval(mins => p_hold_minutes)
        )
        returning * into v_b;

        insert into public.booking_slots (booking_id, slot_id)
        select v_b.id, unnest(v_ids);
    exception when unique_violation then
        raise exception 'SLOT_TAKEN';
    end;

    return v_b;
end;
$$;

-- Server only: try to re-reserve the hours of an expired hold when late
-- payment proof arrives. Returns false if someone else took them.
create or replace function public.reactivate_hold(p_booking_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
    update public.booking_slots set released = false where booking_id = p_booking_id;
    return true;
exception when unique_violation then
    return false;
end;
$$;

revoke all on function public.get_available_slots() from public;
grant execute on function public.get_available_slots() to anon, authenticated;

revoke all on function public.create_hold(uuid, integer, text, text, text, text, text, text, text, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.reactivate_hold(uuid) from public, anon, authenticated;
revoke all on function public.expire_stale_holds() from public, anon, authenticated;


-- 10. ROW LEVEL SECURITY ----------------------------------------------------
alter table public.admins           enable row level security;
alter table public.services         enable row level security;
alter table public.service_rates    enable row level security;
alter table public.payment_settings enable row level security;
alter table public.duration_prices  enable row level security;
alter table public.slots            enable row level security;
alter table public.bookings         enable row level security;
alter table public.booking_slots    enable row level security;

drop policy if exists "admins read own row" on public.admins;
create policy "admins read own row" on public.admins
    for select to authenticated using (public.is_admin());

-- Services, rates and payment details are public (visitors must see them).
drop policy if exists "public read services" on public.services;
create policy "public read services" on public.services
    for select to anon, authenticated using (true);
drop policy if exists "admins manage services" on public.services;
create policy "admins manage services" on public.services
    for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read rates" on public.service_rates;
create policy "public read rates" on public.service_rates
    for select to anon, authenticated using (true);
drop policy if exists "admins manage rates" on public.service_rates;
create policy "admins manage rates" on public.service_rates
    for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read fees" on public.duration_prices;
create policy "public read fees" on public.duration_prices
    for select to anon, authenticated using (true);
drop policy if exists "admins manage fees" on public.duration_prices;
create policy "admins manage fees" on public.duration_prices
    for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read payment settings" on public.payment_settings;
create policy "public read payment settings" on public.payment_settings
    for select to anon, authenticated using (true);
drop policy if exists "admins manage payment settings" on public.payment_settings;
create policy "admins manage payment settings" on public.payment_settings
    for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Slots and bookings: admins only. Visitors use the functions above.
drop policy if exists "admins manage slots" on public.slots;
create policy "admins manage slots" on public.slots
    for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins read bookings" on public.bookings;
create policy "admins read bookings" on public.bookings
    for select to authenticated using (public.is_admin());
drop policy if exists "admins update bookings" on public.bookings;
create policy "admins update bookings" on public.bookings
    for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins read booking slots" on public.booking_slots;
create policy "admins read booking slots" on public.booking_slots
    for select to authenticated using (public.is_admin());


-- 11. FILE STORAGE ------------------------------------------------------------
-- payment-qr:     your QR code image, public so visitors can see it
-- payment-proofs: visitors' payment screenshots, PRIVATE (admins only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('payment-qr', 'payment-qr', true, 2097152,
     array['image/png', 'image/jpeg', 'image/webp']),
    ('payment-proofs', 'payment-proofs', false, 5242880,
     array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "admins manage payment qr" on storage.objects;
create policy "admins manage payment qr" on storage.objects
    for all to authenticated
    using (bucket_id = 'payment-qr' and public.is_admin())
    with check (bucket_id = 'payment-qr' and public.is_admin());

drop policy if exists "admins read payment proofs" on storage.objects;
create policy "admins read payment proofs" on storage.objects
    for select to authenticated
    using (bucket_id = 'payment-proofs' and public.is_admin());


-- 12. YOUR ADMIN EMAIL --------------------------------------------------------
-- Change the address to the one you sign in with on the admin page.
insert into public.admins (email)
values ('sandip.paudel@lbc.edu.np')
on conflict (email) do nothing;
