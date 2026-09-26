/* ==========================================================================
   Consultation admin page
     - verify payment proofs, confirm or reject bookings
     - manage one-hour time slots
     - edit services and session fees (1, 2 or 3 hours)
     - upload the payment QR code and bank details shown to visitors
   ========================================================================== */
(function () {
    'use strict';

    var CFG = window.BOOKING_CONFIG || {};
    var TZ = CFG.timezone || 'Asia/Kathmandu';
    var FN = CFG.functionName || 'booking-api';
    var CONFIGURED = !!CFG.supabaseUrl && !!CFG.supabaseKey && !/YOUR-/.test(CFG.supabaseUrl + CFG.supabaseKey);
    // Read before Supabase clears the URL: are we arriving from a reset email?
    var RECOVERY = /type=recovery/.test(location.hash);
    var client = (CONFIGURED && window.supabase) ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey) : null;

    var LEVEL_LABEL = { bachelor: 'Bachelor', master: 'Master', mphil: 'MPhil', phd: 'PhD' };

    var $ = function (id) { return document.getElementById(id); };

    // ---------------------------------------------------------------
    // Formatting
    // ---------------------------------------------------------------
    var fmtKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
    var fmtDay = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    var fmtDayLong = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
    var fmtTime = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
    var fmtStamp = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function npr(n) { return 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
    function modeText(m) { return m === 'in_person' ? 'In person' : (m === 'online' ? 'Online' : 'Online or in person'); }
    var STATUS_TEXT = {
        held: 'Awaiting payment', payment_submitted: 'Payment to verify', pending: 'Awaiting approval',
        confirmed: 'Confirmed', completed: 'Completed', rejected: 'Payment rejected', cancelled: 'Cancelled', expired: 'Hold expired'
    };

    function tzOffsetMinutes(tz, date) {
        var parts = new Intl.DateTimeFormat('en-US', {
            timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        }).formatToParts(date).reduce(function (a, p) { a[p.type] = p.value; return a; }, {});
        return Math.round((Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute) - date.getTime()) / 60000);
    }
    function toISO(dateKey, hhmm) {
        var off = tzOffsetMinutes(TZ, new Date(dateKey + 'T12:00:00Z'));
        var sign = off >= 0 ? '+' : '-', a = Math.abs(off);
        return new Date(dateKey + 'T' + hhmm + ':00' + sign + pad(Math.floor(a / 60)) + ':' + pad(a % 60)).toISOString();
    }
    function slugify(name) {
        return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 34) || 'service';
    }

    var toastTimer;
    function toast(msg, isError) {
        var t = $('toast');
        t.textContent = msg;
        t.className = 'toast show' + (isError ? ' error' : '');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.className = 'toast' + (isError ? ' error' : ''); }, isError ? 7000 : 3500);
    }

    // ---------------------------------------------------------------
    // Data layer
    // ---------------------------------------------------------------
    function unwrap(res) { if (res.error) throw res.error; return res.data; }

    // Adds .start/.end/.service_name to a booking row from its hours.
    function shapeBooking(b) {
        var slots = (b.booking_slots || []).map(function (x) { return x.slot; }).filter(Boolean)
            .sort(function (a, c) { return a.starts_at < c.starts_at ? -1 : 1; });
        var last = slots[slots.length - 1];
        b.start = slots.length ? slots[0].starts_at : null;
        b.end = last ? new Date(new Date(last.starts_at).getTime() + last.duration_min * 60000).toISOString() : null;
        b.service_name = (b.service && b.service.name) || b.service_id || 'Consultation';
        return b;
    }

    var api = {
        listBookings: function () {
            return client.from('bookings')
                .select('*, service:services(name), booking_slots(released, slot:slots(starts_at, duration_min))')
                .order('created_at', { ascending: false })
                .limit(1000)
                .then(unwrap)
                .then(function (rows) { return rows.map(shapeBooking); });
        },
        listSlots: function () {
            return client.from('slots')
                .select('*, booking_slots(released, booking:bookings(name, status))')
                .gte('starts_at', new Date(Date.now() - 86400000).toISOString())
                .order('starts_at', { ascending: true })
                .limit(1500)
                .then(unwrap);
        },
        addSlots: function (rows) {
            return client.from('slots').upsert(rows, { onConflict: 'starts_at', ignoreDuplicates: true }).select('id').then(unwrap);
        },
        setSlotActive: function (id, active) { return client.from('slots').update({ is_active: active }).eq('id', id).then(unwrap); },
        deleteSlot: function (id) { return client.from('slots').delete().eq('id', id).then(unwrap); },
        updateBooking: function (id, status, note, notify) {
            return client.functions.invoke(FN, {
                body: { action: 'update_booking', booking_id: id, status: status, note: note, notify: notify }
            }).then(function (res) {
                if (!res.error) return res.data;
                var ctx = res.error.context;
                if (ctx && typeof ctx.json === 'function') {
                    return ctx.json().then(function (b) { throw new Error((b && b.error) || 'Update failed.'); },
                                           function () { throw new Error('Update failed.'); });
                }
                throw new Error('Could not reach the booking service.');
            });
        },
        proofUrl: function (path) {
            return client.storage.from('payment-proofs').createSignedUrl(path, 600).then(function (res) {
                if (res.error) throw res.error;
                return res.data.signedUrl;
            });
        },
        listServices: function () {
            return client.from('services').select('*').order('sort_order').then(unwrap);
        },
        saveService: function (svc) {
            return client.from('services').upsert(svc).then(unwrap);
        },
        listFees: function () {
            return client.from('duration_prices').select('hours, price_npr').order('hours').then(unwrap).then(function (rows) {
                var fees = { 1: null, 2: null, 3: null };
                rows.forEach(function (r) { fees[r.hours] = r.price_npr == null ? null : Number(r.price_npr); });
                return fees;
            });
        },
        saveFees: function (fees) {
            var rows = [1, 2, 3].map(function (h) { return { hours: h, price_npr: fees[h] }; });
            return client.from('duration_prices').upsert(rows, { onConflict: 'hours' }).then(unwrap);
        },
        getPaymentSettings: function () {
            return client.from('payment_settings').select('*').eq('id', 1).maybeSingle().then(unwrap).then(function (d) { return d || {}; });
        },
        savePaymentSettings: function (fields) {
            fields.id = 1;
            fields.updated_at = new Date().toISOString();
            return client.from('payment_settings').upsert(fields).then(unwrap);
        },
        uploadQr: function (file, oldPath) {
            var ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type] || 'png';
            var path = 'qr-' + Date.now() + '.' + ext;
            var bucket = client.storage.from('payment-qr');
            return bucket.upload(path, file, { contentType: file.type, upsert: false, cacheControl: '3600' }).then(function (res) {
                if (res.error) throw res.error;
                var url = bucket.getPublicUrl(path).data.publicUrl;
                return api.savePaymentSettings({ qr_url: url, qr_path: path }).then(function () {
                    if (oldPath) bucket.remove([oldPath]);
                    return url;
                });
            });
        },
        removeQr: function (oldPath) {
            return api.savePaymentSettings({ qr_url: null, qr_path: null }).then(function () {
                if (oldPath) return client.storage.from('payment-qr').remove([oldPath]);
            });
        }
    };

    // ---------------------------------------------------------------
    // Boot and sign-in
    // ---------------------------------------------------------------
    var state = { tab: 'verify', bookings: [], slots: [], services: null, settings: null };

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.tab').forEach(function (t) {
            t.addEventListener('click', function () { setTab(t.getAttribute('data-tab')); });
        });
        $('refreshBtn').addEventListener('click', function () { refresh(true); });
        $('loginForm').addEventListener('submit', onLogin);
        $('resetForm').addEventListener('submit', onResetPassword);
        $('forgotBtn').addEventListener('click', onForgot);
        $('signOut').addEventListener('click', function () { if (client) client.auth.signOut().then(function () { location.reload(); }); });
        $('dlgCancel').addEventListener('click', function () { $('actionDialog').close(); });

        if (!client) {
            showOnly('loginView');
            $('lSubmit').disabled = true;
            return setLoginStatus(CONFIGURED
                ? 'The sign-in service could not load. Check your connection and refresh.'
                : 'Booking is not connected yet. Fill in assets/js/booking-config.js (see SETUP.md, step 1).', 'error');
        }
        client.auth.onAuthStateChange(function (event) { if (event === 'PASSWORD_RECOVERY') showOnly('resetView'); });
        client.auth.getSession().then(function (res) {
            var session = res.data && res.data.session;
            if (RECOVERY) return showOnly('resetView');
            if (session) checkAdmin(session.user.email); else showOnly('loginView');
        });
    });

    function showOnly(id) {
        ['loginView', 'resetView', 'dashView'].forEach(function (v) { $(v).hidden = v !== id; });
        $('adminUser').hidden = id !== 'dashView';
    }
    function setLoginStatus(msg, type) { var s = $('lStatus'); s.textContent = msg || ''; s.className = 'form-status' + (type ? ' ' + type : ''); }

    function onLogin(e) {
        e.preventDefault();
        var email = $('lEmail').value.trim(), pw = $('lPassword').value;
        if (!email || !pw) return setLoginStatus('Enter your email and password.', 'error');
        $('lSubmit').disabled = true;
        setLoginStatus('Signing in…');
        client.auth.signInWithPassword({ email: email, password: pw }).then(function (res) {
            if (res.error) throw res.error;
            return checkAdmin(res.data.user.email);
        }).catch(function (err) {
            setLoginStatus(/invalid/i.test(err.message) ? 'That email and password do not match an admin account.' : err.message, 'error');
        }).then(function () { $('lSubmit').disabled = false; });
    }

    function onForgot() {
        var email = $('lEmail').value.trim();
        if (!email) { $('lEmail').focus(); return setLoginStatus('Enter your email above, then click "Forgot your password?" again.', 'error'); }
        client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }).then(function (res) {
            if (res.error) throw res.error;
            setLoginStatus('If that email has an admin account, a reset link is on its way.', 'success');
        }).catch(function (err) { setLoginStatus(err.message, 'error'); });
    }

    function onResetPassword(e) {
        e.preventDefault();
        var pw = $('rPassword').value, s = $('rStatus');
        if (pw.length < 8) { s.textContent = 'Use at least 8 characters.'; s.className = 'form-status error'; return; }
        client.auth.updateUser({ password: pw }).then(function (res) {
            if (res.error) throw res.error;
            history.replaceState(null, '', location.pathname);
            return checkAdmin(res.data.user.email);
        }).catch(function (err) { s.textContent = err.message; s.className = 'form-status error'; });
    }

    function checkAdmin(email) {
        return client.from('admins').select('email').limit(1).then(function (res) {
            if (res.error || !res.data || !res.data.length) {
                return client.auth.signOut().then(function () {
                    showOnly('loginView');
                    setLoginStatus('This account is not on the admin list. Add its email to the admins table in Supabase.', 'error');
                });
            }
            showDash(email);
        });
    }

    function showDash(email) {
        showOnly('dashView');
        $('adminEmail').textContent = email;
        refresh();
    }

    function refresh(announce) {
        return Promise.all([api.listBookings(), api.listSlots()]).then(function (r) {
            state.bookings = r[0] || [];
            state.slots = r[1] || [];
            render();
            if (announce) toast('Up to date');
        }).catch(function (err) {
            console.error(err);
            toast('Could not load data: ' + (err.message || err), true);
        });
    }

    function setTab(tab) {
        state.tab = tab;
        document.querySelectorAll('.tab').forEach(function (t) {
            t.setAttribute('aria-selected', t.getAttribute('data-tab') === tab ? 'true' : 'false');
        });
        render();
    }

    // ---------------------------------------------------------------
    // Booking lists
    // ---------------------------------------------------------------
    function t(b) { return b.start ? new Date(b.start).getTime() : 0; }

    function groups() {
        var now = Date.now();
        var verify = [], held = [], upcoming = [], history = [];
        state.bookings.forEach(function (b) {
            if (b.status === 'payment_submitted' || b.status === 'pending') verify.push(b);
            else if (b.status === 'held') held.push(b);
            else if (b.status === 'confirmed' && (!b.end || new Date(b.end).getTime() + 3 * 3600000 > now)) upcoming.push(b);
            else history.push(b);
        });
        var asc = function (a, b) { return t(a) - t(b); };
        verify.sort(asc); held.sort(asc); upcoming.sort(asc);
        history.sort(function (a, b) { return t(b) - t(a); });
        return { verify: verify, held: held, upcoming: upcoming, history: history };
    }

    function render() {
        var g = groups();
        var cv = $('cVerify');
        cv.textContent = g.verify.length;
        cv.className = 'count' + (g.verify.length ? ' alert' : '');
        $('cHeld').textContent = g.held.length;
        $('cUpcoming').textContent = g.upcoming.length;

        var panel = $('panel');
        panel.setAttribute('aria-labelledby', 'tab-' + state.tab);
        if (state.tab === 'slots') return renderSlots(panel);
        if (state.tab === 'rates') return renderRates(panel);
        if (state.tab === 'payment') return renderPaymentSettings(panel);

        var list = g[state.tab] || [];
        var intro = {
            verify: 'Check that each payment has arrived in your account before confirming.',
            held: 'These visitors have reserved a time but have not uploaded payment proof yet. Unpaid reservations are released automatically after 30 minutes.',
            upcoming: '',
            history: ''
        }[state.tab];
        var empty = {
            verify: 'No payments waiting for verification.',
            held: 'No reservations waiting for payment.',
            upcoming: 'No confirmed sessions coming up.',
            history: 'Completed, rejected, cancelled and expired bookings will appear here.'
        }[state.tab];

        panel.innerHTML = (intro && list.length ? '<p class="panel-intro">' + intro + '</p>' : '') +
            (list.length ? '<div class="bk-list">' + list.map(bookingCard).join('') + '</div>' : '<p class="panel-empty">' + empty + '</p>');

        panel.querySelectorAll('[data-act]').forEach(function (btn) {
            btn.addEventListener('click', function () { openAction(btn.getAttribute('data-id'), btn.getAttribute('data-act')); });
        });
        panel.querySelectorAll('[data-proof]').forEach(function (btn) {
            btn.addEventListener('click', function () { openProof(btn.getAttribute('data-proof')); });
        });
    }

    function bookingCard(b) {
        var s = b.start ? new Date(b.start) : null, e = b.end ? new Date(b.end) : null;
        var isPast = e && e.getTime() < Date.now();
        var st = b.status;
        var act = function (a, label, cls) { return '<button class="' + cls + '" data-act="' + a + '" data-id="' + esc(b.id) + '">' + (cls.indexOf('btn-submit') > -1 ? '<span>' + label + '</span>' : label) + '</button>'; };

        var actions = '';
        if (st === 'payment_submitted' || st === 'pending') {
            actions = act('confirmed', 'Confirm booking', 'btn-submit') + act('rejected', 'Reject payment', 'btn-ghost btn-danger');
        } else if (st === 'held') {
            actions = act('confirmed', 'Confirm (paid)', 'btn-ghost') + act('cancelled', 'Cancel hold', 'btn-ghost btn-danger');
        } else if (st === 'confirmed') {
            actions = (isPast ? act('completed', 'Mark completed', 'btn-submit') : '') + act('cancelled', 'Cancel booking', 'btn-ghost btn-danger');
        }

        var holdLeft = '';
        if (st === 'held' && b.hold_expires_at) {
            var mins = Math.max(0, Math.round((new Date(b.hold_expires_at).getTime() - Date.now()) / 60000));
            holdLeft = '<span class="tag">Reservation ends in ' + mins + ' min</span>';
        }

        return '<article class="bk-card ' + esc(st) + '">' +
            '<div class="bk-when">' +
                (s ? '<strong>' + esc(fmtDay.format(s)) + '</strong><span>' + esc(fmtTime.format(s)) + ' to ' + esc(fmtTime.format(e)) + '</span>' : '<strong>No time</strong>') +
                '<span>' + esc(modeText(b.mode)) + '</span>' +
                (b.amount_npr != null ? '<span class="bk-amount">' + esc(npr(b.amount_npr)) + '</span>' : '') +
            '</div>' +
            '<div class="bk-who">' +
                '<h3>' + esc(b.name) + '</h3>' +
                '<p class="bk-service">' + esc(b.service_name) + (b.level ? ', ' + esc(LEVEL_LABEL[b.level] || b.level) : '') +
                    (b.hours ? ', ' + b.hours + '-hour session' : '') + '</p>' +
                '<p class="bk-contact"><a href="mailto:' + esc(b.email) + '">' + esc(b.email) + '</a>' +
                    (b.phone ? ', <a href="tel:' + esc(b.phone) + '">' + esc(b.phone) + '</a>' : '') +
                    (b.affiliation ? '<br>' + esc(b.affiliation) : '') + '</p>' +
                '<p class="bk-topic">' + esc(b.topic) + '</p>' +
                (b.message ? '<p class="bk-msg">' + esc(b.message) + '</p>' : '') +
                (b.slot_conflict ? '<p class="bk-warn"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i> This payment arrived after the reservation expired and the time was taken by someone else. Arrange another time with the client, or reject and refund.</p>' : '') +
                (b.proof_path || b.transaction_id ? '<div class="bk-pay">' +
                    (b.proof_path ? '<button type="button" class="btn-ghost btn-small" data-proof="' + esc(b.proof_path) + '"><i class="far fa-image" aria-hidden="true"></i> View payment proof</button>' : '') +
                    (b.transaction_id ? '<span>Transaction ID <strong>' + esc(b.transaction_id) + '</strong></span>' : '') +
                  '</div>' : '') +
                (b.admin_note ? '<p class="bk-note"><strong>Your note:</strong> ' + esc(b.admin_note) + '</p>' : '') +
                '<div class="bk-tags">' +
                    '<span class="tag st-' + esc(st) + '">' + esc(STATUS_TEXT[st] || st) + '</span>' +
                    (b.reference ? '<span class="tag">' + esc(b.reference) + '</span>' : '') +
                    holdLeft +
                    (b.stage ? '<span class="tag">' + esc(b.stage) + '</span>' : '') +
                    '<span class="tag">Booked ' + esc(fmtStamp.format(new Date(b.created_at))) + '</span>' +
                '</div>' +
            '</div>' +
            (actions ? '<div class="bk-actions">' + actions + '</div>' : '<div></div>') +
        '</article>';
    }

    function openProof(path) {
        var w = window.open('', '_blank');
        api.proofUrl(path).then(function (url) {
            if (w) w.location.href = url; else window.location.href = url;
        }).catch(function (err) {
            if (w) w.close();
            toast('Could not open the proof: ' + err.message, true);
        });
    }

    function openAction(id, act) {
        var b = state.bookings.filter(function (x) { return x.id === id; })[0];
        if (!b) return;

        if (act === 'completed') {
            return api.updateBooking(id, 'completed', '', false)
                .then(function () { toast('Marked as completed'); return refresh(); })
                .catch(function (err) { toast(err.message, true); });
        }

        var when = b.start ? fmtDayLong.format(new Date(b.start)) + ' at ' + fmtTime.format(new Date(b.start)) : '';
        var amount = b.amount_npr != null ? npr(b.amount_npr) : '';
        var note = $('dlgNote');
        note.value = '';
        $('dlgNotify').checked = true;

        if (act === 'confirmed') {
            $('dlgTitle').textContent = 'Confirm booking';
            $('dlgSub').textContent = (amount ? 'Only confirm after checking that ' + amount + ' has arrived' + (b.reference ? ' (reference ' + b.reference + ')' : '') + '. ' : '') +
                b.name + ', ' + when + ', ' + modeText(b.mode).toLowerCase() + '.';
            $('dlgNoteLabel').textContent = b.mode === 'online' ? 'Meeting link and any instructions for the client' : 'Any instructions for the client (optional)';
            note.placeholder = b.mode === 'online' ? 'e.g. https://meet.google.com/abc-defg-hij' : 'e.g. Please come to the Finance department office, first floor.';
            $('dlgOk').querySelector('span').textContent = 'Confirm booking';
        } else if (act === 'rejected') {
            $('dlgTitle').textContent = 'Reject payment';
            $('dlgSub').textContent = b.name + ', ' + (b.reference || '') + (amount ? ', ' + amount : '') + '. The booking is not confirmed and the time becomes available again.';
            $('dlgNoteLabel').textContent = 'Reason for the client';
            note.placeholder = 'e.g. The payment has not arrived in the account. Please reply with your transaction details.';
            $('dlgOk').querySelector('span').textContent = 'Reject payment';
        } else {
            $('dlgTitle').textContent = b.status === 'held' ? 'Cancel reservation' : 'Cancel booking';
            $('dlgSub').textContent = b.name + ', ' + when + '. The time becomes available to others again.' +
                (b.status === 'confirmed' ? ' Remember to refund the client if they have paid.' : '');
            $('dlgNoteLabel').textContent = 'Reason for the client (optional)';
            note.placeholder = 'e.g. I am travelling that day. Your payment will be refunded.';
            $('dlgOk').querySelector('span').textContent = 'Cancel booking';
        }

        var dlg = $('actionDialog');
        $('actionForm').onsubmit = function (e) {
            e.preventDefault();
            if (act === 'rejected' && !note.value.trim()) { note.focus(); return toast('Add a short reason so the client knows what to do next.', true); }
            var ok = $('dlgOk');
            ok.disabled = true;
            api.updateBooking(id, act, note.value.trim(), $('dlgNotify').checked).then(function (res) {
                dlg.close();
                var msg = { confirmed: 'Booking confirmed', rejected: 'Payment rejected', cancelled: 'Booking cancelled' }[act];
                if ($('dlgNotify').checked) msg += res && res.email_warning ? ', but the email could not be sent. Check your Resend settings.' : '. The client has been emailed.';
                toast(msg, !!(res && res.email_warning));
                return refresh();
            }).catch(function (err) {
                toast(err.message || 'Update failed.', true);
            }).then(function () { ok.disabled = false; });
        };
        if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
        note.focus();
    }

    // ---------------------------------------------------------------
    // Time slots (one-hour blocks)
    // ---------------------------------------------------------------
    var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var slotFormState = null;

    function renderSlots(panel) {
        var today = fmtKey.format(new Date());
        var in4w = fmtKey.format(new Date(Date.now() + 27 * 86400000));
        var sf = slotFormState || { from: today, to: in4w, days: [0, 1, 2, 3, 4, 5], times: '10:00, 11:00, 14:00, 15:00', mode: 'either' };

        var byDay = {}, order = [];
        state.slots.forEach(function (s) {
            var k = fmtKey.format(new Date(s.starts_at));
            if (!byDay[k]) { byDay[k] = []; order.push(k); }
            byDay[k].push(s);
        });

        panel.innerHTML =
            '<div class="slot-layout">' +
            '<form class="slot-form" id="slotForm" novalidate>' +
                '<h2>Add open hours</h2>' +
                '<p>Each start time becomes a one-hour slot. Visitors booking 2 or 3 hours need back-to-back slots, so open consecutive hours (for example 10:00, 11:00, 12:00) where you want longer sessions. Times are Nepal time.</p>' +
                '<div class="date-cols">' +
                    '<div class="form-row"><label for="sfFrom">From</label><input type="date" id="sfFrom" value="' + esc(sf.from) + '" min="' + today + '"></div>' +
                    '<div class="form-row"><label for="sfTo">To</label><input type="date" id="sfTo" value="' + esc(sf.to) + '" min="' + today + '"></div>' +
                '</div>' +
                '<fieldset class="form-row weekday-pick"><legend>Days</legend>' +
                    WEEKDAYS.map(function (d, i) { return '<label><input type="checkbox" name="wd" value="' + i + '"' + (sf.days.indexOf(i) > -1 ? ' checked' : '') + '>' + d + '</label>'; }).join('') +
                '</fieldset>' +
                '<div class="form-row"><label for="sfTimes">Start times</label><input type="text" id="sfTimes" value="' + esc(sf.times) + '">' +
                    '<p class="help">Separate with commas. 24-hour (14:00) or 12-hour (2 pm).</p></div>' +
                '<div class="form-row"><label for="sfMode">Format</label><select id="sfMode">' +
                    [['either', 'Client chooses'], ['online', 'Online only'], ['in_person', 'In person only']].map(function (o) {
                        return '<option value="' + o[0] + '"' + (sf.mode === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
                    }).join('') +
                '</select></div>' +
                '<p class="slot-preview" id="sfPreview" aria-live="polite"></p>' +
                '<button type="submit" class="btn-submit" id="sfSubmit"><span>Add hours</span></button>' +
            '</form>' +
            '<div class="slot-list">' + (order.length ? order.map(function (k) {
                return '<div class="day-group"><h3>' + esc(fmtDayLong.format(new Date(byDay[k][0].starts_at))) + '</h3><div class="slot-rows">' +
                    byDay[k].map(slotRow).join('') + '</div></div>';
            }).join('') : '<p class="panel-empty">No upcoming hours. Use the form to open some.</p>') + '</div>' +
            '</div>';

        var form = $('slotForm');
        form.addEventListener('input', updateSlotPreview);
        form.addEventListener('change', updateSlotPreview);
        form.addEventListener('submit', onAddSlots);
        updateSlotPreview();
        panel.querySelectorAll('[data-slot-act]').forEach(function (btn) {
            btn.addEventListener('click', function () { onSlotAction(btn.getAttribute('data-id'), btn.getAttribute('data-slot-act')); });
        });
    }

    function slotRow(s) {
        var start = new Date(s.starts_at);
        var links = s.booking_slots || [];
        var activeLink = links.filter(function (l) { return !l.released && l.booking; })[0];
        var past = start.getTime() < Date.now();
        var status;
        if (activeLink) {
            var bs = activeLink.booking.status;
            var word = bs === 'confirmed' ? 'Booked by ' : (bs === 'held' ? 'Reserved by ' : 'Paid, to verify: ');
            status = '<span class="tag st-' + esc(bs) + '">' + word + esc(activeLink.booking.name) + '</span>';
        } else if (past) status = '<span class="tag">Past</span>';
        else if (!s.is_active) status = '<span class="tag">Hidden</span>';
        else status = '<span class="tag st-open">Open</span>';

        var actions = '';
        if (!activeLink && !past) {
            actions += '<button type="button" class="icon-btn" data-slot-act="' + (s.is_active ? 'hide' : 'show') + '" data-id="' + s.id + '" title="' + (s.is_active ? 'Hide from booking page' : 'Show on booking page') + '" aria-label="' + (s.is_active ? 'Hide slot' : 'Show slot') + '"><i class="far ' + (s.is_active ? 'fa-eye-slash' : 'fa-eye') + '" aria-hidden="true"></i></button>';
        }
        if (!links.length) {
            actions += '<button type="button" class="icon-btn danger" data-slot-act="delete" data-id="' + s.id + '" title="Delete slot" aria-label="Delete slot"><i class="far fa-trash-can" aria-hidden="true"></i></button>';
        }
        var end = new Date(start.getTime() + s.duration_min * 60000);
        return '<div class="slot-row' + (!s.is_active ? ' hidden-slot' : '') + '">' +
            '<span class="s-time">' + esc(fmtTime.format(start)) + '</span>' +
            '<span class="s-info">to ' + esc(fmtTime.format(end)) + ', ' + esc(modeText(s.mode)) + ' ' + status + '</span>' +
            '<span class="slot-row-actions">' + actions + '</span></div>';
    }

    function parseTimes(text) {
        var out = [], bad = [];
        text.split(/[,;\n]+/).map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (x) {
            var m = x.toLowerCase().replace(/\s+/g, '').match(/^(\d{1,2})(?::|\.)?(\d{2})?(am|pm)?$/);
            if (!m) return bad.push(x);
            var h = +m[1], min = m[2] ? +m[2] : 0;
            if (m[3] === 'pm' && h < 12) h += 12;
            if (m[3] === 'am' && h === 12) h = 0;
            if (h > 23 || min > 59) return bad.push(x);
            var v = pad(h) + ':' + pad(min);
            if (out.indexOf(v) === -1) out.push(v);
        });
        return { times: out.sort(), bad: bad };
    }

    function collectSlotForm() {
        var days = Array.prototype.slice.call(document.querySelectorAll('input[name="wd"]:checked')).map(function (i) { return +i.value; });
        slotFormState = { from: $('sfFrom').value, to: $('sfTo').value, days: days, times: $('sfTimes').value, mode: $('sfMode').value };
        var parsed = parseTimes(slotFormState.times), rows = [], error = '';
        if (!slotFormState.from || !slotFormState.to) error = 'Choose both dates.';
        else if (slotFormState.to < slotFormState.from) error = 'The end date is before the start date.';
        else if (!days.length) error = 'Choose at least one day.';
        else if (parsed.bad.length) error = 'Could not read: ' + parsed.bad.join(', ');
        else if (!parsed.times.length) error = 'Add at least one start time.';
        if (!error) {
            var cur = new Date(slotFormState.from + 'T00:00:00Z'), end = new Date(slotFormState.to + 'T00:00:00Z'), now = Date.now();
            while (cur <= end && rows.length <= 600) {
                if (days.indexOf(cur.getUTCDay()) > -1) {
                    var key = cur.toISOString().slice(0, 10);
                    parsed.times.forEach(function (tm) {
                        var iso = toISO(key, tm);
                        if (new Date(iso).getTime() > now) rows.push({ starts_at: iso, duration_min: 60, mode: slotFormState.mode });
                    });
                }
                cur.setUTCDate(cur.getUTCDate() + 1);
            }
            if (rows.length > 600) error = 'That is more than 600 hours. Choose a shorter date range.';
            else if (!rows.length) error = 'Those dates and days give no future hours.';
        }
        return { rows: rows, error: error };
    }

    function updateSlotPreview() {
        var r = collectSlotForm(), p = $('sfPreview');
        p.style.color = r.error ? 'var(--status-amber)' : '';
        p.textContent = r.error || ('This opens ' + r.rows.length + ' one-hour slot' + (r.rows.length === 1 ? '' : 's') + '.');
        $('sfSubmit').disabled = !!r.error;
    }

    function onAddSlots(e) {
        e.preventDefault();
        var r = collectSlotForm();
        if (r.error) return;
        $('sfSubmit').disabled = true;
        api.addSlots(r.rows).then(function (added) {
            var n = (added || []).length, skipped = r.rows.length - n;
            toast('Opened ' + n + ' hour' + (n === 1 ? '' : 's') + (skipped ? ' (' + skipped + ' already existed)' : ''));
            return refresh();
        }).catch(function (err) { toast('Could not add hours: ' + err.message, true); $('sfSubmit').disabled = false; });
    }

    function onSlotAction(id, act) {
        var p;
        if (act === 'delete') {
            if (!confirm('Delete this hour?')) return;
            p = api.deleteSlot(id).then(function () { toast('Hour deleted'); });
        } else {
            p = api.setSlotActive(id, act === 'show').then(function () { toast(act === 'show' ? 'Hour is visible again' : 'Hour hidden from booking page'); });
        }
        p.then(refresh).catch(function (err) { toast(err.message, true); });
    }

    // ---------------------------------------------------------------
    // Services and session fees
    // ---------------------------------------------------------------
    function renderRates(panel) {
        panel.innerHTML = '<p class="panel-empty">Loading…</p>';
        Promise.all([api.listFees(), api.listServices()]).then(function (r) {
            var fees = r[0], list = r[1];
            state.services = list;
            panel.innerHTML =
                '<form class="fees-card" id="feesForm" novalidate>' +
                    '<div><h2>Session fees</h2><p>The fee for each session length, the same for every service and level. Leave a length empty to stop offering it. Changes apply to new bookings only.</p></div>' +
                    '<div class="fees-inputs">' + [1, 2, 3].map(function (h) {
                        return '<label>' + h + ' hour' + (h > 1 ? 's' : '') + '<span class="rate-input"><span>Rs.</span><input type="number" name="fee' + h + '" min="0" step="100" inputmode="numeric" value="' + (fees[h] != null ? esc(fees[h]) : '') + '" placeholder="Not offered"></span></label>';
                    }).join('') +
                    '<button type="submit" class="btn-submit"><span>Save fees</span></button></div>' +
                '</form>' +
                '<h2 class="admin-subhead">Services</h2>' +
                '<p class="panel-intro">Services visitors can choose on the booking page.</p>' +
                '<div class="svc-admin-list">' + list.map(serviceForm).join('') + '</div>' +
                '<form class="svc-add" id="svcAdd" novalidate>' +
                    '<label for="newSvc">Add a service</label>' +
                    '<div class="svc-add-row"><input type="text" id="newSvc" maxlength="80" placeholder="e.g. Data analysis session"><button type="submit" class="btn-ghost">Add</button></div>' +
                '</form>';

            $('feesForm').addEventListener('submit', function (e) {
                e.preventDefault();
                var el = this.elements, out = {}, bad = false;
                [1, 2, 3].forEach(function (h) {
                    var v = el['fee' + h].value.trim();
                    if (v === '') out[h] = null;
                    else if (isNaN(+v) || +v < 0) bad = true;
                    else out[h] = Math.round(+v * 100) / 100;
                });
                if (bad) return toast('Fees must be positive numbers.', true);
                if (out[1] == null && out[2] == null && out[3] == null) return toast('Offer at least one session length.', true);
                var btn = this.querySelector('.btn-submit');
                btn.disabled = true;
                api.saveFees(out).then(function () { toast('Fees saved'); })
                    .catch(function (err) { toast('Could not save: ' + err.message, true); })
                    .then(function () { btn.disabled = false; });
            });
            panel.querySelectorAll('.svc-admin').forEach(function (f) {
                f.addEventListener('submit', function (e) { e.preventDefault(); saveServiceForm(f); });
            });
            $('svcAdd').addEventListener('submit', function (e) {
                e.preventDefault();
                var name = $('newSvc').value.trim();
                if (name.length < 2) return toast('Enter a service name.', true);
                var id = slugify(name), n = 2;
                while (list.some(function (s) { return s.id === id; })) id = slugify(name) + '-' + n++;
                var order = list.reduce(function (m, s) { return Math.max(m, s.sort_order || 0); }, 0) + 1;
                api.saveService({ id: id, name: name, description: null, sort_order: order, is_active: true })
                    .then(function () { toast('Service added'); renderRates(panel); })
                    .catch(function (err) { toast(err.message, true); });
            });
        }).catch(function (err) {
            panel.innerHTML = '<p class="panel-empty">Could not load: ' + esc(err.message) + '</p>';
        });
    }

    function serviceForm(s) {
        return '<form class="svc-admin' + (s.is_active ? '' : ' inactive') + '" data-id="' + esc(s.id) + '" novalidate>' +
            '<div class="svc-admin-main">' +
                '<div class="form-row"><label>Service name<input type="text" name="name" maxlength="80" value="' + esc(s.name) + '"></label></div>' +
                '<div class="form-row"><label>Description<textarea name="description" rows="2" maxlength="400">' + esc(s.description || '') + '</textarea></label></div>' +
            '</div>' +
            '<div class="svc-admin-side">' +
                '<label class="check-row"><input type="checkbox" name="is_active"' + (s.is_active ? ' checked' : '') + '> Show on booking page</label>' +
                '<label class="order-field">Order <input type="number" name="sort_order" min="0" max="999" value="' + esc(s.sort_order || 0) + '"></label>' +
                '<button type="submit" class="btn-submit"><span>Save</span></button>' +
            '</div>' +
        '</form>';
    }

    function saveServiceForm(f) {
        var el = f.elements;
        var name = el.name.value.trim();
        if (name.length < 2) return toast('Enter a service name.', true);
        var btn = f.querySelector('.btn-submit');
        btn.disabled = true;
        api.saveService({
            id: f.getAttribute('data-id'), name: name, description: el.description.value.trim() || null,
            sort_order: +el.sort_order.value || 0, is_active: el.is_active.checked
        }).then(function () {
            f.classList.toggle('inactive', !el.is_active.checked);
            toast('Saved ' + name);
        }).catch(function (err) { toast('Could not save: ' + err.message, true); })
          .then(function () { btn.disabled = false; });
    }

    // ---------------------------------------------------------------
    // Payment details (QR code, bank details, policy)
    // ---------------------------------------------------------------
    function renderPaymentSettings(panel) {
        panel.innerHTML = '<p class="panel-empty">Loading payment details…</p>';
        api.getPaymentSettings().then(function (s) {
            state.settings = s;
            panel.innerHTML =
                '<div class="paycfg">' +
                  '<section class="paycfg-qr">' +
                    '<h2>Payment QR code</h2>' +
                    '<p>Upload the QR code from your bank or Fonepay app. Visitors see it on the payment step. PNG or JPG, up to 2 MB.</p>' +
                    '<div class="qr-frame" id="qrFrame">' + (s.qr_url ? '<img src="' + esc(s.qr_url) + '" alt="Current payment QR code">' : '<span>No QR code uploaded yet</span>') + '</div>' +
                    '<label class="btn-ghost file-btn"><input type="file" id="qrFile" accept="image/png,image/jpeg,image/webp"><i class="fas fa-upload" aria-hidden="true"></i> ' + (s.qr_url ? 'Replace QR code' : 'Upload QR code') + '</label>' +
                    (s.qr_url ? ' <button type="button" class="btn-ghost btn-danger" id="qrRemove">Remove</button>' : '') +
                    '<p class="help">Tip: crop the image so the QR code fills most of it, and check it scans from your phone after uploading.</p>' +
                  '</section>' +
                  '<form class="paycfg-form" id="payForm" novalidate>' +
                    '<h2>Details shown with the QR code</h2>' +
                    '<div class="form-row"><label>Account name<input type="text" name="account_name" maxlength="120" value="' + esc(s.account_name || '') + '"></label></div>' +
                    '<div class="form-row"><label>Bank and branch <span class="optional">optional</span><input type="text" name="bank_name" maxlength="120" value="' + esc(s.bank_name || '') + '"></label></div>' +
                    '<div class="form-row"><label>Account number <span class="optional">optional</span><input type="text" name="account_number" maxlength="60" value="' + esc(s.account_number || '') + '"></label></div>' +
                    '<div class="form-row"><label>Payment instructions<textarea name="instructions" rows="3" maxlength="1000" placeholder="e.g. Scan with any mobile banking or Fonepay app. Write your booking reference in the remarks.">' + esc(s.instructions || '') + '</textarea></label></div>' +
                    '<div class="form-row"><label>Cancellation and refund policy<textarea name="refund_policy" rows="4" maxlength="2000" placeholder="e.g. Full refund if cancelled at least 24 hours before the session. Payments that cannot be verified are refunded within 3 working days.">' + esc(s.refund_policy || '') + '</textarea></label>' +
                      '<p class="help">If filled in, visitors must tick "I agree" before submitting payment proof.</p></div>' +
                    '<button type="submit" class="btn-submit"><span>Save details</span></button>' +
                  '</form>' +
                '</div>';

            $('qrFile').addEventListener('change', function () {
                var f = this.files && this.files[0];
                if (!f) return;
                if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return toast('Upload a PNG, JPG or WEBP image.', true);
                if (f.size > 2 * 1024 * 1024) return toast('The image is larger than 2 MB. Crop or compress it first.', true);
                toast('Uploading QR code…');
                api.uploadQr(f, s.qr_path).then(function () { toast('QR code updated'); renderPaymentSettings(panel); })
                    .catch(function (err) { toast('Upload failed: ' + err.message, true); });
            });
            var rm = $('qrRemove');
            if (rm) rm.addEventListener('click', function () {
                if (!confirm('Remove the QR code? Visitors will only see the bank details.')) return;
                api.removeQr(s.qr_path).then(function () { toast('QR code removed'); renderPaymentSettings(panel); })
                    .catch(function (err) { toast(err.message, true); });
            });
            $('payForm').addEventListener('submit', function (e) {
                e.preventDefault();
                var el = this.elements, btn = this.querySelector('.btn-submit');
                var fields = {};
                ['account_name', 'bank_name', 'account_number', 'instructions', 'refund_policy'].forEach(function (k) { fields[k] = el[k].value.trim() || null; });
                btn.disabled = true;
                api.savePaymentSettings(fields).then(function () { toast('Payment details saved'); })
                    .catch(function (err) { toast('Could not save: ' + err.message, true); })
                    .then(function () { btn.disabled = false; });
            });
        }).catch(function (err) {
            panel.innerHTML = '<p class="panel-empty">Payment details could not be loaded: ' + esc(err.message) + '</p>';
        });
    }
})();
