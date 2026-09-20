/* ==========================================================================
   Booking status page: booking-status.html?ref=SP-123456&t=<private token>
   Shows the current state of a booking. If payment proof has not been
   uploaded yet, shows the payment panel so the client can upload it here.
   ========================================================================== */
(function () {
    'use strict';

    var B = window.SPBooking;
    var esc = B.esc, npr = B.npr;
    var $ = function (id) { return document.getElementById(id); };

    var STATES = {
        held: { icon: 'fa-regular fa-clock', tone: 'pending', title: 'Waiting for your payment',
                text: 'Your time is reserved. Pay using the QR code below, then upload a screenshot of the payment.' },
        expired: { icon: 'fa-regular fa-clock', tone: 'muted', title: 'Your reservation has expired',
                text: 'No payment proof was received within 30 minutes, so the time was released. If you have already paid, upload your proof below and it will still be reviewed. Otherwise, you are welcome to book again.' },
        payment_submitted: { icon: 'fa-regular fa-hourglass-half', tone: 'pending', title: 'Payment submitted, awaiting confirmation',
                text: 'Your payment proof has been received. Your booking will be confirmed once the payment has been verified, and you will receive an email when that happens.' },
        pending: { icon: 'fa-regular fa-hourglass-half', tone: 'pending', title: 'Awaiting confirmation',
                text: 'Your request has been received and is being reviewed.' },
        confirmed: { icon: 'fa-solid fa-check', tone: 'ok', title: 'Booking confirmed',
                text: 'Your payment has been verified and your session is confirmed.' },
        completed: { icon: 'fa-solid fa-check-double', tone: 'ok', title: 'Session completed',
                text: 'Thank you for booking. You are welcome to book another session at any time.' },
        rejected: { icon: 'fa-solid fa-xmark', tone: 'bad', title: 'Payment not accepted',
                text: 'The payment for this booking could not be verified, so the booking was not confirmed and the time was released.' },
        cancelled: { icon: 'fa-solid fa-ban', tone: 'muted', title: 'Booking cancelled',
                text: 'This booking has been cancelled. If you had already paid, you will be contacted about a refund or another time.' }
    };

    document.addEventListener('DOMContentLoaded', function () {
        if (B.PREVIEW) $('previewBanner').hidden = false;
        var q = new URLSearchParams(location.search);
        var ref = q.get('ref') || '';
        var token = q.get('t') || '';
        if (!B.PREVIEW && (!ref || !token)) {
            return showError('This link is incomplete. Open the "Check booking status" link from your booking email.');
        }
        load(ref, token);
    });

    function showError(msg) {
        $('statusCard').innerHTML = '<div class="status-head"><div class="done-icon muted"><i class="fa-solid fa-question" aria-hidden="true"></i></div>' +
            '<div><h1>Booking not found</h1><p>' + esc(msg) + '</p></div></div>' +
            '<p><a class="btn-ghost" href="booking.html">Go to the booking page</a></p>';
    }

    function load(ref, token) {
        Promise.all([B.api.getStatus(ref, token), B.api.getPaymentSettings()]).then(function (r) {
            render(r[0], r[1], ref, token);
        }).catch(function (err) {
            showError(err.message || 'This booking could not be found.');
        });
    }

    function render(b, settings, ref, token) {
        var st = STATES[b.status] || STATES.payment_submitted;
        var rows = [
            ['Reference', b.reference],
            ['Service', b.service_name],
            ['Level', B.LEVEL_LABEL[b.level] || b.level],
            ['When', B.rangeText(b.starts_at, b.ends_at)],
            ['Duration', b.hours ? b.hours + ' hour' + (b.hours > 1 ? 's' : '') : ''],
            ['Format', B.modeText(b.mode)],
            ['Where', b.location || ''],
            ['Amount', b.amount_npr != null ? npr(b.amount_npr) : ''],
            ['Transaction ID', b.transaction_id || ''],
            [b.status === 'confirmed' ? 'Note from Sandip' : 'Note', b.note || '']
        ].filter(function (r) { return r[1]; });

        $('statusCard').className = 'status-card tone-' + st.tone;
        $('statusCard').innerHTML =
            '<div class="status-head">' +
                '<div class="done-icon ' + st.tone + '"><i class="' + st.icon + '" aria-hidden="true"></i></div>' +
                '<div><h1>' + esc(st.title) + '</h1><p>' + esc(st.text) + '</p></div>' +
            '</div>' +
            '<dl class="status-details">' + rows.map(function (r) {
                var val = /^https?:\/\/\S+$/.test(r[1]) ? '<a href="' + esc(r[1]) + '" target="_blank" rel="noopener">' + esc(r[1]) + '</a>' : esc(r[1]);
                return '<div><dt>' + esc(r[0]) + '</dt><dd>' + val + '</dd></div>';
            }).join('') + '</dl>' +
            '<div class="status-actions">' +
                (b.calendar_link ? '<a class="btn-submit" href="' + esc(b.calendar_link) + '" target="_blank" rel="noopener"><span>Add to Google Calendar</span></a>' : '') +
                (['rejected', 'cancelled', 'completed', 'expired'].indexOf(b.status) > -1 ? '<a class="btn-ghost" href="booking.html">Book a session</a>' : '') +
            '</div>' +
            (settings && settings.refund_policy && ['payment_submitted', 'confirmed', 'pending'].indexOf(b.status) > -1
                ? '<div class="policy status-policy"><p class="policy-title">Need to cancel?</p><p>' + esc(settings.refund_policy) + '</p></div>'
                : '');

        var canPay = b.status === 'held' || b.status === 'expired';
        $('statusPay').hidden = !canPay;
        if (canPay) {
            B.renderPaymentPanel($('statusPayRoot'), {
                booking: Object.assign({}, b, { token: token, reference: b.reference || ref }),
                settings: settings,
                onSubmitted: function () {
                    $('statusPay').hidden = true;
                    load(ref, token);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        }
    }
})();
