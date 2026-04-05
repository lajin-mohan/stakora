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
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    // Focus the close button
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

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // GDPR consent guard
      const consent = contactForm.querySelector('[name="gdpr_consent"]');
      if (consent && !consent.checked) {
        consent.focus();
        return;
      }

      // Loading state
      const btnText    = contactForm.querySelector('.btn-text');
      const btnLoading = contactForm.querySelector('.btn-loading');
      const submitBtn  = contactForm.querySelector('.form-submit');
      if (btnText)    btnText.hidden    = true;
      if (btnLoading) { btnLoading.hidden = false; btnLoading.setAttribute('aria-busy', 'true'); }
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
          contactForm.hidden = true;
          if (formSuccess) { formSuccess.removeAttribute('hidden'); formSuccess.focus(); }
        } else {
          throw new Error(json.message || 'Submission failed');
        }
      } catch (_err) {
        if (formError) { formError.removeAttribute('hidden'); formError.focus(); }
        // Re-enable button so user can retry
        if (btnText)    btnText.hidden    = false;
        if (btnLoading) { btnLoading.hidden = true; btnLoading.removeAttribute('aria-busy'); }
        if (submitBtn)  submitBtn.disabled = false;
      }
    });
  }

  // "Send another message" resets and shows the form again
  if (formResetBtn) {
    formResetBtn.addEventListener('click', () => {
      if (contactForm) { contactForm.reset(); contactForm.hidden = false; }
      if (formSuccess) formSuccess.setAttribute('hidden', '');
      if (formError)   formError.setAttribute('hidden', '');
    });
  }
})();
