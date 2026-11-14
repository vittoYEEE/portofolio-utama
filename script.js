document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.getElementById("navbar") || document.querySelector(".navbar");
  const openMenuBtn = document.getElementById("openMenuBtn") || document.querySelector(".menu-btn");
  const menuOverlay = document.getElementById("menuOverlay") || document.querySelector(".menu-overlay");
  const menuItems = document.querySelectorAll(".menu-item");
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

  const projectEntries = Array.from(
    document.querySelectorAll("[data-project-entry]"),
  );
  const desktopHover = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  );

  function updateProjectPreviewPosition(entry, event) {
    const preview = entry.querySelector(".project-preview");
    if (!preview) return;

    const bounds = preview.getBoundingClientRect();
    const gap = 24;
    let left = event.clientX + gap;
    if (left + bounds.width > window.innerWidth - 16) {
      left = event.clientX - bounds.width - gap;
    }
    left = Math.max(16, Math.min(window.innerWidth - bounds.width - 16, left));

    const halfHeight = bounds.height / 2;
    const top = Math.min(
      window.innerHeight - halfHeight - 16,
      Math.max(halfHeight + 16, event.clientY),
    );
    preview.style.setProperty("--preview-x", `${left}px`);
    preview.style.setProperty("--preview-y", `${top}px`);
  }

  projectEntries.forEach((entry) => {
    const row = entry.querySelector(".project-row");
    const preview = entry.querySelector(".project-preview");
    if (!row || !preview) return;

    entry.addEventListener("pointerenter", (event) => {
      if (!desktopHover.matches) return;
      entry.classList.add("is-active");
      preview.setAttribute("aria-hidden", "false");
      updateProjectPreviewPosition(entry, event);
    });

    entry.addEventListener("pointermove", (event) => {
      if (desktopHover.matches) updateProjectPreviewPosition(entry, event);
    });

    entry.addEventListener("pointerleave", () => {
      entry.classList.remove("is-active");
      if (!entry.contains(document.activeElement)) {
        preview.setAttribute("aria-hidden", "true");
      }
    });

    entry.addEventListener("focusin", () => {
      if (!desktopHover.matches) return;
      entry.classList.add("is-active");
      preview.setAttribute("aria-hidden", "false");
    });

    entry.addEventListener("focusout", (event) => {
      if (entry.contains(event.relatedTarget)) return;
      entry.classList.remove("is-active");
      preview.setAttribute("aria-hidden", "true");
    });

    row.addEventListener("click", () => {
      if (desktopHover.matches) return;

      const shouldOpen = !entry.classList.contains("is-open");
      projectEntries.forEach((otherEntry) => {
        otherEntry.classList.remove("is-open");
        otherEntry.querySelector(".project-row")?.setAttribute(
          "aria-expanded",
          "false",
        );
        otherEntry.querySelector(".project-preview")?.setAttribute(
          "aria-hidden",
          "true",
        );
      });

      if (shouldOpen) {
        entry.classList.add("is-open");
        row.setAttribute("aria-expanded", "true");
        preview.setAttribute("aria-hidden", "false");
      }
    });
  });

  if (projectEntries.length) {
    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      projectEntries.forEach((entry) => entry.classList.add("is-visible"));
    } else {
      const projectObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.16 },
      );

      projectEntries.forEach((entry) => projectObserver.observe(entry));
      reducedMotion.addEventListener("change", (event) => {
        if (!event.matches) return;
        projectObserver.disconnect();
        projectEntries.forEach((entry) => entry.classList.add("is-visible"));
      });
    }
  }

  let menuClosing = false;

  function openMenu() {
    if (!menuOverlay || menuClosing) return;
    menuOverlay.style.pointerEvents = "";
    menuOverlay.classList.remove("closing");
    menuOverlay.classList.add("active");
    menuOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("menu-open");
    if (openMenuBtn) {
      openMenuBtn.classList.add("is-open");
      openMenuBtn.setAttribute("aria-expanded", "true");
      openMenuBtn.setAttribute("aria-label", "Tutup Menu");
    }
  }

  function navigateToMenuItem(href) {
    const target = document.querySelector(href);
    if (!target) return;

    let targetScroll = window.scrollY + target.getBoundingClientRect().top;
    if (href === "#tools") {
      const portal = document.querySelector("#about [data-tools-portal]");
      if (portal) {
        const scrollDistance = portal.offsetHeight - window.innerHeight;
        targetScroll =
          window.scrollY +
          portal.getBoundingClientRect().top +
          scrollDistance * 0.88;
      }
    }

    window.scrollTo({
      top: targetScroll,
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
  }

  function closeMenu(href) {
    if (
      !menuOverlay ||
      !menuOverlay.classList.contains("active") ||
      menuClosing
    ) {
      return;
    }

    menuClosing = true;
    menuOverlay.classList.add("closing");
    menuOverlay.setAttribute("aria-hidden", "true");
    menuOverlay.style.pointerEvents = "none";

    const linkExitDuration = reducedMotion.matches ? 0 : 460;
    const curtainDuration = reducedMotion.matches ? 0 : 640;
    window.setTimeout(() => {
      menuOverlay.classList.remove("active");
      window.setTimeout(() => {
        menuOverlay.classList.remove("closing");
        menuOverlay.style.pointerEvents = "";
        document.body.classList.remove("menu-open");
        if (openMenuBtn) {
          openMenuBtn.classList.remove("is-open");
          openMenuBtn.setAttribute("aria-expanded", "false");
          openMenuBtn.setAttribute("aria-label", "Buka Menu");
          openMenuBtn.focus();
        }
        menuClosing = false;
        if (href) navigateToMenuItem(href);
      }, curtainDuration);
    }, linkExitDuration);
  }

  if (openMenuBtn) {
    openMenuBtn.addEventListener("click", () => {
      if (menuClosing) return;
      if (menuOverlay && menuOverlay.classList.contains("active")) {
        closeMenu();
      } else {
        openMenu();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      menuOverlay &&
      menuOverlay.classList.contains("active")
    ) {
      closeMenu();
    }
  });

  menuItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      closeMenu(item.getAttribute("href"));
    });
  });
});