document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.getElementById("navbar") || document.querySelector(".navbar");
  const openMenuBtn = document.getElementById("openMenuBtn") || document.querySelector(".menu-btn");
  const menuOverlay = document.getElementById("menuOverlay") || document.querySelector(".menu-overlay");
  const menuItems = document.querySelectorAll(".menu-item");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const panels = Array.from(document.querySelectorAll(".page-panel"));
  const aboutSection = document.querySelector("#about");
  const scheduler = window.ScrollScheduler;
  const textRevealSelector =
    ".tools-portal-about-content :is(h1,h2,h3,h4,h5,h6,p,li,blockquote,.quote-signature)";
  const originalAriaLabels = new Map();
  let textBlocks = [];

  const clamp01 = (value) => Math.min(1, Math.max(0, value));

  // ---------------------------------------------------------------
  // 1. Efek hero mengecil + menggelap saat panel berikutnya naik
  //    (didaftarkan ke scheduler: baca dulu, tulis kemudian)
  // ---------------------------------------------------------------
  const stackingPairs = panels
    .map((panel, index) => ({
      content: panel.querySelector(".panel-content"),
      nextPanel: panels[index + 1] || null,
      transform: "",
      filter: "",
    }))
    .filter((pair) => pair.content);

  scheduler.add({
    read(viewportHeight, scrollY) {
      const progress = stackingPairs.map(({ nextPanel }) => {
        if (!nextPanel || reducedMotion.matches || viewportHeight === 0) {
          return null;
        }
        return clamp01(1 - nextPanel.getBoundingClientRect().top / viewportHeight);
      });
      return { progress, scrolled: scrollY > 50 };
    },

    write({ progress, scrolled }) {
      let changed = false;

      stackingPairs.forEach((pair, index) => {
        const value = progress[index];
        const transform = value === null ? "scale(1)" : `scale(${1 - value * 0.08})`;
        const filter = value === null ? "brightness(1)" : `brightness(${1 - value * 0.45})`;

        if (transform !== pair.transform) {
          pair.content.style.transform = transform;
          pair.transform = transform;
          changed = true;
        }
        if (filter !== pair.filter) {
          pair.content.style.filter = filter;
          pair.filter = filter;
          changed = true;
        }
      });

      if (navbar) navbar.classList.toggle("scrolled", scrolled);
      return changed;
    },
  });

  // ---------------------------------------------------------------
  // 2. Reveal teks kata per kata di section About
  // ---------------------------------------------------------------
  scheduler.add({
    read(viewportHeight) {
      if (!textBlocks.length || viewportHeight === 0 || reducedMotion.matches) {
        return null;
      }

      // Cukup baca posisi section About (satu elemen). Selama section ini
      // belum mencapai layar, semua kata pasti masih redup, jadi posisi tiap
      // blok teks tidak perlu dibaca satu per satu.
      const aboutRect = aboutSection
        ? aboutSection.getBoundingClientRect()
        : null;
      if (aboutRect) {
        if (aboutRect.bottom < -viewportHeight * 0.5) return null;
        if (aboutRect.top > viewportHeight) return textBlocks.map(() => 0);
      }

      return textBlocks.map((item) => {
        const rect = item.block.getBoundingClientRect();
        if (
          rect.bottom < -viewportHeight * 0.5 ||
          rect.top > viewportHeight * 1.5
        ) {
          return undefined;
        }
        return clamp01(
          (viewportHeight * 0.85 - rect.top) / (viewportHeight * 0.45),
        );
      });
    },

    write(progresses) {
      if (progresses.length !== textBlocks.length) return false;
      let changed = false;

      textBlocks.forEach((item, index) => {
        const progress = progresses[index];
        if (progress === undefined) return;
        if (Math.abs(progress - item.progress) < 0.0005) return;
        item.progress = progress;

        const wordCount = item.words.length;
        item.words.forEach((word, wordIndex) => {
          const wordProgress = clamp01(progress * wordCount - wordIndex);
          const opacity = (0.15 + 0.85 * wordProgress).toFixed(3);
          if (item.opacities[wordIndex] === opacity) return;
          item.opacities[wordIndex] = opacity;
          word.style.opacity = opacity;
          changed = true;
        });
      });

      return changed;
    },
  });

  reducedMotion.addEventListener("change", () => scheduler.schedule());

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

    const blocks = Array.from(
      document.querySelectorAll(textRevealSelector),
    ).filter((block) => !block.querySelector(textRevealSelector));

    blocks.forEach((block) => {
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

    // Daftar kata disimpan sekali di sini, tidak dicari ulang tiap frame.
    textBlocks = blocks.map((block) => {
      const words = Array.from(block.querySelectorAll(".word"));
      return {
        block,
        words,
        progress: 0,
        opacities: words.map(() => "0.150"),
      };
    });

    scheduler.schedule();
  }

  reducedMotion.addEventListener("change", initializeTextReveal);
  initializeTextReveal();

  // ---------------------------------------------------------------
  // 3. Preview gambar proyek yang mengikuti kursor
  // ---------------------------------------------------------------
  const projectEntries = Array.from(
    document.querySelectorAll("[data-project-entry]"),
  );
  const desktopHover = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  );

  // Ukuran preview disimpan sekali (saat kursor masuk), bukan dibaca ulang di
  // setiap gerakan mouse. Bounding box dihitung untuk kondisi akhir animasi
  // (rotasi -6deg, skala 1), sama seperti hasil getBoundingClientRect lama.
  const previewTilt = (6 * Math.PI) / 180;
  let previewSize = { width: 0, height: 0 };
  let activePreview = null;
  let pendingPoint = null;
  let previewFrame = null;

  function measurePreview(preview) {
    const w = preview.offsetWidth;
    const h = preview.offsetHeight;
    previewSize = {
      width: w * Math.cos(previewTilt) + h * Math.sin(previewTilt),
      height: h * Math.cos(previewTilt) + w * Math.sin(previewTilt),
    };
  }

  function applyPreviewPosition() {
    previewFrame = null;
    if (!activePreview || !pendingPoint) return;

    const { x, y } = pendingPoint;
    const gap = 24;
    let left = x + gap;
    if (left + previewSize.width > window.innerWidth - 16) {
      left = x - previewSize.width - gap;
    }
    left = Math.max(
      16,
      Math.min(window.innerWidth - previewSize.width - 16, left),
    );

    const halfHeight = previewSize.height / 2;
    const top = Math.min(
      window.innerHeight - halfHeight - 16,
      Math.max(halfHeight + 16, y),
    );

    // Pakai properti `translate` (tanpa layout ulang), bukan top/left.
    activePreview.style.translate = `${left}px ${top}px`;
  }

  function updateProjectPreviewPosition(entry, event) {
    const preview = entry.querySelector(".project-preview");
    if (!preview) return;

    activePreview = preview;
    pendingPoint = { x: event.clientX, y: event.clientY };
    if (previewFrame === null) {
      previewFrame = window.requestAnimationFrame(applyPreviewPosition);
    }
  }

  window.addEventListener(
    "resize",
    () => {
      if (activePreview) measurePreview(activePreview);
    },
    { passive: true },
  );

  projectEntries.forEach((entry) => {
    const row = entry.querySelector(".project-row");
    const preview = entry.querySelector(".project-preview");
    if (!row || !preview) return;

    entry.addEventListener("pointerenter", (event) => {
      if (!desktopHover.matches) return;
      entry.classList.add("is-active");
      preview.setAttribute("aria-hidden", "false");
      measurePreview(preview);
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

  function navigateToMenuItem(href, updateHistory = false) {
    const target = document.querySelector(href);
    if (!target) return;

    if (updateHistory && window.location.hash !== href) {
      window.history.pushState(null, "", href);
    }

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

  window.addEventListener("popstate", () => {
    const href = window.location.hash;
    if (href && document.querySelector(href)) {
      navigateToMenuItem(href);
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
  });

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
        if (href) navigateToMenuItem(href, true);
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