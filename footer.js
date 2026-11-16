document.addEventListener("DOMContentLoaded", () => {
  const curtainSection = document.getElementById("contact");
  const footer = document.getElementById("siteFooter");
  const parallaxLayer = document.getElementById("footerParallax");
  const footerGlow = document.getElementById("footerGlow");
  const revealItems = Array.from(
    document.querySelectorAll(".footer-reveal-item"),
  );
  const wordmarkChars = Array.from(
    document.querySelectorAll(".wordmark-char"),
  );
  const backToTopBtn = document.getElementById("backToTopBtn");
  const footerNavLinks = Array.from(
    document.querySelectorAll('.footer-nav-list a[href^="#"]'),
  );
  const reducedMotionQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  if (!footer || !curtainSection) return;

  let footerHeight = 0;
  let rafPending = false;

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  // Beri margin-bottom pada section Contact setinggi footer untuk efek tirai
  function syncCurtainSpace() {
    if (reducedMotionQuery.matches) {
      curtainSection.style.marginBottom = "0px";
      footer.style.position = "relative";
      window.VenetoLocoScroll?.resize();
      return;
    }

    footer.style.position = "fixed";
    const nextHeight = footer.offsetHeight;
    if (nextHeight !== footerHeight) {
      footerHeight = nextHeight;
      curtainSection.style.marginBottom = `${footerHeight}px`;
      window.VenetoLocoScroll?.resize();
    }
  }

  // Hitung progres keterbukaan footer (0 sampai 1)
  function getRevealProgress() {
    if (reducedMotionQuery.matches || footerHeight <= 0) return 1;

    const docHeight = document.documentElement.scrollHeight;
    const maxScroll = Math.max(0, docHeight - window.innerHeight);
    const revealStart = Math.max(0, maxScroll - footerHeight);

    return clamp01((window.scrollY - revealStart) / footerHeight);
  }

  // Jalankan animasi berbasis transform & opacity
  function renderFooterFrame() {
    rafPending = false;

    if (reducedMotionQuery.matches) {
      if (parallaxLayer) parallaxLayer.style.transform = "none";
      if (footerGlow) {
        footerGlow.style.opacity = "0.75";
        footerGlow.style.transform = "translate3d(-50%, 0, 0) scale(1)";
      }
      revealItems.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      wordmarkChars.forEach((char) => {
        char.style.opacity = "1";
        char.style.transform = "translate3d(0, 14%, 0)";
      });
      return;
    }

    const progress = getRevealProgress();

    // 1. Parallax konten footer
    if (parallaxLayer) {
      const parallaxY = (1 - progress) * -36;
      parallaxLayer.style.transform = `translate3d(0, ${parallaxY.toFixed(2)}px, 0)`;
    }

    // 2. Glow oranye radial di bawah
    if (footerGlow) {
      const glowOpacity = 0.12 + progress * 0.88;
      const glowScale = 0.7 + progress * 0.36;
      footerGlow.style.opacity = glowOpacity.toFixed(3);
      footerGlow.style.transform = `translate3d(-50%, 0, 0) scale(${glowScale.toFixed(3)})`;
    }

    // 3. Reveal baris demi baris dari balik masking
    revealItems.forEach((el, idx) => {
      const delay = idx * 0.07;
      const localProgress = clamp01((progress - delay) / (1 - delay));
      const eased = easeOutCubic(localProgress);
      const translateY = (1 - eased) * 105;

      el.style.opacity = eased.toFixed(3);
      el.style.transform = `translate3d(0, ${translateY.toFixed(2)}%, 0)`;
    });

    // 4. Stagger huruf wordmark raksasa "veneto"
    const totalChars = wordmarkChars.length;
    wordmarkChars.forEach((char, idx) => {
      const start = 0.18 + (idx / totalChars) * 0.34;
      const localProgress = clamp01((progress - start) / (1 - start));
      const eased = easeOutCubic(localProgress);
      const currentY = 115 + (14 - 115) * eased;

      char.style.opacity = eased.toFixed(3);
      char.style.transform = `translate3d(0, ${currentY.toFixed(2)}%, 0)`;
    });
  }

  function requestRender() {
    if (!rafPending) {
      rafPending = true;
      window.requestAnimationFrame(renderFooterFrame);
    }
  }

  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener(
    "resize",
    () => {
      syncCurtainSpace();
      requestRender();
    },
    { passive: true },
  );

  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(() => {
      syncCurtainSpace();
      requestRender();
    });
    ro.observe(footer);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      syncCurtainSpace();
      requestRender();
    });
  }

  reducedMotionQuery.addEventListener("change", () => {
    syncCurtainSpace();
    requestRender();
  });

  // Navigasi halus dari link footer (terintegrasi dengan Locomotive Scroll)
  footerNavLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      const target = href ? document.querySelector(href) : null;
      if (!target) return;

      event.preventDefault();
      let targetTop = window.scrollY + target.getBoundingClientRect().top;

      if (href === "#tools") {
        const portal = document.querySelector("#about [data-tools-portal]");
        if (portal) {
          const dist = portal.offsetHeight - window.innerHeight;
          targetTop =
            window.scrollY + portal.getBoundingClientRect().top + dist * 0.88;
        }
      }

      if (window.VenetoLocoScroll) {
        window.VenetoLocoScroll.scrollTo(targetTop);
      } else {
        window.scrollTo({
          top: targetTop,
          behavior: reducedMotionQuery.matches ? "auto" : "smooth",
        });
      }
    });
  });

  // Tombol "Kembali ke atas"
  if (backToTopBtn) {
    backToTopBtn.addEventListener("click", () => {
      if (window.VenetoLocoScroll) {
        window.VenetoLocoScroll.scrollTo(0);
      } else {
        window.scrollTo({
          top: 0,
          behavior: reducedMotionQuery.matches ? "auto" : "smooth",
        });
      }
    });
  }

  syncCurtainSpace();
  renderFooterFrame();
});
