/* ============================================
   PARALLAX 60FPS ENGINE
   Zero layout-thrash, GPU-composited transforms
   ============================================ */

(function () {
    'use strict';

    // ---- STATE ----
    let scrollY = 0;
    let ticking = false;
    let winH = window.innerHeight;

    // ---- CACHED DOM REFS ----
    const navbar = document.getElementById('navbar');

    // Hero parallax layers (data-speed attribute driven)
    const heroLayers = document.querySelectorAll('.hero .parallax-layer, .hero .hero-content');

    // Gallery cards with individual parallax offsets
    const galleryCards = document.querySelectorAll('.gallery-card[data-parallax-card]');

    // Divider background parallax
    const dividerBgs = document.querySelectorAll('.divider-bg[data-speed]');

    // Scroll-reveal elements
    const reveals = document.querySelectorAll('.reveal-left, .reveal-right, .reveal-up');

    // Stat counters
    const statNumbers = document.querySelectorAll('.stat-number[data-count]');
    let statsCounted = false;

    // ---- SCROLL LISTENER (Read-only, no DOM writes here) ----
    window.addEventListener('scroll', onScroll, { passive: true });

    function onScroll() {
        scrollY = window.scrollY;
        if (!ticking) {
            requestAnimationFrame(onFrame);
            ticking = true;
        }
    }

    // ---- RESIZE (debounced) ----
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            winH = window.innerHeight;
        }, 200);
    });

    // ---- ANIMATION FRAME (All DOM writes batched here) ----
    function onFrame(timestamp) {
        ticking = false;

        // 1. Navbar background
        if (scrollY > 80) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // 2. Hero parallax layers
        heroLayers.forEach(layer => {
            const speed = parseFloat(layer.dataset.speed) || 0;
            layer.style.transform = `translate3d(0, ${scrollY * speed}px, 0)`;
        });

        // 3. Divider background parallax
        dividerBgs.forEach(bg => {
            const rect = bg.parentElement.getBoundingClientRect();
            const visible = rect.top < winH && rect.bottom > 0;
            if (visible) {
                const speed = parseFloat(bg.dataset.speed) || 0;
                const offset = (rect.top / winH) * 100 * speed;
                bg.style.transform = `translate3d(0, ${offset}px, 0)`;
            }
        });

        // 4. Gallery card parallax
        galleryCards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const visible = rect.top < winH && rect.bottom > 0;
            if (visible) {
                const shift = parseFloat(card.dataset.parallaxCard) || 0;
                const progress = (rect.top - winH) / (winH + rect.height);
                card.style.transform = `translate3d(0, ${progress * shift}px, 0)`;
            }
        });

        // 5. Scroll reveals
        reveals.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < winH * 0.85) {
                el.classList.add('visible');
            }
        });

        // 6. Stat counter animation
        if (!statsCounted) {
            const statsCard = document.querySelector('.stats-card');
            if (statsCard) {
                const rect = statsCard.getBoundingClientRect();
                if (rect.top < winH * 0.8) {
                    animateCounters();
                    statsCounted = true;
                }
            }
        }
    }

    // ---- COUNTER ANIMATION ----
    function animateCounters() {
        statNumbers.forEach(el => {
            const target = parseInt(el.dataset.count, 10);
            const duration = 1500;
            const start = performance.now();

            function tick(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                // Ease-out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.round(eased * target);
                if (progress < 1) {
                    requestAnimationFrame(tick);
                }
            }

            requestAnimationFrame(tick);
        });
    }

    // ---- SMOOTH ANCHOR SCROLLING ----
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', e => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ---- CUSTOM SELECT DROPDOWNS ----
    const customSelects = document.querySelectorAll('.custom-select');

    customSelects.forEach(select => {
        const trigger = select.querySelector('.select-trigger');
        const options = select.querySelectorAll('.select-option');
        const valueEl = select.querySelector('.select-value');
        const hiddenInput = select.querySelector('input[type="hidden"]');

        // Set initial placeholder class
        valueEl.classList.add('placeholder');

        // Toggle dropdown
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other open dropdowns
            customSelects.forEach(other => {
                if (other !== select) other.classList.remove('open');
            });
            select.classList.toggle('open');
        });

        // Option selection
        options.forEach(option => {
            option.addEventListener('click', () => {
                // Remove previous active
                options.forEach(o => o.classList.remove('active'));
                option.classList.add('active');

                // Update display text + hidden value
                valueEl.textContent = option.textContent;
                valueEl.classList.remove('placeholder');
                hiddenInput.value = option.dataset.value;

                // Remove error state if any
                select.classList.remove('error');

                // Close dropdown
                select.classList.remove('open');
            });
        });
    });

    // Close all dropdowns on outside click
    document.addEventListener('click', () => {
        customSelects.forEach(s => s.classList.remove('open'));
    });

    // Prevent clicks inside dropdown from bubbling
    document.querySelectorAll('.select-dropdown').forEach(dd => {
        dd.addEventListener('click', e => e.stopPropagation());
    });

    // ---- FORM VALIDATION & CONFIRMATION ----
    const regForm = document.getElementById('registrationForm');
    const overlay = document.getElementById('confirmOverlay');
    const closeBtn = document.getElementById('confirmClose');

    if (regForm && overlay) {
        regForm.addEventListener('submit', (e) => {
            e.preventDefault();

            let isValid = true;
            // Get all standard required inputs/textareas
            const requiredFields = regForm.querySelectorAll('input[required]:not([type="hidden"]), textarea[required]');

            // Reset previous errors
            regForm.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

            // 1. Check Standard Fields
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('error');
                }
            });

            // 2. Check Custom Selects
            customSelects.forEach(cs => {
                const hiddenInput = cs.querySelector('input[type="hidden"]');
                if (!hiddenInput || !hiddenInput.value) {
                    isValid = false;
                    cs.classList.add('error');
                }
            });

            // 3. Check Terms Checkbox
            const termsBox = document.getElementById('terms');
            if (termsBox && !termsBox.checked) {
                isValid = false;
                termsBox.parentElement.classList.add('error');
            }

            if (isValid) {
                overlay.classList.add('active');
                // Reset form
                regForm.reset();

                // Explicitly reset custom selects visuals
                customSelects.forEach(cs => {
                    const val = cs.querySelector('.select-value');
                    val.textContent = val.dataset.placeholder;
                    val.classList.add('placeholder');
                    cs.querySelector('input[type="hidden"]').value = '';
                    cs.querySelectorAll('.select-option').forEach(o => o.classList.remove('active'));
                });
            } else {
                // UI feedback for failed validation: shake the form
                regForm.classList.remove('shake');
                void regForm.offsetWidth; // Force reflow to restart animation
                regForm.classList.add('shake');
            }
        });

        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
        });

        // Close on overlay click (outside modal)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    }

    // ---- INITIAL FRAME ----
    // Run once on load so everything is positioned before user scrolls
    scrollY = window.scrollY;
    requestAnimationFrame(onFrame);

})();