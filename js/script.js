(function () {
  'use strict';

  /* ── Scroll Reveal ─────────────────────────────────────────
     Fire once per element, then stop watching.
     Also immediately reveal anything already in the viewport
     on load (threshold alone can't guarantee this). */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px 0px 0px' }
  );

  const revealEls = document.querySelectorAll('.reveal');

  // Immediately mark elements already visible in the viewport
  requestAnimationFrame(() => {
    revealEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('visible');
      } else {
        revealObserver.observe(el);
      }
    });
  });

  /* ── Sticky Nav ────────────────────────────────────────────*/
  const nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  /* ── Smooth Scroll with nav-height offset ──────────────────
     Prevents the sticky nav from covering section headings. */
  const NAV_HEIGHT = 80;
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const id = this.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT - 8;
      window.scrollTo({ top, behavior: 'smooth' });
      // Close mobile menu if open
      closeMobileNav();
    });
  });

  /* ── Mobile Nav Toggle ─────────────────────────────────────*/
  const navToggle = document.querySelector('.nav-toggle');
  const navMobile = document.getElementById('nav-mobile');

  function closeMobileNav() {
    if (!navToggle || !navMobile) return;
    navToggle.setAttribute('aria-expanded', 'false');
    navMobile.setAttribute('hidden', '');
  }

  function openMobileNav() {
    navToggle.setAttribute('aria-expanded', 'true');
    navMobile.removeAttribute('hidden');
  }

  if (navToggle && navMobile) {
    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      isOpen ? closeMobileNav() : openMobileNav();
    });

    // Close when clicking outside the nav
    document.addEventListener('click', (e) => {
      if (nav && !nav.contains(e.target)) closeMobileNav();
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMobileNav();
        navToggle.focus();
      }
    });

    // Close if viewport resizes above the hamburger breakpoint
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 900) closeMobileNav();
    }, { passive: true });
  }

  /* ── Contact Modal ─────────────────────────────────────────*/
  const modal        = document.getElementById('contact-modal');
  const modalOverlay = modal && modal.querySelector('.modal-overlay');
  const modalClose   = modal && modal.querySelector('.modal-close');
  let   modalOpener  = null; // element that opened the modal (for focus restore)

  function openModal(trigger) {
    if (!modal) return;
    modalOpener = trigger || document.activeElement;
    // Always reset to clean state when opening
    if (contactForm)  { contactForm.hidden = false; contactForm.reset(); clearFieldErrors(); }
    if (formSuccess)  formSuccess.setAttribute('hidden', '');
    if (formError)    formError.setAttribute('hidden', '');
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      if (modalClose) modalClose.focus();
    });
  }

  function closeModal() {
    if (!modal) return;
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
    if (modalOpener) { modalOpener.focus(); modalOpener = null; }
  }

  // Open on any [data-modal="contact"] click
  document.querySelectorAll('[data-modal="contact"]').forEach((el) => {
    el.addEventListener('click', (e) => { e.preventDefault(); openModal(el); });
  });

  // Close on overlay click and close button
  if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
  if (modalClose)   modalClose.addEventListener('click', closeModal);

  // Close on ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.hasAttribute('hidden')) closeModal();
  });

  // Trap focus inside modal
  if (modal) {
    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusable = Array.from(
        modal.querySelectorAll('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])')
      ).filter((el) => !el.closest('[hidden]') && !el.disabled);
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  }

  /* ── Web3Forms AJAX Submission ─────────────────────────────*/
  const contactForm  = document.getElementById('contact-form');
  const formSuccess  = document.getElementById('form-success');
  const formError    = document.getElementById('form-error');
  const formResetBtn = document.getElementById('form-reset-btn');

  function setFieldError(inputEl, msg) {
    clearFieldError(inputEl);
    const err = document.createElement('span');
    err.className = 'field-error';
    err.setAttribute('role', 'alert');
    err.textContent = msg;
    inputEl.parentNode.appendChild(err);
    inputEl.setAttribute('aria-invalid', 'true');
    inputEl.classList.add('input-error');
  }

  function clearFieldError(inputEl) {
    const existing = inputEl.parentNode.querySelector('.field-error');
    if (existing) existing.remove();
    inputEl.removeAttribute('aria-invalid');
    inputEl.classList.remove('input-error');
  }

  function clearFieldErrors() {
    if (!contactForm) return;
    contactForm.querySelectorAll('.field-error').forEach(el => el.remove());
    contactForm.querySelectorAll('[aria-invalid]').forEach(el => {
      el.removeAttribute('aria-invalid');
      el.classList.remove('input-error');
    });
  }

  function validateForm() {
    let valid = true;
    const nameEl    = contactForm.querySelector('[name="name"]');
    const emailEl   = contactForm.querySelector('[name="email"]');
    const consentEl = contactForm.querySelector('[name="gdpr_consent"]');

    clearFieldErrors();

    if (!nameEl.value.trim()) {
      setFieldError(nameEl, 'Please enter your full name.');
      if (valid) nameEl.focus();
      valid = false;
    }

    const emailVal = emailEl.value.trim();
    if (!emailVal) {
      setFieldError(emailEl, 'Please enter your email address.');
      if (valid) emailEl.focus();
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setFieldError(emailEl, 'Please enter a valid email address.');
      if (valid) emailEl.focus();
      valid = false;
    }

    if (!consentEl.checked) {
      setFieldError(consentEl, 'You must agree to proceed.');
      if (valid) consentEl.focus();
      valid = false;
    }

    return valid;
  }

  if (contactForm) {
    // Clear field error on input
    contactForm.querySelectorAll('input, textarea, select').forEach(el => {
      el.addEventListener('input', () => clearFieldError(el));
      el.addEventListener('change', () => clearFieldError(el));
    });

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!validateForm()) return;

      // Loading state
      const btnText    = contactForm.querySelector('.btn-text');
      const btnLoading = contactForm.querySelector('.btn-loading');
      const submitBtn  = contactForm.querySelector('.form-submit');
      if (btnText)    btnText.setAttribute('hidden', '');
      if (btnLoading) { btnLoading.removeAttribute('hidden'); }
      if (submitBtn)  submitBtn.disabled = true;

      try {
        const data = Object.fromEntries(new FormData(e.target));
        const res  = await fetch('https://api.web3forms.com/submit', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body:    JSON.stringify(data),
        });
        const json = await res.json();

        if (res.ok && json.success) {
          contactForm.setAttribute('hidden', '');
          if (formSuccess) { formSuccess.removeAttribute('hidden'); formSuccess.focus(); }
          track('generate_lead', {
            service: (data.service || 'not specified').slice(0, 40),
          });
        } else {
          throw new Error(json.message || 'Submission failed');
        }
      } catch (_err) {
        if (btnText)    btnText.removeAttribute('hidden');
        if (btnLoading) btnLoading.setAttribute('hidden', '');
        if (submitBtn)  submitBtn.disabled = false;
        if (formError)  { formError.removeAttribute('hidden'); formError.focus(); }
      }
    });
  }

  /* ── GA4 Event Tracking ────────────────────────────────────*/
  function track(eventName, params) {
    if (typeof gtag === 'function') gtag('event', eventName, params || {});
  }

  // Track CTA button clicks
  document.querySelectorAll('[data-modal="contact"]').forEach((el) => {
    el.addEventListener('click', () => track('begin_contact', { method: el.textContent.trim().slice(0, 40) }));
  });

  // Track "Schedule a Discovery Call" click
  const calLink = document.querySelector('a[href*="cal.com"]');
  if (calLink) calLink.addEventListener('click', () => track('schedule_call'));

  // Track "See how we work" click
  const processLink = document.querySelector('a[href="#process"]');
  if (processLink) processLink.addEventListener('click', () => track('view_process'));

  /* ── Cookie Consent ────────────────────────────────────────*/
  const cookieBar     = document.getElementById('cookie-bar');
  const cookieAccept  = document.getElementById('cookie-accept');
  const cookieDecline = document.getElementById('cookie-decline');

  function hideCookieBar() {
    if (cookieBar) cookieBar.setAttribute('hidden', '');
  }

  if (cookieBar && localStorage.getItem('cookie_consent') === null) {
    // Show after brief delay so it doesn't fight page load animation
    setTimeout(() => cookieBar.removeAttribute('hidden'), 1500);
  }

  if (cookieAccept) {
    cookieAccept.addEventListener('click', () => {
      localStorage.setItem('cookie_consent', 'accepted');
      track('cookie_consent', { action: 'accepted' });
      hideCookieBar();
    });
  }

  if (cookieDecline) {
    cookieDecline.addEventListener('click', () => {
      localStorage.setItem('cookie_consent', 'declined');
      hideCookieBar();
    });
  }

  /* ── FAQ Accordion ─────────────────────────────────────────*/
  document.querySelectorAll('.faq-question').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');

      // Close all open items
      document.querySelectorAll('.faq-item.open').forEach((openItem) => {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });

      // Open clicked item if it was closed
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // "Send another message" resets and shows the form again
  if (formResetBtn) {
    formResetBtn.addEventListener('click', () => {
      if (contactForm) {
        contactForm.reset();
        clearFieldErrors();
        contactForm.removeAttribute('hidden');
      }
      if (formSuccess) formSuccess.setAttribute('hidden', '');
      if (formError)   formError.setAttribute('hidden', '');
    });
  }
})();
