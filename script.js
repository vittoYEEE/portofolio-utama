document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.getElementById("navbar") || document.querySelector(".navbar");
  const openMenuBtn = document.getElementById("openMenuBtn") || document.querySelector(".menu-btn");
  const closeMenuBtn = document.getElementById("closeMenuBtn") || document.querySelector(".close-menu-btn");
  const menuOverlay = document.getElementById("menuOverlay") || document.querySelector(".menu-overlay");
  const menuNav = document.getElementById("menuNav") || document.querySelector(".menu-nav");
  const menuItems = document.querySelectorAll(".menu-item");
  const goBadge = document.getElementById("goBadge") || document.querySelector(".go-badge");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const panels = Array.from(document.querySelectorAll(".page-panel"));
  const textRevealSelector =
    ".tools-portal-about-content :is(h1,h2,h3,h4,h5,h6,p,li,blockquote,.quote-signature)";
  const originalAriaLabels = new Map();
  let textBlocks = [];
  let stackUpdateFrame = null;
  let textRevealFrame = null;

  function updateStackingPanels() {
    stackUpdateFrame = null;
    const viewportHeight = window.innerHeight;

    panels.forEach((panel, index) => {
      const content = panel.querySelector(".panel-content");
      if (!content) return;

      const nextPanel = panels[index + 1];
      if (!nextPanel || reducedMotion.matches || viewportHeight === 0) {
        content.style.transform = "scale(1)";
        content.style.filter = "brightness(1)";
        return;
      }

      const progress = Math.min(
        1,
        Math.max(0, 1 - nextPanel.getBoundingClientRect().top / viewportHeight),
      );
      content.style.transform = `scale(${1 - progress * 0.08})`;
      content.style.filter = `brightness(${1 - progress * 0.45})`;
    });

    if (navbar) navbar.classList.toggle("scrolled", window.scrollY > 50);
  }

  function scheduleStackingUpdate() {
    if (stackUpdateFrame !== null) return;
    stackUpdateFrame = window.requestAnimationFrame(updateStackingPanels);
  }

  window.addEventListener("scroll", scheduleStackingUpdate, { passive: true });
  window.addEventListener("resize", scheduleStackingUpdate, { passive: true });
  reducedMotion.addEventListener("change", scheduleStackingUpdate);
  scheduleStackingUpdate();

  function updateTextReveal() {
    textRevealFrame = null;
    const viewportHeight = window.innerHeight;
    if (viewportHeight === 0 || reducedMotion.matches) return;

    textBlocks.forEach((block) => {
      const rect = block.getBoundingClientRect();
      if (
        rect.bottom < -viewportHeight * 0.5 ||
        rect.top > viewportHeight * 1.5
      ) {
        return;
      }

      const progress = Math.min(
        1,
        Math.max(0, (viewportHeight * 0.85 - rect.top) / (viewportHeight * 0.45)),
      );
      const words = block.querySelectorAll(".word");
      const wordCount = words.length;

      words.forEach((word, index) => {
        const wordProgress = Math.min(
          1,
          Math.max(0, progress * wordCount - index),
        );
        word.style.opacity = String(0.15 + 0.85 * wordProgress);
      });
    });
  }

  function scheduleTextRevealUpdate() {
    if (textRevealFrame !== null) return;
    textRevealFrame = window.requestAnimationFrame(updateTextReveal);
  }

  function splitTextNode(textNode) {
    const parts = textNode.textContent.match(/\s+|\S+/g);
    if (!parts) return;

    const fragment = document.createDocumentFragment();
    parts.forEach((part) => {
      if (/^\s+$/.test(part)) {
        fragment.append(document.createTextNode(part));
        return;
      }

      const word = document.createElement("span");
      word.className = "word";
      word.setAttribute("aria-hidden", "true");
      word.textContent = part;
      word.style.opacity = "0.15";
      fragment.append(word);
    });

    textNode.replaceWith(fragment);
  }

  function restoreOriginalText() {
    textBlocks = [];

    document.querySelectorAll(".about-section .word").forEach((word) => {
      word.replaceWith(document.createTextNode(word.textContent));
    });

    originalAriaLabels.forEach((ariaLabel, block) => {
      if (ariaLabel === null) {
        block.removeAttribute("aria-label");
      } else {
        block.setAttribute("aria-label", ariaLabel);
      }
    });
    originalAriaLabels.clear();
  }

  function initializeTextReveal() {
    restoreOriginalText();
    if (reducedMotion.matches) return;

    textBlocks = Array.from(
      document.querySelectorAll(textRevealSelector),
    ).filter((block) => !block.querySelector(textRevealSelector));

    textBlocks.forEach((block) => {
      originalAriaLabels.set(block, block.getAttribute("aria-label"));
      block.setAttribute(
        "aria-label",
        block.textContent.replace(/\s+/g, " ").trim(),
      );

      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) {
        if (/\S/.test(walker.currentNode.textContent)) {
          textNodes.push(walker.currentNode);
        }
      }
      textNodes.forEach(splitTextNode);
    });

    scheduleTextRevealUpdate();
  }

  window.addEventListener("scroll", scheduleTextRevealUpdate, { passive: true });
  window.addEventListener("resize", scheduleTextRevealUpdate, { passive: true });
  document
    .querySelector(".about-section > .panel-content")
    ?.addEventListener("scroll", scheduleTextRevealUpdate, { passive: true });
  reducedMotion.addEventListener("change", initializeTextReveal);
  initializeTextReveal();

  // 2. Fungsi Buka & Tutup Halaman Menu Navigasi
  function openMenu() {
    if (!menuOverlay) return;
    menuOverlay.classList.add("active");
    menuOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("menu-open");
  }

  function closeMenu() {
    if (!menuOverlay) return;
    menuOverlay.classList.remove("active");
    menuOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("menu-open");
    hideCustomCursor();
  }

  if (openMenuBtn) openMenuBtn.addEventListener("click", openMenu);
  if (closeMenuBtn) closeMenuBtn.addEventListener("click", closeMenu);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuOverlay && menuOverlay.classList.contains("active")) {
      closeMenu();
    }
  });

  // 3. Sorotan Oranye pada Item Menu
  menuItems.forEach((item) => {
    item.addEventListener("mouseenter", () => {
      menuItems.forEach((el) => el.classList.remove("is-active"));
      item.classList.add("is-active");
    });

    item.addEventListener("click", (event) => {
      if (item.getAttribute("href") === "#tools") {
        const portal = document.querySelector("#about [data-tools-portal]");
        if (portal) {
          event.preventDefault();
          const scrollDistance = portal.offsetHeight - window.innerHeight;
          const targetScroll =
            window.scrollY +
            portal.getBoundingClientRect().top +
            scrollDistance * 0.88;
          window.scrollTo({
            top: targetScroll,
            behavior: reducedMotion.matches ? "auto" : "smooth",
          });
        }
      }

      closeMenu();
    });
  });

  // 4. Custom Cursor "GO ↗" Super Smooth (Lerp + RequestAnimationFrame)
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  let targetScale = 0;
  let currentScale = 0;
  let targetOpacity = 0;
  let currentOpacity = 0;
  let cursorFrame = null;

  let isInsideMenu = false;
  let hasInitializedPos = false;

  function scheduleCursorAnimation() {
    if (!goBadge || cursorFrame !== null) return;
    cursorFrame = window.requestAnimationFrame(animateCursor);
  }

  function showCustomCursor(e) {
    if (!goBadge) return;
    const halfW = goBadge.offsetWidth / 2;
    const halfH = goBadge.offsetHeight / 2;

    targetX = e.clientX - halfW;
    targetY = e.clientY - halfH;

    // Jika baru masuk area menu, langsung tempatkan titik awal tepat di kursor
    // agar lingkaran tidak terbang dari pojok kiri atas layar
    if (!hasInitializedPos) {
      currentX = targetX;
      currentY = targetY;
      hasInitializedPos = true;
    }

    isInsideMenu = true;
    targetScale = 1;
    targetOpacity = 1;
    scheduleCursorAnimation();
  }

  function hideCustomCursor() {
    isInsideMenu = false;
    targetScale = 0;
    targetOpacity = 0;
    scheduleCursorAnimation();
  }

  function animateCursor() {
    cursorFrame = null;
    const posEase = 0.16;
    const scaleEase = 0.2;

    currentX += (targetX - currentX) * posEase;
    currentY += (targetY - currentY) * posEase;
    currentScale += (targetScale - currentScale) * scaleEase;
    currentOpacity += (targetOpacity - currentOpacity) * scaleEase;

    goBadge.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0) scale(${currentScale.toFixed(3)})`;
    goBadge.style.opacity = currentOpacity.toFixed(3);

    if (
      Math.abs(targetX - currentX) > 0.1 ||
      Math.abs(targetY - currentY) > 0.1 ||
      Math.abs(targetScale - currentScale) > 0.001 ||
      Math.abs(targetOpacity - currentOpacity) > 0.001
    ) {
      scheduleCursorAnimation();
    }
  }

  if (menuNav && goBadge) {
    menuNav.addEventListener("mouseenter", showCustomCursor);
    menuNav.addEventListener("mousemove", showCustomCursor);
    menuNav.addEventListener("mouseleave", () => {
      hideCustomCursor();
      hasInitializedPos = false;
    });

    // Efek membesar sedikit saat diklik
    menuNav.addEventListener("mousedown", () => {
      if (isInsideMenu) {
        targetScale = 0.88;
        scheduleCursorAnimation();
      }
    });
    menuNav.addEventListener("mouseup", () => {
      if (isInsideMenu) {
        targetScale = 1;
        scheduleCursorAnimation();
      }
    });

    // Sembunyikan juga jika kursor keluar dari jendela browser
    document.addEventListener("mouseleave", () => {
      hideCustomCursor();
      hasInitializedPos = false;
    });

  }
});