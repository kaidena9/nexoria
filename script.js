/* =========================================================
   Nexoria — interactions
   - Hero grid parallax (subtle scroll-driven shift)
   - Sticky header state on scroll
   - Mobile nav toggle
   - Reveal-on-scroll
   - Contact form basic UX
   - Reduced-motion guards
   ========================================================= */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isNarrow = window.matchMedia("(max-width: 760px)").matches;

  // ---------------------------------------------------------
  // 1. Hero grid parallax — single rAF loop, subtle vertical drift
  // ---------------------------------------------------------
  const heroEl = document.querySelector(".hero");
  const gridLayers = Array.from(document.querySelectorAll(".grid-layer"));

  let parallaxTicking = false;

  function applyParallax() {
    if (!heroEl) { parallaxTicking = false; return; }
    const rect = heroEl.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      parallaxTicking = false;
      return;
    }
    const scrolled = Math.max(0, -rect.top);
    for (const layer of gridLayers) {
      const speed = parseFloat(layer.dataset.parallax || "0.1");
      const y = -(scrolled * speed);
      layer.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    }
    parallaxTicking = false;
  }

  function onScrollParallax() {
    if (parallaxTicking || reduceMotion || isNarrow) return;
    parallaxTicking = true;
    requestAnimationFrame(applyParallax);
  }

  if (heroEl && gridLayers.length && !reduceMotion && !isNarrow) {
    requestAnimationFrame(applyParallax);
    window.addEventListener("scroll", onScrollParallax, { passive: true });
    window.addEventListener("resize", onScrollParallax, { passive: true });
  }

  // ---------------------------------------------------------
  // 2. Sticky header — add solid state after scrolling past hero edge
  // ---------------------------------------------------------
  const header = document.getElementById("siteHeader");
  if (header) {
    const setHeaderState = () => {
      if (window.scrollY > 24) header.classList.add("is-scrolled");
      else header.classList.remove("is-scrolled");
    };
    setHeaderState();
    window.addEventListener("scroll", setHeaderState, { passive: true });
  }

  // ---------------------------------------------------------
  // 3. Mobile nav toggle
  // ---------------------------------------------------------
  const navToggle = document.getElementById("navToggle");
  const mobileNav = document.getElementById("mobileNav");

  if (navToggle && mobileNav) {
    const setOpen = (open) => {
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      mobileNav.hidden = !open;
      document.body.style.overflow = open ? "hidden" : "";
    };
    navToggle.addEventListener("click", () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      setOpen(!isOpen);
    });
    // Close after tapping a nav link
    mobileNav.addEventListener("click", (e) => {
      const target = e.target;
      if (target instanceof HTMLAnchorElement) setOpen(false);
    });
    // Close on resize up to desktop
    window.addEventListener("resize", () => {
      if (window.innerWidth > 960) setOpen(false);
    });
  }

  // ---------------------------------------------------------
  // 4. Reveal-on-scroll — light, IntersectionObserver-based
  // ---------------------------------------------------------
  const revealTargets = document.querySelectorAll(
    ".section-head, .service, .work-item, .process-list li, .contact-form, .contact-direct"
  );
  revealTargets.forEach((el) => el.classList.add("reveal"));

  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  }

  // ---------------------------------------------------------
  // 5. Contact form — graceful client-side feedback
  //    (Replace handler with your real endpoint, e.g. Formspree)
  // ---------------------------------------------------------
  const form = document.getElementById("contactForm");
  const status = document.getElementById("formStatus");

  if (form && status) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      status.classList.remove("is-error");

      const data = new FormData(form);
      const name = (data.get("name") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const message = (data.get("message") || "").toString().trim();

      if (!name || !email || !message) {
        status.textContent = "Please fill in your name, email, and a short message.";
        status.classList.add("is-error");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.textContent = "That email address doesn't look quite right.";
        status.classList.add("is-error");
        return;
      }

      // Placeholder: open a prefilled mail draft so the form works even without a backend.
      const subject = encodeURIComponent(`New inquiry — ${name}`);
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\nCompany: ${(data.get("company") || "").toString()}\n\n${message}`
      );
      window.location.href = `mailto:hello@nexoria.studio?subject=${subject}&body=${body}`;

      status.textContent = "Opening your email client…";
      form.reset();
    });
  }

  // ---------------------------------------------------------
  // 6. Footer year
  // ---------------------------------------------------------
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---------------------------------------------------------
  // 7. Logo background cleaner — retained as a utility in case future
  //    image-based brand marks return with the JPEG checker pattern.
  //    Currently no <img data-clean-bg> elements use it.
  // ---------------------------------------------------------
  function cleanLogoBg(img) {
    const mode = (img.getAttribute("data-clean-bg") || "edge").toLowerCase();
    const reveal = () => img.classList.add("is-ready");

    const finalize = () => {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      if (!W || !H) { reveal(); return; }

      let canvas, ctx, imgData, data;
      try {
        canvas = document.createElement("canvas");
        canvas.width = W; canvas.height = H;
        ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        imgData = ctx.getImageData(0, 0, W, H);
        data = imgData.data;
      } catch (e) {
        // Canvas tainted (file:// without server) — show original.
        reveal();
        return;
      }

      const isCheckerPixel = (idx) => {
        const i = idx * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const avg = (r + g + b) / 3;
        if (avg < 175) return false;
        return Math.abs(r - avg) < 24
            && Math.abs(g - avg) < 24
            && Math.abs(b - avg) < 24;
      };

      if (mode === "global") {
        // Wordmark: nuke every near-gray pixel anywhere (kills letter counters).
        for (let idx = 0; idx < W * H; idx++) {
          if (isCheckerPixel(idx)) data[idx * 4 + 3] = 0;
        }
      } else {
        // Icon: edge-flood-fill only. Preserves interior whites.
        const visited = new Uint8Array(W * H);
        const stack = [];
        const seed = (sx, sy) => {
          if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;
          const idx = sy * W + sx;
          if (visited[idx] || !isCheckerPixel(idx)) return;
          visited[idx] = 1;
          stack.push(idx);
        };
        for (let x = 0; x < W; x += 2) { seed(x, 0); seed(x, H - 1); }
        for (let y = 0; y < H; y += 2) { seed(0, y); seed(W - 1, y); }

        while (stack.length) {
          const idx = stack.pop();
          data[idx * 4 + 3] = 0;
          const x = idx % W;
          const y = (idx / W) | 0;
          let n;
          if (x > 0)     { n = idx - 1; if (!visited[n] && isCheckerPixel(n)) { visited[n] = 1; stack.push(n); } }
          if (x < W - 1) { n = idx + 1; if (!visited[n] && isCheckerPixel(n)) { visited[n] = 1; stack.push(n); } }
          if (y > 0)     { n = idx - W; if (!visited[n] && isCheckerPixel(n)) { visited[n] = 1; stack.push(n); } }
          if (y < H - 1) { n = idx + W; if (!visited[n] && isCheckerPixel(n)) { visited[n] = 1; stack.push(n); } }
        }
      }

      // Find bounding box of remaining (non-transparent) pixels
      let minX = W, minY = H, maxX = -1, maxY = -1;
      for (let y = 0; y < H; y++) {
        const row = y * W;
        for (let x = 0; x < W; x++) {
          if (data[(row + x) * 4 + 3] > 0) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);

      let out = canvas;
      if (maxX > minX && maxY > minY) {
        const cw = maxX - minX + 1;
        const ch = maxY - minY + 1;
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = cw;
        cropCanvas.height = ch;
        cropCanvas.getContext("2d").drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
        out = cropCanvas;
      }

      img.src = out.toDataURL("image/png");
      img.addEventListener("load", reveal, { once: true });
    };

    if (img.complete && img.naturalWidth) finalize();
    else img.addEventListener("load", finalize, { once: true });
    img.addEventListener("error", reveal, { once: true });
  }

  document.querySelectorAll("img[data-clean-bg]").forEach(cleanLogoBg);
})();
