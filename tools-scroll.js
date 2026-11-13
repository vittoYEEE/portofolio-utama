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

  if (
    !portal ||
    !baseLayer ||
    !revealLayer ||
    !baseContent ||
    !revealContent
  ) {
    return;
  }

  let portalFrame = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function updatePortal() {
    portalFrame = null;
    if (reducedMotion.matches) return;

    const rect = portal.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const scrollDistance = rect.height - viewportHeight;
    if (viewportHeight === 0 || scrollDistance <= 0) return;

    const progress = clamp(-rect.top / scrollDistance, 0, 1);
    const holdProgress = 0.35;
    const animationProgress = clamp(
      (progress - holdProgress) / (0.8 - holdProgress),
      0,
      1,
    );
    const revealProgress = clamp(animationProgress / 0.8, 0, 1);
    const easedReveal = 1 - (1 - revealProgress) ** 3;
    const baseProgress = clamp(animationProgress / 0.5, 0, 1);

    revealLayer.style.clipPath = `circle(${easedReveal * 100}% at 50% 50%)`;
    baseContent.style.transform = `scale(${1 + baseProgress * 1.4})`;
    baseContent.style.opacity = String(1 - baseProgress);
    revealContent.style.transform = `scale(${0.8 + easedReveal * 0.2})`;
  }

  function schedulePortalUpdate() {
    if (portalFrame !== null) return;
    portalFrame = window.requestAnimationFrame(updatePortal);
  }

  function renderReducedMotion() {
    if (reducedMotion.matches) {
      revealLayer.style.clipPath = "";
      baseContent.style.transform = "";
      baseContent.style.opacity = "";
      revealContent.style.transform = "";
      return;
    }

    schedulePortalUpdate();
  }

  function handleScroll() {
    schedulePortalUpdate();
  }

  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener(
    "resize",
    schedulePortalUpdate,
    { passive: true },
  );
  reducedMotion.addEventListener("change", renderReducedMotion);

  renderReducedMotion();
})();
