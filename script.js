/* =========================================================
   Nexoria — interactions
   - Hero particle network (slow drifting dots + connections)
   - Sticky header state on scroll
   - Mobile nav toggle
   - Reveal-on-scroll
   - Contact form basic UX
   - Reduced-motion guards
   ========================================================= */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------
  // 1. Hero particle network — calm, slow, connecting dots
  // ---------------------------------------------------------
  const heroEl = document.querySelector(".hero");
  const canvas = document.getElementById("heroNetwork");

  if (heroEl && canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0, h = 0;
    let particles = [];
    let pulses = [];
    let lastPulseAt = 0;
    let running = false;
    let inView = true;
    let rafId = 0;

    // Tune for "calm, not distracting":
    //  - slow drift velocity
    //  - moderate density (auto-scales with viewport)
    //  - lines fade out with distance
    const SPEED = 0.18;        // px/frame — slow
    const DOT_RADIUS = 2.2;
    const DOT_COLOR = "rgba(235, 244, 255, 0.98)";
    const DOT_HALO  = "rgba(150, 190, 245, 0.35)";
    const LINE_BASE = "190, 215, 245"; // soft blue-white

    // Traveling pulses — bright dots that ride along a connection
    const PULSE_INTERVAL = 650;   // ms between spawn attempts
    const MAX_PULSES = 9;
    const PULSE_MIN_MS = 1800;
    const PULSE_MAX_MS = 3000;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width  = Math.round(w * DPR);
      canvas.height = Math.round(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      // Density: roughly one dot per ~22k CSS px², clamped
      const target = Math.round((w * h) / 22000);
      const count = Math.max(30, Math.min(95, target));

      // Tune connection distance to viewport — shorter on small screens
      window.__nx_connectDist = Math.max(110, Math.min(165, Math.sqrt(w * h) / 9));

      seed(count);
    }

    function seed(count) {
      particles = [];
      pulses = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * SPEED,
          vy: (Math.random() - 0.5) * SPEED,
        });
      }
    }

    function maybeSpawnPulse(now, connectSq) {
      if (pulses.length >= MAX_PULSES) return;
      if (now - lastPulseAt < PULSE_INTERVAL) return;
      // Try a few random pairs; pick the first one that's currently connected.
      for (let attempt = 0; attempt < 14; attempt++) {
        const i = (Math.random() * particles.length) | 0;
        let j = (Math.random() * particles.length) | 0;
        if (i === j) continue;
        const a = particles[i], b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        if (dx * dx + dy * dy < connectSq) {
          pulses.push({
            i, j,
            start: now,
            dur: PULSE_MIN_MS + Math.random() * (PULSE_MAX_MS - PULSE_MIN_MS),
          });
          lastPulseAt = now;
          return;
        }
      }
    }

    function frame(now) {
      const connectDist = window.__nx_connectDist;
      const connectSq = connectDist * connectDist;

      ctx.clearRect(0, 0, w, h);

      // Move + bounce
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) { p.x = 0; p.vx = -p.vx; }
        else if (p.x > w) { p.x = w; p.vx = -p.vx; }
        if (p.y < 0) { p.y = 0; p.vy = -p.vy; }
        else if (p.y > h) { p.y = h; p.vy = -p.vy; }
      }

      // Connections — distance-aware alpha, drawn under dots
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < connectSq) {
            const t = 1 - Math.sqrt(d2) / connectDist;
            ctx.strokeStyle = `rgba(${LINE_BASE}, ${(t * 0.55).toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Dots with soft halo for brighter presence
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.fillStyle = DOT_HALO;
        ctx.beginPath();
        ctx.arc(p.x, p.y, DOT_RADIUS + 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = DOT_COLOR;
        ctx.beginPath();
        ctx.arc(p.x, p.y, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      // Traveling pulses — drawn last so they sit brightest
      maybeSpawnPulse(now, connectSq);
      for (let p = pulses.length - 1; p >= 0; p--) {
        const pulse = pulses[p];
        const t = (now - pulse.start) / pulse.dur;
        if (t >= 1) { pulses.splice(p, 1); continue; }
        const a = particles[pulse.i];
        const b = particles[pulse.j];
        if (!a || !b) { pulses.splice(p, 1); continue; }
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        const fade = Math.sin(t * Math.PI); // 0 → 1 → 0
        // halo
        ctx.fillStyle = `rgba(150, 195, 255, ${(fade * 0.45).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        // core
        ctx.fillStyle = `rgba(255, 255, 255, ${(fade * 0.95).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function loop(now) {
      if (!running) return;
      frame(now);
      rafId = requestAnimationFrame(loop);
    }

    function start() {
      if (running || !inView) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    }
    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    }

    // Init
    resize();

    if (reduceMotion) {
      // Render a single calm static frame — no motion, no pulses.
      frame(performance.now());
    } else {
      start();

      // Pause when hero leaves the viewport (perf)
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((entries) => {
          inView = entries[0].isIntersecting;
          if (inView) start(); else stop();
        }, { threshold: 0 });
        io.observe(heroEl);
      }

      // Pause when tab hidden
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) stop();
        else start();
      });
    }

    // Resize handling — debounced
    let resizeT;
    window.addEventListener("resize", () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        resize();
        if (reduceMotion) frame(performance.now());
      }, 120);
    });
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
  // 7. Logo background cleaner — strip the JPEG checker pattern
  //     Global pass: any near-gray bright pixel becomes transparent
  //     (clears the bg AND the gray inside letter counters), then
  //     auto-crops the transparent padding so the logo fills its box.
  // ---------------------------------------------------------
  function cleanLogoBg(img) {
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

      // Edge-flood-fill: only gray pixels reachable from the image border
      // become transparent. Interior whites (the N's strokes) stay opaque.
      const eligible = (idx) => {
        const i = idx * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const avg = (r + g + b) / 3;
        if (avg < 175) return false;
        return Math.abs(r - avg) < 24
            && Math.abs(g - avg) < 24
            && Math.abs(b - avg) < 24;
      };

      const visited = new Uint8Array(W * H);
      const stack = [];
      const seed = (sx, sy) => {
        if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;
        const idx = sy * W + sx;
        if (visited[idx] || !eligible(idx)) return;
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
        if (x > 0)     { n = idx - 1; if (!visited[n] && eligible(n)) { visited[n] = 1; stack.push(n); } }
        if (x < W - 1) { n = idx + 1; if (!visited[n] && eligible(n)) { visited[n] = 1; stack.push(n); } }
        if (y > 0)     { n = idx - W; if (!visited[n] && eligible(n)) { visited[n] = 1; stack.push(n); } }
        if (y < H - 1) { n = idx + W; if (!visited[n] && eligible(n)) { visited[n] = 1; stack.push(n); } }
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
