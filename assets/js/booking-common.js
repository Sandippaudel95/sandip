/* ==========================================================================
   Shared code for booking.html and booking-status.html
     - formatting helpers (Nepal time, rupees)
     - data access (Supabase + booking-api function, or preview data)
     - the payment panel (QR code, amount, proof upload)

   Exposes one global: window.SPBooking
   ========================================================================== */
(function () {
    'use strict';

    var CFG = window.BOOKING_CONFIG || {};
    var TZ = CFG.timezone || 'Asia/Kathmandu';
    var LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || TZ;
    var PREVIEW = !CFG.supabaseUrl || /YOUR-/.test(CFG.supabaseUrl + CFG.supabaseKey);
    var FN = CFG.functionName || 'booking-api';
    var MAX_PROOF = 5 * 1024 * 1024;

    var client = null;
    if (!PREVIEW && window.supabase && window.supabase.createClient) {
        client = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: false } });
    }

    var LEVELS = [
        { id: 'bachelor', label: 'Bachelor' },
        { id: 'master', label: 'Master' },
        { id: 'mphil', label: 'MPhil' },
        { id: 'phd', label: 'PhD' }
    ];
    var LEVEL_LABEL = LEVELS.reduce(function (a, l) { a[l.id] = l.label; return a; }, {});

    // ---------------------------------------------------------------
    // Formatting
    // ---------------------------------------------------------------
    var F = {
        key: new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }),
        time: new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }),
        localTime: new Intl.DateTimeFormat('en-US', { timeZone: LOCAL_TZ, hour: 'numeric', minute: '2-digit', weekday: 'short' }),
        dayTZ: new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        dayUTC: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        month: new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' })
    };

    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function dayKey(d) { return F.key.format(d); }
    function keyToUTCDate(key) { var p = key.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
    function npr(n) {
        return 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function tzOffsetMinutes(tz, date) {
        var parts = new Intl.DateTimeFormat('en-US', {
            timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        }).formatToParts(date).reduce(function (a, p) { a[p.type] = p.value; return a; }, {});
        return Math.round((Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute) - date.getTime()) / 60000);
    }
    var SHOW_LOCAL = tzOffsetMinutes(TZ, new Date()) !== tzOffsetMinutes(LOCAL_TZ, new Date());

    function rangeText(startIso, endIso) {
        if (!startIso || !endIso) return 'Time to be arranged';
        var s = new Date(startIso), e = new Date(endIso);
        return F.dayTZ.format(s) + ', ' + F.time.format(s) + ' to ' + F.time.format(e) + ' (Nepal time)';
    }
    function modeText(m) { return m === 'in_person' ? 'In person' : (m === 'online' ? 'Online' : 'Online or in person'); }

    // ---------------------------------------------------------------
    // Real data access
    // ---------------------------------------------------------------
    function fnError(res, fallback) {
        var ctx = res.error && res.error.context;
        if (ctx && typeof ctx.json === 'function') {
            return ctx.json().then(function (b) { throw new Error((b && b.error) || fallback); },
                                   function () { throw new Error(fallback); });
        }
        throw new Error('Could not reach the booking service. Check your connection and try again.');
    }
    function invoke(body, fallback) {
        return client.functions.invoke(FN, { body: body }).then(function (res) {
            return res.error ? fnError(res, fallback) : res.data;
        });
    }

    var realApi = {
        getServices: function () {
            return client.from('services')
                .select('id, name, description, sort_order')
                .eq('is_active', true)
                .order('sort_order')
                .then(function (res) {
                    if (res.error) throw res.error;
                    return res.data || [];
                });
        },
        // Session fees by length: { 1: 5000, 2: 7000, 3: 10000 }
        getFees: function () {
            return client.from('duration_prices').select('hours, price_npr').then(function (res) {
                if (res.error) throw res.error;
                var fees = {};
                (res.data || []).forEach(function (r) { if (r.price_npr != null) fees[r.hours] = Number(r.price_npr); });
                return fees;
            });
        },
        getPaymentSettings: function () {
            return client.from('payment_settings').select('*').eq('id', 1).maybeSingle().then(function (res) {
                if (res.error) throw res.error;
                return res.data || {};
            });
        },
        getSlots: function () {
            return client.rpc('get_available_slots').then(function (res) {
                if (res.error) throw res.error;
                return res.data || [];
            });
        },
        createHold: function (payload) {
            payload.action = 'create_hold';
            return invoke(payload, 'Your booking could not be started. Please try again.');
        },
        submitPayment: function (ref, token, txn, file) {
            var fd = new FormData();
            fd.append('action', 'submit_payment');
            fd.append('reference', ref);
            fd.append('token', token);
            fd.append('transaction_id', txn || '');
            fd.append('proof', file, file.name);
            return invoke(fd, 'Your payment proof could not be uploaded. Please try again.');
        },
        getStatus: function (ref, token) {
            return invoke({ action: 'get_status', reference: ref, token: token }, 'This booking could not be found.')
                .then(function (d) { return d.booking; });
        }
    };

    // ---------------------------------------------------------------
    // Preview data (used until booking-config.js is filled in)
    // ---------------------------------------------------------------
    var PREVIEW_QR = 'data:image/svg+xml,' + encodeURIComponent(previewQrSvg());

    function previewQrSvg() {
        // A decorative placeholder that looks like a QR code. Not scannable.
        var n = 25, cell = 8, out = '', seed = 7;
        function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
        function finder(x, y) {
            return '<rect x="' + x * cell + '" y="' + y * cell + '" width="' + 7 * cell + '" height="' + 7 * cell + '" fill="#0a2540"/>' +
                   '<rect x="' + (x + 1) * cell + '" y="' + (y + 1) * cell + '" width="' + 5 * cell + '" height="' + 5 * cell + '" fill="#fff"/>' +
                   '<rect x="' + (x + 2) * cell + '" y="' + (y + 2) * cell + '" width="' + 3 * cell + '" height="' + 3 * cell + '" fill="#0a2540"/>';
        }
        for (var y = 0; y < n; y++) {
            for (var x = 0; x < n; x++) {
                var inFinder = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
                if (!inFinder && rnd() > 0.52) out += '<rect x="' + x * cell + '" y="' + y * cell + '" width="' + cell + '" height="' + cell + '" fill="#0a2540"/>';
            }
        }
        var s = n * cell;
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 -16 ' + (s + 32) + ' ' + (s + 32) + '"><rect x="-16" y="-16" width="' + (s + 32) + '" height="' + (s + 32) + '" fill="#fff"/>' +
               out + finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7) +
               '<rect x="' + (s / 2 - 46) + '" y="' + (s / 2 - 14) + '" width="92" height="28" rx="4" fill="#fff"/><text x="' + s / 2 + '" y="' + (s / 2 + 5) + '" font-family="Arial" font-size="13" font-weight="700" fill="#0a2540" text-anchor="middle">SAMPLE QR</text></svg>';
    }

    var previewServices = [
        { id: 'research-consultation', name: 'Research consultation', description: 'Focused advice on a specific research question: design, methods, data analysis, or interpreting results.' },
        { id: 'proposal-writing', name: 'Proposal writing consultation', description: 'Help shaping a thesis or research proposal: problem statement, objectives, literature review, and methodology.' },
        { id: 'research-supervision', name: 'Detailed research supervision', description: 'In-depth, step-by-step guidance through your thesis or research project, one session at a time.' },
        { id: 'assignment-consultation', name: 'Assignment consultation', description: 'Guidance on understanding, structuring, and improving course assignments and research reports.' }
    ];
    var previewFees = { 1: 5000, 2: 7000, 3: 10000 };

    var previewSettings = {
        account_name: 'Sandip Paudel',
        bank_name: 'Example Bank Ltd., Butwal Branch',
        account_number: '0123 4567 8901 2345',
        instructions: 'Scan the QR with any mobile banking, eSewa, Khalti or Fonepay app. Write your booking reference in the remarks.',
        refund_policy: 'Full refund if you cancel at least 24 hours before your session. If you cancel less than 24 hours before the session, 50% of the fee is refunded. To cancel or request a refund, email sandip.paudel@lbc.edu.np with your booking reference.',
        qr_url: PREVIEW_QR
    };

    function previewStore(update) {
        var data = {};
        try { data = JSON.parse(sessionStorage.getItem('sp-preview-bookings') || '{}'); } catch (e) { data = {}; }
        if (update) {
            update(data);
            try { sessionStorage.setItem('sp-preview-bookings', JSON.stringify(data)); } catch (e) { /* ignore */ }
        }
        return data;
    }

    function previewSlots() {
        var out = [], now = Date.now();
        var hours = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];
        var taken = previewStore();
        var busy = {};
        Object.keys(taken).forEach(function (k) { (taken[k].slot_ids || []).forEach(function (id) { busy[id] = true; }); });
        for (var i = 1; i <= 28; i++) {
            var key = dayKey(new Date(now + i * 86400000));
            var wd = keyToUTCDate(key).getUTCDay();
            if (wd === 6 || i % 5 === 0) continue;
            hours.forEach(function (t, j) {
                if ((i + j) % 7 === 0) return;
                var id = 'p-' + key + '-' + t;
                if (busy[id]) return;
                var iso = new Date(key + 'T' + t + ':00+05:45').toISOString();
                if (new Date(iso).getTime() < now + 12 * 3600000) return;
                out.push({ id: id, starts_at: iso, duration_min: 60, mode: j < 3 ? 'either' : 'online' });
            });
        }
        return out;
    }

    var delay = function (v, ms) { return new Promise(function (r) { setTimeout(function () { r(v); }, ms || 400); }); };

    var previewApi = {
        getServices: function () { return delay(previewServices, 150); },
        getFees: function () { return delay(previewFees, 100); },
        getPaymentSettings: function () { return delay(previewSettings, 100); },
        getSlots: function () { return delay(previewSlots(), 200); },
        createHold: function (p) {
            var svc = previewServices.filter(function (s) { return s.id === p.service_id; })[0];
            var fee = previewFees[p.hours];
            var ref = 'SP-' + String(Math.floor(Math.random() * 1e6)).padStart(6, '0');
            var start = new Date(p._starts_at);
            var b = {
                reference: ref, token: 'preview-' + Math.random().toString(36).slice(2),
                amount_npr: fee, rate_npr: fee / p.hours, hours: p.hours, mode: p.mode,
                hold_expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
                service_name: svc.name, starts_at: start.toISOString(),
                ends_at: new Date(start.getTime() + p.hours * 3600000).toISOString()
            };
            previewStore(function (d) {
                d[ref] = Object.assign({}, b, { status: 'held', name: p.name, level: p.level, topic: p.topic, slot_ids: p._slot_ids });
            });
            return delay(Object.assign({ ok: true }, b), 600);
        },
        submitPayment: function (ref, token, txn) {
            previewStore(function (d) { if (d[ref]) { d[ref].status = 'payment_submitted'; d[ref].transaction_id = txn; } });
            return delay({ ok: true, status: 'payment_submitted' }, 900);
        },
        getStatus: function (ref) {
            var b = previewStore()[ref];
            if (!b) {
                var s = new Date(Date.now() + 3 * 86400000);
                b = { reference: ref || 'SP-000000', status: 'payment_submitted', name: 'Preview visitor', service_name: 'Research consultation',
                      level: 'master', hours: 2, rate_npr: 3500, amount_npr: 7000, mode: 'online', topic: 'Example topic',
                      starts_at: s.toISOString(), ends_at: new Date(s.getTime() + 7200000).toISOString(), transaction_id: '' };
            }
            return delay(b, 300);
        }
    };

    var api = PREVIEW ? previewApi : realApi;
    if (!PREVIEW && !client) {
        var fail = function () { return Promise.reject(new Error('The booking service could not load. Check your connection and refresh the page.')); };
        api = { getServices: fail, getFees: fail, getPaymentSettings: fail, getSlots: fail, createHold: fail, submitPayment: fail, getStatus: fail };
    }

    function statusUrl(ref, token) {
        return 'booking-status.html?ref=' + encodeURIComponent(ref) + '&t=' + encodeURIComponent(token);
    }

    // ---------------------------------------------------------------
    // Payment panel
    // ---------------------------------------------------------------
    // opts: { booking, settings, onSubmitted(result) }
    //   booking needs: reference, token, amount_npr, rate_npr, hours,
    //   hold_expires_at, service_name, starts_at, ends_at, status
    function renderPaymentPanel(root, opts) {
        var b = opts.booking, s = opts.settings || {};
        var expired = b.status === 'expired';
        var hasBank = s.account_name || s.bank_name || s.account_number;

        root.innerHTML =
            '<div class="pay">' +
              '<div class="pay-info">' +
                '<p class="pay-label">Amount to pay</p>' +
                '<p class="pay-amount">' + esc(npr(b.amount_npr)) + '</p>' +
                '<p class="pay-breakdown">Fee for a ' + esc(b.hours) + '-hour session</p>' +

                '<div class="pay-ref">' +
                  '<div><p class="pay-label">Booking reference</p><p class="pay-ref-code">' + esc(b.reference) + '</p></div>' +
                  '<button type="button" class="btn-ghost btn-small" data-copy="' + esc(b.reference) + '"><i class="far fa-copy" aria-hidden="true"></i> Copy</button>' +
                '</div>' +
                '<p class="pay-hint">Write this reference in the payment remarks so your payment can be matched to your booking.</p>' +

                '<div class="pay-timer" data-timer' + (expired ? ' hidden' : '') + '></div>' +
                (expired ? '<p class="pay-expired">The 30-minute hold on this time has ended. If you have already paid, upload your proof below and it will still be reviewed.</p>' : '') +

                '<dl class="pay-summary">' +
                  '<div><dt>Service</dt><dd>' + esc(b.service_name) + '</dd></div>' +
                  '<div><dt>When</dt><dd>' + esc(rangeText(b.starts_at, b.ends_at)) + '</dd></div>' +
                '</dl>' +
              '</div>' +

              '<div class="pay-qr">' +
                (s.qr_url
                    ? '<img src="' + esc(s.qr_url) + '" alt="Payment QR code" class="qr-img" width="240" height="240">' +
                      '<a class="qr-open" href="' + esc(s.qr_url) + '" target="_blank" rel="noopener" download>Open QR image</a>'
                    : '<p class="qr-missing">The QR code is not available right now. Please pay using the bank details.</p>') +
                (hasBank ? '<dl class="bank">' +
                    (s.account_name ? '<div><dt>Account name</dt><dd>' + esc(s.account_name) + '</dd></div>' : '') +
                    (s.bank_name ? '<div><dt>Bank</dt><dd>' + esc(s.bank_name) + '</dd></div>' : '') +
                    (s.account_number ? '<div><dt>Account number</dt><dd><span>' + esc(s.account_number) + '</span> <button type="button" class="copy-inline" data-copy="' + esc(s.account_number) + '" aria-label="Copy account number"><i class="far fa-copy" aria-hidden="true"></i></button></dd></div>' : '') +
                  '</dl>' : '') +
                (s.instructions ? '<p class="pay-instructions">' + esc(s.instructions) + '</p>' : '') +
              '</div>' +
            '</div>' +

            '<form class="proof-form" novalidate>' +
              '<h3 class="proof-title">Upload payment proof</h3>' +
              '<p class="proof-sub">After paying, upload a screenshot of the successful payment. JPG, PNG or PDF, up to 5 MB.</p>' +
              '<label class="dropzone" tabindex="0">' +
                '<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" class="proof-input">' +
                '<span class="dz-empty"><i class="fas fa-cloud-arrow-up" aria-hidden="true"></i><strong>Choose a file</strong> or drag it here</span>' +
                '<span class="dz-file" hidden></span>' +
              '</label>' +
              '<div class="form-row">' +
                '<label>Transaction ID <span class="optional">optional</span>' +
                '<input type="text" class="txn-input" maxlength="100" autocomplete="off" placeholder="From your payment receipt"></label>' +
              '</div>' +
              (s.refund_policy
                ? '<div class="policy"><p class="policy-title">Cancellation and refund policy</p><p>' + esc(s.refund_policy) + '</p></div>' +
                  '<label class="check-row"><input type="checkbox" class="agree-input"> I have read and agree to the cancellation and refund policy.</label>'
                : '') +
              '<button type="submit" class="btn-submit proof-submit"><span>Submit payment proof</span></button>' +
              '<p class="form-status" role="status" aria-live="polite"></p>' +
            '</form>';

        // Copy buttons
        root.querySelectorAll('[data-copy]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var text = btn.getAttribute('data-copy');
                var done = function () {
                    var old = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i>' + (btn.classList.contains('copy-inline') ? '' : ' Copied');
                    setTimeout(function () { btn.innerHTML = old; }, 1500);
                };
                if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
            });
        });

        // Hold countdown
        var timerEl = root.querySelector('[data-timer]');
        var timerId = null;
        if (timerEl && b.hold_expires_at && !expired) {
            var tick = function () {
                var left = new Date(b.hold_expires_at).getTime() - Date.now();
                if (left <= 0) {
                    timerEl.className = 'pay-timer ended';
                    timerEl.innerHTML = '<i class="far fa-clock" aria-hidden="true"></i> The hold has ended. If you have already paid, still upload your proof below.';
                    clearInterval(timerId);
                    return;
                }
                var m = Math.floor(left / 60000), sec = Math.floor((left % 60000) / 1000);
                timerEl.className = 'pay-timer' + (left < 5 * 60000 ? ' low' : '');
                timerEl.innerHTML = '<i class="far fa-clock" aria-hidden="true"></i> This time is held for you for <strong>' + m + ':' + pad(sec) + '</strong>';
            };
            tick();
            timerId = setInterval(tick, 1000);
        }

        // File picking
        var form = root.querySelector('.proof-form');
        var input = form.querySelector('.proof-input');
        var zone = form.querySelector('.dropzone');
        var fileLabel = form.querySelector('.dz-file');
        var emptyLabel = form.querySelector('.dz-empty');
        var status = form.querySelector('.form-status');
        var chosen = null;
        var previewUrl = null;

        function setStatus(msg, type) { status.textContent = msg || ''; status.className = 'form-status' + (type ? ' ' + type : ''); }

        function useFile(f) {
            if (!f) return;
            if (!/^(image\/(png|jpeg|webp)|application\/pdf)$/.test(f.type)) {
                return setStatus('Choose a JPG, PNG, WEBP or PDF file. iPhone photos in HEIC format can be sent as a screenshot instead.', 'error');
            }
            if (f.size > MAX_PROOF) return setStatus('That file is larger than 5 MB. Please use a screenshot.', 'error');
            chosen = f;
            setStatus('');
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            previewUrl = f.type.indexOf('image/') === 0 ? URL.createObjectURL(f) : null;
            fileLabel.innerHTML = (previewUrl ? '<img src="' + previewUrl + '" alt="">' : '<i class="far fa-file-pdf" aria-hidden="true"></i>') +
                '<span><strong>' + esc(f.name) + '</strong><small>' + Math.max(1, Math.round(f.size / 1024)) + ' KB. Click to change.</small></span>';
            fileLabel.hidden = false;
            emptyLabel.hidden = true;
            zone.classList.add('has-file');
        }

        input.addEventListener('change', function () { useFile(input.files && input.files[0]); });
        zone.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
        ['dragenter', 'dragover'].forEach(function (ev) {
            zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('drag'); });
        });
        ['dragleave', 'drop'].forEach(function (ev) {
            zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('drag'); });
        });
        zone.addEventListener('drop', function (e) { useFile(e.dataTransfer.files && e.dataTransfer.files[0]); });

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!chosen) { zone.focus(); return setStatus('Attach a screenshot or PDF of your payment first.', 'error'); }
            var agree = form.querySelector('.agree-input');
            if (agree && !agree.checked) { agree.focus(); return setStatus('Please confirm that you agree to the cancellation and refund policy.', 'error'); }

            var btn = form.querySelector('.proof-submit');
            btn.disabled = true;
            btn.querySelector('span').textContent = 'Uploading…';
            setStatus('');
            api.submitPayment(b.reference, b.token, form.querySelector('.txn-input').value.trim(), chosen)
                .then(function (res) {
                    if (timerId) clearInterval(timerId);
                    if (opts.onSubmitted) opts.onSubmitted(res);
                })
                .catch(function (err) {
                    setStatus(err.message || 'Upload failed. Please try again.', 'error');
                    btn.disabled = false;
                    btn.querySelector('span').textContent = 'Submit payment proof';
                });
        });

        return { stop: function () { if (timerId) clearInterval(timerId); } };
    }

    window.SPBooking = {
        PREVIEW: PREVIEW, TZ: TZ, SHOW_LOCAL: SHOW_LOCAL, LEVELS: LEVELS, LEVEL_LABEL: LEVEL_LABEL,
        F: F, pad: pad, dayKey: dayKey, keyToUTCDate: keyToUTCDate, npr: npr, esc: esc,
        rangeText: rangeText, modeText: modeText, statusUrl: statusUrl,
        api: api, renderPaymentPanel: renderPaymentPanel
    };
})();
