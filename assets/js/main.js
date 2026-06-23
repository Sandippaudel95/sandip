/* ==========================================================================
   Sandip Paudel: Personal Academic Website
   Main JavaScript

   Modules:
     1. Mobile navigation toggle
     2. Sticky header shadow on scroll
     3. Active link highlight on scroll
     4. Smooth scroll for anchor links (also handled by CSS scroll-behavior)
     5. Reveal-on-scroll animations
     6. Auto year in footer
     7. Contact form submission (Formspree-compatible)

   No build step is required. Vanilla JS only.
   ========================================================================== */

(function () {
    'use strict';

    // Wait until the DOM is ready before wiring anything up.
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        setupMobileNav();
        setupHeaderScrollState();
        setupActiveLinkHighlight();
        setupRevealOnScroll();
        setupAutoYear();
        setupContactForm();
    }


    /* ----------------------------------------------------------------------
       1. MOBILE NAVIGATION TOGGLE
       Opens/closes the slide-down menu on phones. Closes when a link is
       tapped or when the user clicks outside.
       ---------------------------------------------------------------------- */
    function setupMobileNav() {
        var toggle = document.getElementById('navToggle');
        var nav = document.querySelector('.primary-nav');
        if (!toggle || !nav) return;

        toggle.addEventListener('click', function () {
            var isOpen = nav.classList.toggle('open');
            toggle.classList.toggle('open', isOpen);
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        // Close on link click
        nav.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                nav.classList.remove('open');
                toggle.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            });
        });

        // Close when clicking outside
        document.addEventListener('click', function (e) {
            if (!nav.contains(e.target) && !toggle.contains(e.target)) {
                nav.classList.remove('open');
                toggle.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }


    /* ----------------------------------------------------------------------
       2. STICKY HEADER SHADOW ON SCROLL
       Adds a thin border/background tint to the header once the user has
       scrolled past the hero.
       ---------------------------------------------------------------------- */
    function setupHeaderScrollState() {
        var header = document.getElementById('siteHeader');
        if (!header) return;

        var lastScroll = -1;
        function update() {
            var y = window.scrollY;
            if (y === lastScroll) return;
            lastScroll = y;
            header.classList.toggle('scrolled', y > 8);
        }

        window.addEventListener('scroll', function () {
            window.requestAnimationFrame(update);
        }, { passive: true });

        update();
    }


    /* ----------------------------------------------------------------------
       3. ACTIVE LINK HIGHLIGHT ON SCROLL
       Adds .active to the nav link whose section is currently in view.
       ---------------------------------------------------------------------- */
    function setupActiveLinkHighlight() {
        var sections = document.querySelectorAll('main section[id]');
        var navLinks = document.querySelectorAll('.primary-nav a[href^="#"]');
        if (!sections.length || !navLinks.length) return;

        var linkById = {};
        navLinks.forEach(function (link) {
            var id = link.getAttribute('href').slice(1);
            linkById[id] = link;
        });

        // IntersectionObserver gives us efficient, scroll-position-aware
        // highlighting without a scroll listener.
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                var id = entry.target.getAttribute('id');
                var link = linkById[id];
                if (!link) return;
                if (entry.isIntersecting) {
                    navLinks.forEach(function (l) { l.classList.remove('active'); });
                    link.classList.add('active');
                }
            });
        }, {
            rootMargin: '-40% 0px -55% 0px',
            threshold: 0
        });

        sections.forEach(function (s) { observer.observe(s); });
    }


    /* ----------------------------------------------------------------------
       4. REVEAL-ON-SCROLL ANIMATIONS
       Fades and slides elements into view as they enter the viewport.
       Add the class "reveal" to any element to opt in; or extend the
       selector list below.
       ---------------------------------------------------------------------- */
    function setupRevealOnScroll() {
        // Elements that should fade in. Add classes here to opt new content in.
        var selectors = [
            '.section-header',
            '.interest-list li',
            '.stat',
            '.timeline-item',
            '.pub-item',
            '.conf-card',
            '.training-item',
            '.contact-info',
            '.contact-form',
            '.hero-text',
            '.hero-photo'
        ];

        var targets = document.querySelectorAll(selectors.join(','));
        targets.forEach(function (el) { el.classList.add('reveal'); });

        if (!('IntersectionObserver' in window)) {
            // Older browsers: show everything immediately.
            targets.forEach(function (el) { el.classList.add('visible'); });
            return;
        }

        var observer = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    obs.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.08,
            rootMargin: '0px 0px -40px 0px'
        });

        targets.forEach(function (el) { observer.observe(el); });
    }


    /* ----------------------------------------------------------------------
       5. AUTO YEAR IN FOOTER
       Keeps the copyright current with no maintenance.
       ---------------------------------------------------------------------- */
    function setupAutoYear() {
        var el = document.getElementById('currentYear');
        if (el) el.textContent = new Date().getFullYear();
    }


    /* ----------------------------------------------------------------------
       6. CONTACT FORM SUBMISSION
       Submits the form to Formspree via fetch so the page does not reload.
       Shows a small status message on success or failure.

       Requirements:
         - The form must have action="https://formspree.io/f/YOUR_FORM_ID"
         - Replace YOUR_FORM_ID with your actual Formspree endpoint.
       If you prefer mailto, set action="mailto:..." in the HTML and this
       function will not interfere (it will fall back to the browser default
       because fetch only runs when the action contains "formspree.io").
       ---------------------------------------------------------------------- */
    function setupContactForm() {
        var form = document.getElementById('contactForm');
        var status = document.getElementById('formStatus');
        if (!form || !status) return;

        form.addEventListener('submit', function (e) {
            var action = form.getAttribute('action') || '';

            // Only intercept if we are using Formspree. Mailto and other
            // actions are left to the browser.
            if (action.indexOf('formspree.io') === -1) return;

            e.preventDefault();
            status.textContent = '';
            status.className = 'form-status';

            // Basic client-side validation. The required attribute handles
            // most of this, but we double-check trimmed values.
            var data = new FormData(form);
            var name = (data.get('name') || '').toString().trim();
            var email = (data.get('email') || '').toString().trim();
            var message = (data.get('message') || '').toString().trim();

            if (!name || !email || !message) {
                status.textContent = 'Please fill in all required fields.';
                status.classList.add('error');
                return;
            }

            // Send to Formspree
            fetch(action, {
                method: 'POST',
                body: data,
                headers: { 'Accept': 'application/json' }
            })
            .then(function (response) {
                if (response.ok) {
                    status.textContent = 'Thanks. Your message has been sent.';
                    status.classList.add('success');
                    form.reset();
                } else {
                    response.json().then(function (body) {
                        var msg = body && body.errors && body.errors.length
                            ? body.errors.map(function (e) { return e.message; }).join(', ')
                            : 'There was a problem sending your message.';
                        status.textContent = msg;
                        status.classList.add('error');
                    }).catch(function () {
                        status.textContent = 'There was a problem sending your message.';
                        status.classList.add('error');
                    });
                }
            })
            .catch(function () {
                status.textContent = 'Network error. Please try again later.';
                status.classList.add('error');
            });
        });
    }

})();
