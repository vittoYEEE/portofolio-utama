(() => {
  const CONFIG = Object.freeze({
    font: "600 16px Poppins",
    fontWaitMs: 1500,
    wordRevealDurationMs: 850,
    wheelDelayMs: [300, 1300],
    dividerDelayMs: 1200,
    underlineDurationMs: 600,
    numberDurationMs: 300,
    blobDurationMs: [18000, 21000, 23000, 19000],
    textExitAtMs: 4500,
    textExitDurationMs: 500,
    sweepAtMs: 4850,
    sweepDurationMs: 1150,
    hideAtMs: 6200,
  });

  const loader = document.getElementById("loader");
  if (!loader) return;

  const root = document.documentElement;
  const body = document.body;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const previousRootOverflow = root.style.overflow;
  const previousBodyOverflow = body.style.overflow;

  root.style.overflow = "hidden";
  body.style.overflow = "hidden";

  function setDuration(name, value) {
    loader.style.setProperty(name, `${value}ms`);
  }

  setDuration("--ld-word-reveal-duration", CONFIG.wordRevealDurationMs);
  setDuration("--ld-underline-duration", CONFIG.underlineDurationMs);
  setDuration("--ld-number-duration", CONFIG.numberDurationMs);
  setDuration("--ld-divider-delay", CONFIG.dividerDelayMs);
  setDuration("--ld-exit-text-duration", CONFIG.textExitDurationMs);
  setDuration("--ld-sweep-duration", CONFIG.sweepDurationMs);

  CONFIG.wheelDelayMs.forEach((delay, index) => {
    setDuration(`--ld-wheel-${index + 1}-delay`, delay);
  });
  CONFIG.blobDurationMs.forEach((duration, index) => {
    setDuration(`--ld-blob-${index + 1}-duration`, duration);
  });

  async function waitForFont() {
    if (!document.fonts) return;

    let timeoutId;
    const fontPromise = document.fonts
      .load(CONFIG.font)
      .catch((error) => {
        console.warn("Preloader font could not be loaded; using fallback.", error);
      });
    const timeoutPromise = new Promise((resolve) => {
      timeoutId = window.setTimeout(resolve, CONFIG.fontWaitMs);
    });

    await Promise.race([fontPromise, timeoutPromise]);
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }

  function finish() {
    loader.classList.add("ld-finished");
    loader.setAttribute("aria-hidden", "true");
    loader.style.visibility = "hidden";
    loader.style.pointerEvents = "none";
    root.style.overflow = previousRootOverflow;
    body.style.overflow = previousBodyOverflow;
  }

  async function start() {
    await waitForFont();
    loader.classList.add("ld-started");

    window.setTimeout(
      () => loader.classList.add("ld-exit-text"),
      CONFIG.textExitAtMs,
    );
    window.setTimeout(() => {
      loader.classList.add(
        reducedMotion.matches ? "ld-exiting" : "ld-sweeping",
      );
    }, CONFIG.sweepAtMs);
    window.setTimeout(finish, CONFIG.hideAtMs);
  }

  void start();
})();
