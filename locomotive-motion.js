document.addEventListener("DOMContentLoaded", () => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (start, end, factor) => start + (end - start) * factor;

  // -----------------------------------------------------------------
  // 1. Inisialisasi Locomotive Scroll v5
  // -----------------------------------------------------------------
  let locoInstance = null;

  function initLocomotiveScroll() {
    if (reducedMotion.matches || typeof window.LocomotiveScroll !== "function") {
      return;
    }

    try {
      locoInstance = new window.LocomotiveScroll({
        lenisOptions: {
          lerp: 0.085,
          duration: 1.15,
          smoothWheel: true,
          wheelMultiplier: 1,
          touchMultiplier: 1.5,
        },
        scrollCallback() {
          if (window.ScrollScheduler) {
            window.ScrollScheduler.schedule();
          }
          scheduleDisplayMotion();
        },
      });

      const loader = document.getElementById("loader");
      if (loader && !loader.classList.contains("ld-finished")) {
        locoInstance.stop();
        window.addEventListener(
          "portfolio:loader-finished",
          () => {
            locoInstance?.start();
            locoInstance?.resize();
          },
          { once: true },
        );
      }

      // Sinkronkan kunci scroll saat Menu Navigasi atau Modal Review terbuka
      const bodyObserver = new MutationObserver(() => {
        if (!locoInstance) return;
        const isLocked =
          document.body.classList.contains("menu-open") ||
          document.body.classList.contains("modal-open");
        if (isLocked) {
          locoInstance.stop();
        } else {
          locoInstance.start();
        }
      });

      bodyObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
      });
    } catch (err) {
      console.warn("Locomotive Scroll fallback ke native scroll:", err);
    }
  }

  // Helper global agar navigasi menu & resize section tetap terhubung
  window.VenetoLocoScroll = {
    get instance() {
      return locoInstance;
    },
    scrollTo(target, options = {}) {
      if (locoInstance && typeof locoInstance.scrollTo === "function") {
        locoInstance.scrollTo(target, {
          duration: 1.15,
          ...options,
        });
        return;
      }

      if (typeof target === "number") {
        window.scrollTo({
          top: target,
          behavior: reducedMotion.matches ? "auto" : "smooth",
        });
      } else if (target instanceof Element) {
        const top = window.scrollY + target.getBoundingClientRect().top;
        window.scrollTo({
          top,
          behavior: reducedMotion.matches ? "auto" : "smooth",
        });
      }
    },
    resize() {
      if (locoInstance && typeof locoInstance.resize === "function") {
        locoInstance.resize();
      }
    },
  };

  initLocomotiveScroll();

  // -----------------------------------------------------------------
  // 2. Gerakan Halus (Kinetic Parallax) untuk SEMUA Tulisan Besar
  // -----------------------------------------------------------------
  const heroSection = document.getElementById("home");
  const heroPort = document.querySelector(".hero-title .line-port");
  const heroFolio = document.querySelector(".hero-title .line-folio");

  const aboutSection = document.getElementById("about");
  const aboutTitle = document.querySelector(".about-title");

  const toolsSection = document.getElementById("tools");
  const toolsTitle = document.querySelector(".tools-title");

  const projectsOutro = document.querySelector(".projects-outro");
  const projectsTitle = document.querySelector(".projects-outro h2");

  const testimonialsSection = document.getElementById("testimonials");
  const testimonialsTitle = document.querySelector(
    ".testimonials-bottom-display h2",
  );

  const contactSection = document.getElementById("contact");
  const contactTitle = document.querySelector(".contact-bottom-display h2");

  const motionItems = [
    {
      el: heroPort,
      getTarget(vh, vw) {
        if (!heroSection || vh === 0) return { x: 0, y: 0 };
        const rect = heroSection.getBoundingClientRect();
        const progress = clamp(-rect.top / vh, 0, 1.2);
        const shiftX = Math.min(vw * 0.08, 110);
        return {
          x: -progress * shiftX,
          y: -progress * 26,
        };
      },
      curX: 0,
      curY: 0,
    },
    {
      el: heroFolio,
      getTarget(vh, vw) {
        if (!heroSection || vh === 0) return { x: 0, y: 0 };
        const rect = heroSection.getBoundingClientRect();
        const progress = clamp(-rect.top / vh, 0, 1.2);
        const shiftX = Math.min(vw * 0.08, 110);
        return {
          x: progress * shiftX,
          y: -progress * 18,
        };
      },
      curX: 0,
      curY: 0,
    },
    {
      el: aboutTitle,
      getTarget(vh, vw) {
        if (!aboutSection || vh === 0) return { x: 0, y: 0 };
        const rect = aboutSection.getBoundingClientRect();
        const progress = clamp((vh - rect.top) / (vh * 1.4), -1, 1);
        const shiftX = Math.min(vw * 0.065, 95);
        return {
          x: (0.5 - progress) * shiftX,
          y: (0.5 - progress) * 18,
        };
      },
      curX: 0,
      curY: 0,
    },
    {
      el: toolsTitle,
      getTarget(vh, vw) {
        if (!aboutSection || vh === 0) return { x: 0, y: 0 };
        const portal = aboutSection.querySelector("[data-tools-portal]");
        const targetEl = portal || toolsSection || aboutSection;
        const rect = targetEl.getBoundingClientRect();
        const total = Math.max(1, rect.height - vh);
        const progress = clamp(-rect.top / total, 0, 1);
        const shiftX = Math.min(vw * 0.075, 110);
        return {
          x: (1 - progress) * shiftX - shiftX * 0.25,
          y: (1 - progress) * 20,
        };
      },
      curX: 0,
      curY: 0,
    },
    {
      el: projectsTitle,
      getTarget(vh, vw) {
        const container = projectsOutro || projectsTitle;
        if (!container || vh === 0) return { x: 0, y: 0 };
        const rect = container.getBoundingClientRect();
        const centerOffset = (rect.top + rect.height * 0.5 - vh * 0.5) / vh;
        const clamped = clamp(centerOffset, -1.2, 1.2);
        const shiftX = Math.min(vw * 0.075, 115);
        return {
          x: clamped * shiftX,
          y: clamped * 16,
        };
      },
      curX: 0,
      curY: 0,
    },
    {
      el: testimonialsTitle,
      getTarget(vh, vw) {
        if (!testimonialsSection || vh === 0) return { x: 0, y: 0 };
        const rect = testimonialsSection.getBoundingClientRect();
        const scrollDistance = rect.height - vh;
        const shiftX = Math.min(vw * 0.09, 130);

        if (scrollDistance > 20) {
          const progress = clamp(-rect.top / scrollDistance, 0, 1);
          return {
            x: (0.5 - progress) * shiftX * 1.4,
            y: 0,
          };
        }

        const centerOffset = (rect.top + rect.height * 0.5 - vh * 0.5) / vh;
        return {
          x: clamp(centerOffset, -1, 1) * shiftX,
          y: 0,
        };
      },
      curX: 0,
      curY: 0,
    },
    {
      el: contactTitle,
      getTarget(vh, vw) {
        if (!contactSection || vh === 0) return { x: 0, y: 0 };
        const rect = contactSection.getBoundingClientRect();
        const progress = clamp((vh - rect.top) / (vh * 1.15), 0, 1);
        const shiftX = Math.min(vw * 0.07, 105);
        return {
          x: (1 - progress) * shiftX - shiftX * 0.2,
          y: (1 - progress) * 18,
        };
      },
      curX: 0,
      curY: 0,
    },
  ].filter((item) => item.el);

  let displayRafId = null;

  function renderDisplayMotion() {
    displayRafId = null;

    if (reducedMotion.matches) {
      motionItems.forEach((item) => {
        item.el.style.transform = "";
      });
      return;
    }

    const vh = window.innerHeight;
    const vw = window.innerWidth;
    let needsNextFrame = false;

    motionItems.forEach((item) => {
      const target = item.getTarget(vh, vw);
      item.curX = lerp(item.curX, target.x, 0.11);
      item.curY = lerp(item.curY, target.y, 0.11);

      if (
        Math.abs(target.x - item.curX) > 0.08 ||
        Math.abs(target.y - item.curY) > 0.08
      ) {
        needsNextFrame = true;
      } else {
        item.curX = target.x;
        item.curY = target.y;
      }

      item.el.style.transform = `translate3d(${item.curX.toFixed(2)}px, ${item.curY.toFixed(2)}px, 0)`;
    });

    if (needsNextFrame) {
      displayRafId = window.requestAnimationFrame(renderDisplayMotion);
    }
  }

  function scheduleDisplayMotion() {
    if (displayRafId === null) {
      displayRafId = window.requestAnimationFrame(renderDisplayMotion);
    }
  }

  window.addEventListener("scroll", scheduleDisplayMotion, { passive: true });
  window.addEventListener(
    "resize",
    () => {
      window.VenetoLocoScroll.resize();
      scheduleDisplayMotion();
    },
    { passive: true },
  );
  reducedMotion.addEventListener("change", scheduleDisplayMotion);

  scheduleDisplayMotion();
});
