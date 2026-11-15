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
  // 3. Preview gambar proyek melayang (Smooth LERP + Trigger)
  // ---------------------------------------------------------------
  const projectList = document.getElementById("project-list");
  const projectEntries = Array.from(
    document.querySelectorAll("[data-project-entry]"),
  );
  const floatingPreview = document.getElementById("projectFloatingPreview");
  const floatingTrack = document.getElementById("projectFloatingTrack");
  const floatingSlides = floatingTrack
    ? Array.from(floatingTrack.querySelectorAll(".project-floating-slide"))
    : [];
  const desktopHover = window.matchMedia(
    "(hover: hover) and (pointer: fine)",
  );

  let isPreviewActive = false;
  let activeProjectIndex = 0;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let currentTilt = 0;
  let previewLoopId = null;
  let previewSize = { width: 330, height: 217 };

  function measureFloatingPreview() {
    if (!floatingPreview) return;
    const width = floatingPreview.offsetWidth || 330;
    const height = floatingPreview.offsetHeight || 217;
    previewSize = { width, height };
  }

  function computeClampedTarget(clientX, clientY) {
    const gap = 28;
    const margin = 20;
    const { width, height } = previewSize;

    // Muncul di sebelah kanan kursor secara default, geser ke kiri jika mentok layar kanan
    let x = clientX + gap;
    if (x + width > window.innerWidth - margin) {
      x = clientX - width - gap;
    }
    x = Math.max(margin, Math.min(window.innerWidth - width - margin, x));

    // Posisi vertikal sejajar kursor dengan batas aman atas & bawah viewport
    const halfH = height / 2;
    const y = Math.min(
      window.innerHeight - halfH - margin,
      Math.max(halfH + margin, clientY),
    );

    return { x, y };
  }

  function setActiveSlide(index) {
    if (!floatingTrack) return;
    const safeIndex = Math.max(
      0,
      Math.min(floatingSlides.length - 1, Number(index) || 0),
    );
    activeProjectIndex = safeIndex;
    floatingTrack.style.transform = `translate3d(0, -${safeIndex * 100}%, 0)`;

    floatingSlides.forEach((slide, slideIdx) => {
      slide.classList.toggle("is-current", slideIdx === safeIndex);
    });
  }

  function renderFloatingPreview() {
    if (!floatingPreview) {
      previewLoopId = null;
      return;
    }

    // LERP: gambar mengejar posisi target secara bertahap agar terasa melayang lembut
    const ease = reducedMotion.matches ? 1 : 0.11;
    const dx = targetX - currentX;
    const dy = targetY - currentY;

    currentX += dx * ease;
    currentY += dy * ease;

    // Kemiringan dinamis halus mengikuti arah & kecepatan geser mouse
    const targetTilt = reducedMotion.matches
      ? 0
      : Math.max(-7, Math.min(7, dx * 0.045));
    currentTilt += (targetTilt - currentTilt) * 0.14;

    floatingPreview.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0) translateY(-50%) rotate(${currentTilt.toFixed(2)}deg)`;

    const isSettled =
      Math.abs(dx) < 0.15 &&
      Math.abs(dy) < 0.15 &&
      Math.abs(targetTilt - currentTilt) < 0.05;

    if (!isPreviewActive && isSettled) {
      previewLoopId = null;
      return;
    }

    previewLoopId = window.requestAnimationFrame(renderFloatingPreview);
  }

  function startPreviewLoop() {
    if (previewLoopId === null) {
      previewLoopId = window.requestAnimationFrame(renderFloatingPreview);
    }
  }

  function openFloatingPreview(clientX, clientY, index) {
    if (!floatingPreview || !desktopHover.matches) return;

    measureFloatingPreview();
    const pos = computeClampedTarget(clientX, clientY);
    targetX = pos.x;
    targetY = pos.y;

    // Jika sebelumnya tidak aktif, mulai dari dekat titik kursor agar tidak terbang dari (0,0)
    if (!isPreviewActive) {
      currentX = pos.x;
      currentY = pos.y + 14;
      currentTilt = 0;
    }

    setActiveSlide(index);
    isPreviewActive = true;
    floatingPreview.classList.add("is-visible");
    floatingPreview.setAttribute("aria-hidden", "false");
    startPreviewLoop();
  }

  function closeFloatingPreview() {
    if (!floatingPreview) return;
    isPreviewActive = false;
    floatingPreview.classList.remove("is-visible");
    floatingPreview.setAttribute("aria-hidden", "true");
    projectEntries.forEach((entry) => entry.classList.remove("is-active"));
  }

  if (projectList && floatingPreview) {
    projectList.addEventListener("pointermove", (event) => {
      if (!desktopHover.matches) return;
      const pos = computeClampedTarget(event.clientX, event.clientY);
      targetX = pos.x;
      targetY = pos.y;
      if (!isPreviewActive) {
        const hoveredEntry = event.target.closest("[data-project-entry]");
        const idx = hoveredEntry ? hoveredEntry.getAttribute("data-index") : 0;
        openFloatingPreview(event.clientX, event.clientY, idx);
      } else {
        startPreviewLoop();
      }
    });

    projectList.addEventListener("pointerleave", () => {
      closeFloatingPreview();
    });
  }

  window.addEventListener(
    "resize",
    () => {
      measureFloatingPreview();
    },
    { passive: true },
  );

  projectEntries.forEach((entry, idx) => {
    const row = entry.querySelector(".project-row");
    const mobilePreview = entry.querySelector(".project-preview");
    const entryIndex = entry.getAttribute("data-index") ?? String(idx);
    if (!row) return;

    // Trigger aktif saat kursor menyentuh baris / tulisan project
    row.addEventListener("pointerenter", (event) => {
      if (!desktopHover.matches) return;
      projectEntries.forEach((other) => other.classList.remove("is-active"));
      entry.classList.add("is-active");
      openFloatingPreview(event.clientX, event.clientY, entryIndex);
    });

    row.addEventListener("pointerleave", () => {
      if (!desktopHover.matches) return;
      entry.classList.remove("is-active");
    });

    row.addEventListener("focus", () => {
      if (!desktopHover.matches || !floatingPreview) return;
      projectEntries.forEach((other) => other.classList.remove("is-active"));
      entry.classList.add("is-active");
      const rect = row.getBoundingClientRect();
      openFloatingPreview(
        rect.left + rect.width * 0.55,
        rect.top + rect.height / 2,
        entryIndex,
      );
    });

    row.addEventListener("blur", () => {
      entry.classList.remove("is-active");
      if (projectList && !projectList.contains(document.activeElement)) {
        closeFloatingPreview();
      }
    });

    // Mode mobile / layar sentuh: tetap pakai accordion buka-tutup
    row.addEventListener("click", () => {
      if (desktopHover.matches || !mobilePreview) return;

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
        mobilePreview.setAttribute("aria-hidden", "false");
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
