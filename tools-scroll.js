(() => {
  const aboutPage = document.querySelector("#about");
  if (!aboutPage) return;

  const portal = aboutPage.querySelector("[data-tools-portal]");
  const baseLayer = aboutPage.querySelector(".tools-portal-base");
  const revealLayer = aboutPage.querySelector(".tools-portal-reveal");
  const baseContent = aboutPage.querySelector(".tools-portal-base-content");
  const revealContent = aboutPage.querySelector(
    ".tools-portal-reveal-content",
  );
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const scheduler = window.ScrollScheduler;

  if (
    !portal ||
    !baseLayer ||
    !revealLayer ||
    !baseContent ||
    !revealContent ||
    !scheduler
  ) {
    return;
  }

  // Nilai terakhir yang ditulis ke DOM. Kalau nilainya sama, tidak ditulis ulang.
  let lastClip = "";
  let lastBaseTransform = "";
  let lastBaseOpacity = "";
  let lastRevealTransform = "";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  scheduler.add({
    read(viewportHeight) {
      if (reducedMotion.matches || viewportHeight === 0) return null;

      // Tinggi dan posisi #about sama persis dengan portal (tidak ada padding),
      // jadi cukup baca #about. Ini menghindari browser menghitung layout isi
      // section yang sedang dilewati content-visibility.
      const rect = aboutPage.getBoundingClientRect();
      const scrollDistance = rect.height - viewportHeight;
      if (scrollDistance <= 0) return null;

      const scrollProgress = clamp(-rect.top / scrollDistance, 0, 1);
      const holdProgress = 0.25;
      const revealEndProgress = 0.85;
      const revealProgress = clamp(
        (scrollProgress - holdProgress) / (revealEndProgress - holdProgress),
        0,
        1,
      );
      const easedReveal =
        revealProgress * revealProgress * (3 - 2 * revealProgress);
      const baseProgress = clamp(revealProgress / 0.85, 0, 1);

      return { easedReveal, baseProgress };
    },

    write({ easedReveal, baseProgress }) {
      const clip = `circle(${easedReveal * 100}% at 50% 50%)`;
      const baseTransform = `scale(${1 + baseProgress * 1.4})`;
      const baseOpacity = String(1 - baseProgress);
      const revealTransform = `scale(${0.8 + easedReveal * 0.2})`;
      let changed = false;

      if (clip !== lastClip) {
        revealLayer.style.clipPath = clip;
        lastClip = clip;
        changed = true;
      }
      if (baseTransform !== lastBaseTransform) {
        baseContent.style.transform = baseTransform;
        lastBaseTransform = baseTransform;
        changed = true;
      }
      if (baseOpacity !== lastBaseOpacity) {
        baseContent.style.opacity = baseOpacity;
        lastBaseOpacity = baseOpacity;
        changed = true;
      }
      if (revealTransform !== lastRevealTransform) {
        revealContent.style.transform = revealTransform;
        lastRevealTransform = revealTransform;
        changed = true;
      }

      return changed;
    },
  });

  function renderReducedMotion() {
    if (reducedMotion.matches) {
      revealLayer.style.clipPath = "";
      baseContent.style.transform = "";
      baseContent.style.opacity = "";
      revealContent.style.transform = "";
      lastClip = lastBaseTransform = lastBaseOpacity = lastRevealTransform = "";
      return;
    }

    scheduler.schedule();
  }

  reducedMotion.addEventListener("change", renderReducedMotion);
  renderReducedMotion();
})();
