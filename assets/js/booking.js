/* ==========================================================================
   Consultation booking page
   Step 1 service, level, hours -> Step 2 time -> Step 3 details ->
   Step 4 pay by QR and upload proof -> "awaiting confirmation" notice.
   Needs booking-common.js (window.SPBooking).
   ========================================================================== */
(function () {
    'use strict';

    var B = window.SPBooking;
    var F = B.F, esc = B.esc, npr = B.npr;
    var $ = function (id) { return document.getElementById(id); };

    var state = {
        services: [], fees: {}, slots: [], settings: null,
        serviceId: null, level: null, hours: 1,
        runsByDay: {}, runById: {}, view: null, day: null,
        run: null, hold: null, step: 'service', panel: null
    };
    var STEPS = ['service', 'time', 'details', 'pay'];

    document.addEventListener('DOMContentLoaded', function () {
        $('timesTz').textContent = B.SHOW_LOCAL ? 'Nepal time (NPT). Your local time is shown underneath.' : 'All times are Nepal time (NPT).';

        $('hoursList').addEventListener('change', function (e) {
            if (e.target.name === 'hours') { state.hours = +e.target.value; renderPrice(); }
        });
        $('toTime').addEventListener('click', function () { goTo('time'); });
        $('calPrev').addEventListener('click', function () { shiftMonth(-1); });
        $('calNext').addEventListener('click', function () { shiftMonth(1); });
        $('bBack').addEventListener('click', function () { goTo('time'); });
        $('bookingForm').addEventListener('submit', onDetailsSubmit);
        $('bAnother').addEventListener('click', startOver);
        $('stepper').addEventListener('click', function (e) {
            var li = e.target.closest('li');
            if (li && li.classList.contains('done') && !state.hold) goTo(li.getAttribute('data-step'));
        });

        Promise.all([B.api.getServices(), B.api.getFees(), B.api.getPaymentSettings()]).then(function (r) {
            state.services = r[0] || [];
            state.fees = r[1] || {};
            state.settings = r[2] || {};
            renderRateTable();
            renderHours();
            renderServices();
        }).catch(function (err) {
            console.error(err);
            $('serviceList').innerHTML = '<p class="times-empty">' + esc(err.message || 'Services could not be loaded. Refresh the page to try again.') + ' <a href="index.html#contact">Go to the contact form</a>.</p>';
            $('rateTable').innerHTML = '<p class="times-empty">Fees could not be loaded.</p>';
        });
    });

    // ---------------------------------------------------------------
    // Navigation between steps
    // ---------------------------------------------------------------
    function goTo(step) {
        state.step = step;
        document.querySelectorAll('.step-panel').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== step; });
        var idx = STEPS.indexOf(step);
        document.querySelectorAll('#stepper li').forEach(function (li, i) {
            li.classList.toggle('current', i === idx);
            li.classList.toggle('done', idx === -1 ? true : i < idx);
            var btn = li.querySelector('button');
            btn.disabled = !(i < idx && !state.hold);
            if (i === idx) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
        });
        $('stepper').hidden = step === 'done';
        if (step === 'time') loadSlots();
        $('book').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ---------------------------------------------------------------
    // Step 1: services, level, hours
    // ---------------------------------------------------------------
    function fee() { return state.fees[state.hours]; }
    function hoursText(h) { return h + ' hour' + (h > 1 ? 's' : ''); }

    function renderRateTable() {
        var el = $('rateTable');
        var hs = [1, 2, 3].filter(function (h) { return state.fees[h] != null; });
        if (!hs.length) { el.innerHTML = '<p class="times-empty">Fees will be published soon.</p>'; return; }
        el.innerHTML = '<table class="rate-table fee-table"><tbody>' + hs.map(function (h) {
            return '<tr><th scope="row">' + hoursText(h) + '</th><td>' + esc(npr(state.fees[h])) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }

    function renderHours() {
        var hs = [1, 2, 3].filter(function (h) { return state.fees[h] != null; });
        if (hs.indexOf(state.hours) === -1) state.hours = hs[0] || 1;
        $('hoursList').innerHTML = hs.map(function (h) {
            return '<label><input type="radio" name="hours" value="' + h + '"' + (h === state.hours ? ' checked' : '') + '>' +
                   '<span>' + hoursText(h) + '<small>' + esc(npr(state.fees[h])) + '</small></span></label>';
        }).join('');
    }

    function renderServices() {
        var list = $('serviceList');
        if (!state.services.length || !Object.keys(state.fees).length) {
            list.innerHTML = '<p class="times-empty">Booking will open soon. In the meantime, <a href="index.html#contact">send a message</a>.</p>';
            return;
        }
        list.innerHTML = state.services.map(function (s, i) {
            return '<label class="svc-card"><input type="radio" name="service" value="' + esc(s.id) + '"' + (i === 0 ? ' checked' : '') + '>' +
                   '<span class="svc-body"><span class="svc-name">' + esc(s.name) + '</span>' +
                   (s.description ? '<span class="svc-desc">' + esc(s.description) + '</span>' : '') +
                   '</span></label>';
        }).join('');
        state.serviceId = state.services[0].id;
        list.addEventListener('change', function (e) {
            if (e.target.name === 'service') { state.serviceId = e.target.value; renderPrice(); }
        });
        renderLevels();
    }

    function currentService() {
        return state.services.filter(function (s) { return s.id === state.serviceId; })[0];
    }

    function renderLevels() {
        $('levelList').innerHTML = B.LEVELS.map(function (l) {
            return '<label><input type="radio" name="level" value="' + l.id + '"' + (l.id === state.level ? ' checked' : '') + '><span>' + l.label + '</span></label>';
        }).join('');
        $('levelList').onchange = function (e) { if (e.target.name === 'level') { state.level = e.target.value; renderPrice(); } };
        renderPrice();
    }

    function renderPrice() {
        var f = fee();
        var box = $('priceBox');
        if (f == null || !currentService()) { box.innerHTML = ''; $('toTime').disabled = true; return; }
        box.innerHTML =
            '<p class="price-line">' + esc(currentService().name) + ', ' + hoursText(state.hours) + '</p>' +
            '<p class="price-total"><span>Fee</span> ' + esc(npr(f)) + '</p>' +
            (state.level ? '' : '<p class="price-hint">Choose your level to continue.</p>');
        $('toTime').disabled = !state.level;
    }

    function choiceSummary() {
        var s = currentService();
        return esc(s.name) + ', ' + esc(B.LEVEL_LABEL[state.level]) + ', ' + hoursText(state.hours) + ', ' + esc(npr(fee()));
    }

    // ---------------------------------------------------------------
    // Step 2: time
    // ---------------------------------------------------------------
    function loadSlots() {
        $('choiceBar').innerHTML = '<p>' + choiceSummary() + '</p><button type="button" class="linkish" id="changeChoice">Change</button>';
        $('changeChoice').addEventListener('click', function () { goTo('service'); });
        $('calMonth').textContent = 'Loading…';
        $('timeList').innerHTML = '<p class="times-empty">Loading open times…</p>';
        B.api.getSlots().then(function (slots) {
            state.slots = slots;
            buildRuns();
            renderCalendar();
            renderTimes();
        }).catch(function (err) {
            console.error(err);
            $('calMonth').textContent = 'Unavailable';
            $('timeList').innerHTML = '<p class="times-empty">Open times could not be loaded. Refresh the page to try again.</p>';
        });
    }

    // Find every start time that has `hours` back-to-back open hours.
    function buildRuns() {
        var byStart = {};
        state.slots.forEach(function (s) { byStart[new Date(s.starts_at).getTime()] = s; });
        state.runsByDay = {}; state.runById = {};
        state.slots.forEach(function (first) {
            var run = [first], fixed = first.mode !== 'either' ? first.mode : null, t0 = new Date(first.starts_at).getTime();
            for (var i = 1; i < state.hours; i++) {
                var next = byStart[t0 + i * first.duration_min * 60000];
                if (!next) return;
                if (next.mode !== 'either') {
                    if (fixed && fixed !== next.mode) return;
                    fixed = next.mode;
                }
                run.push(next);
            }
            var last = run[run.length - 1];
            var r = {
                id: first.id, slots: run, mode: fixed || 'either',
                start: first.starts_at,
                end: new Date(new Date(last.starts_at).getTime() + last.duration_min * 60000).toISOString()
            };
            var k = B.dayKey(new Date(first.starts_at));
            (state.runsByDay[k] = state.runsByDay[k] || []).push(r);
            state.runById[r.id] = r;
        });
        var days = Object.keys(state.runsByDay).sort();
        if (!state.day || !state.runsByDay[state.day]) state.day = days[0] || null;
        var d = B.keyToUTCDate(state.day || B.dayKey(new Date()));
        state.view = { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    }

    function shiftMonth(delta) {
        var m = state.view.m + delta;
        state.view = { y: state.view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
        renderCalendar();
    }

    function renderCalendar() {
        var v = state.view;
        var first = new Date(Date.UTC(v.y, v.m, 1));
        var dim = new Date(Date.UTC(v.y, v.m + 1, 0)).getUTCDate();
        var today = B.dayKey(new Date());
        var vk = v.y + '-' + B.pad(v.m + 1);
        var days = Object.keys(state.runsByDay).sort();

        $('calMonth').textContent = F.month.format(first);
        $('calPrev').disabled = vk <= today.slice(0, 7);
        $('calNext').disabled = !days.length || vk >= days[days.length - 1].slice(0, 7);

        var html = '';
        for (var b = 0; b < first.getUTCDay(); b++) html += '<span class="cal-cell blank"></span>';
        for (var day = 1; day <= dim; day++) {
            var key = vk + '-' + B.pad(day);
            var n = (state.runsByDay[key] || []).length;
            var cls = 'cal-cell' + (key < today ? ' past' : '') + (key === today ? ' today' : '') + (n ? ' has-slots' : '') + (key === state.day ? ' selected' : '');
            html += '<button type="button" class="' + cls + '" data-day="' + key + '"' + (n ? '' : ' disabled') +
                    ' aria-pressed="' + (key === state.day) + '" aria-label="' + F.dayUTC.format(B.keyToUTCDate(key)) + (n ? ', ' + n + ' start time' + (n > 1 ? 's' : '') : ', nothing open') + '">' +
                    '<span class="cal-num">' + day + '</span></button>';
        }
        $('calGrid').innerHTML = html;
        $('calGrid').querySelectorAll('.has-slots').forEach(function (btn) {
            btn.addEventListener('click', function () {
                state.day = btn.getAttribute('data-day');
                renderCalendar(); renderTimes();
                if (window.matchMedia('(max-width: 860px)').matches) $('times').scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    function renderTimes() {
        var list = state.day ? state.runsByDay[state.day] || [] : [];
        if (!Object.keys(state.runsByDay).length) {
            $('timesTitle').textContent = 'Open times';
            $('timeList').innerHTML = '<p class="times-empty">' + (state.hours > 1
                ? 'No ' + state.hours + '-hour blocks are open right now. Try a shorter session, or <a href="index.html#contact">send a message</a>.'
                : 'There are no open times right now. New times are added regularly, or you can <a href="index.html#contact">send a message</a>.') + '</p>';
            return;
        }
        $('timesTitle').textContent = F.dayUTC.format(B.keyToUTCDate(state.day));
        $('timeList').innerHTML = list.map(function (r) {
            var s = new Date(r.start), e = new Date(r.end);
            return '<button type="button" class="time-btn" role="option" aria-selected="false" data-id="' + esc(r.id) + '">' +
                   '<span class="t-main">' + F.time.format(s) + '</span>' +
                   '<span class="t-meta">to ' + F.time.format(e) + ', ' + B.modeText(r.mode) + '</span>' +
                   (B.SHOW_LOCAL ? '<span class="t-local">' + F.localTime.format(s) + ' your time</span>' : '') +
                   '</button>';
        }).join('');
        $('timeList').querySelectorAll('.time-btn').forEach(function (btn) {
            btn.addEventListener('click', function () { chooseRun(btn.getAttribute('data-id')); });
        });
    }

    // ---------------------------------------------------------------
    // Step 3: details
    // ---------------------------------------------------------------
    function chooseRun(id) {
        state.run = state.runById[id];
        if (!state.run) return;
        var r = state.run;
        $('chosen').innerHTML =
            '<div class="chosen-when"><i class="far fa-calendar" aria-hidden="true"></i><div>' +
            '<strong>' + esc(B.rangeText(r.start, r.end)) + '</strong>' +
            '<span>' + choiceSummary() + '</span></div></div>' +
            (r.mode !== 'either' ? '<p class="chosen-mode">' + (r.mode === 'online' ? 'Online session' : 'In person at Lumbini Banijya Campus, Butwal') + '</p>' : '');
        $('modeField').hidden = r.mode !== 'either';
        if (r.mode !== 'either') {
            document.querySelectorAll('input[name="mode"]').forEach(function (x) { x.checked = x.value === r.mode; });
        }
        setStatus('');
        goTo('details');
        setTimeout(function () { $('bName').focus({ preventScroll: true }); }, 350);
    }

    function setStatus(msg, type) {
        $('bStatus').textContent = msg || '';
        $('bStatus').className = 'form-status' + (type ? ' ' + type : '');
    }

    function fieldError(input, msg) {
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        setStatus(msg, 'error');
        input.addEventListener('input', function clear() { input.removeAttribute('aria-invalid'); input.removeEventListener('input', clear); });
        return false;
    }

    function onDetailsSubmit(e) {
        e.preventDefault();
        var f = $('bookingForm').elements;
        if (f.name.value.trim().length < 2) return fieldError(f.name, 'Enter your full name.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim())) return fieldError(f.email, 'Enter a valid email address. Your booking confirmation will be sent there.');
        if (f.topic.value.trim().length < 3) return fieldError(f.topic, 'Add a short description of your research topic or assignment.');

        var modeInput = document.querySelector('input[name="mode"]:checked');
        var payload = {
            slot_id: state.run.id, hours: state.hours, service_id: state.serviceId, level: state.level,
            name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(),
            affiliation: f.affiliation.value.trim(), stage: f.stage.value, topic: f.topic.value.trim(),
            message: f.message.value.trim(), mode: modeInput ? modeInput.value : 'online', website: f.website.value
        };

        var btn = $('bSubmit');
        btn.disabled = true;
        btn.querySelector('span').textContent = 'Reserving your time…';
        setStatus('');

        B.api.createHold(payload).then(function (hold) {
            state.hold = {
                reference: hold.reference, token: hold.token, amount_npr: hold.amount_npr, rate_npr: hold.rate_npr,
                hours: hold.hours, hold_expires_at: hold.hold_expires_at, service_name: hold.service_name,
                starts_at: hold.starts_at, ends_at: hold.ends_at, status: 'held'
            };
            showPayment();
        }).catch(function (err) {
            setStatus(err.message || 'Your booking could not be started. Please try again.', 'error');
            if (/no longer available|just reserved|back to back|different formats/i.test(err.message || '')) {
                setTimeout(function () { goTo('time'); }, 2500);
            }
        }).then(function () {
            btn.disabled = false;
            btn.querySelector('span').textContent = 'Continue to payment';
        });
    }

    // ---------------------------------------------------------------
    // Step 4: payment, then done
    // ---------------------------------------------------------------
    function showPayment() {
        var h = state.hold;
        $('payLaterLink').href = B.statusUrl(h.reference, h.token);
        goTo('pay');
        state.panel = B.renderPaymentPanel($('payRoot'), {
            booking: h,
            settings: state.settings,
            onSubmitted: function () {
                $('doneRef').textContent = h.reference;
                $('doneText').textContent = 'Your booking for ' + B.rangeText(h.starts_at, h.ends_at) +
                    ' will be confirmed once the payment of ' + npr(h.amount_npr) + ' has been verified. You will receive an email when that happens.';
                $('doneStatusLink').href = B.statusUrl(h.reference, h.token);
                goTo('done');
                $('stepDone').focus();
            }
        });
    }

    function startOver() {
        if (state.panel) state.panel.stop();
        state.hold = null; state.run = null;
        $('payRoot').innerHTML = '';
        var f = $('bookingForm');
        ['stage', 'topic', 'message'].forEach(function (k) { f.elements[k].value = ''; });
        goTo('service');
    }
})();
