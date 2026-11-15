document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.getElementById("navbar") || document.querySelector(".navbar");
  const openMenuBtn = document.getElementById("openMenuBtn") || document.querySelector(".menu-btn");
  const menuOverlay = document.getElementById("menuOverlay") || document.querySelector(".menu-overlay");
  const menuNav = document.getElementById("menuNav") || document.querySelector(".menu-nav");
  const menuCursor = document.getElementById("menuCursor") || document.querySelector(".menu-cursor");
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
  // 3. Preview gambar proyek melayang (Smooth LERP + Klik Langsung ke Web)
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
  let closePreviewTimer = null;
  let previewSize = { width: 340, height: 224 };

  function measureFloatingPreview() {
    if (!floatingPreview) return;
    const width = floatingPreview.offsetWidth || 340;
    const height = floatingPreview.offsetHeight || 224;
    previewSize = { width, height };
  }

  function computeClampedTarget(clientX, clientY) {
    const gap = 28;
    const margin = 20;
    const { width, height } = previewSize;

    let x = clientX + gap;
    if (x + width > window.innerWidth - margin) {
      x = clientX - width - gap;
    }
    x = Math.max(margin, Math.min(window.innerWidth - width - margin, x));

    const halfH = height / 2;
    const y = Math.min(
      window.innerHeight - halfH - margin,
      Math.max(halfH + margin, clientY),
    );

    return { x, y };
  }

  function syncFloatingLink(index) {
    if (!floatingPreview) return;
    const entry = projectEntries[index];
    const row = entry ? entry.querySelector(".project-row") : null;
    const href = row ? row.getAttribute("href") : null;

    if (href && href !== "#projects") {
      floatingPreview.setAttribute("href", href);
      floatingPreview.setAttribute("target", "_blank");
      floatingPreview.setAttribute("rel", "noopener noreferrer");
    } else {
      floatingPreview.setAttribute("href", href || "#projects");
      floatingPreview.removeAttribute("target");
      floatingPreview.removeAttribute("rel");
    }
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

    syncFloatingLink(safeIndex);
  }

  function renderFloatingPreview() {
    if (!floatingPreview) {
      previewLoopId = null;
      return;
    }

    const ease = reducedMotion.matches ? 1 : 0.11;
    const dx = targetX - currentX;
    const dy = targetY - currentY;

    currentX += dx * ease;
    currentY += dy * ease;

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

  function cancelCloseTimer() {
    if (closePreviewTimer !== null) {
      window.clearTimeout(closePreviewTimer);
      closePreviewTimer = null;
    }
  }

  function scheduleClosePreview() {
    cancelCloseTimer();
    closePreviewTimer = window.setTimeout(() => {
      closeFloatingPreview();
    }, 90);
  }

  function openFloatingPreview(clientX, clientY, index) {
    if (!floatingPreview || !desktopHover.matches) return;
    cancelCloseTimer();

    measureFloatingPreview();
    const pos = computeClampedTarget(clientX, clientY);
    targetX = pos.x;
    targetY = pos.y;

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
    cancelCloseTimer();
    if (!floatingPreview) return;
    isPreviewActive = false;
    floatingPreview.classList.remove("is-visible");
    floatingPreview.setAttribute("aria-hidden", "true");
    projectEntries.forEach((entry) => entry.classList.remove("is-active"));
  }

  if (projectList && floatingPreview) {
    projectList.addEventListener("pointermove", (event) => {
      if (!desktopHover.matches) return;
      cancelCloseTimer();
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
      scheduleClosePreview();
    });

    // Jika kursor pindah ke atas kotak preview / tombol GO, jangan ditutup agar bisa diklik
    floatingPreview.addEventListener("pointerenter", () => {
      cancelCloseTimer();
      const activeEntry = projectEntries[activeProjectIndex];
      if (activeEntry) activeEntry.classList.add("is-active");
    });

    floatingPreview.addEventListener("pointerleave", () => {
      scheduleClosePreview();
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

    row.addEventListener("pointerenter", (event) => {
      if (!desktopHover.matches) return;
      cancelCloseTimer();
      projectEntries.forEach((other) => other.classList.remove("is-active"));
      entry.classList.add("is-active");
      openFloatingPreview(event.clientX, event.clientY, entryIndex);
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

    // Mode mobile / layar sentuh:
    // Tap pertama membuka preview gambar; tap kedua pada baris atau tap gambar/GO langsung buka webnya
    row.addEventListener("click", (event) => {
      if (desktopHover.matches || !mobilePreview) return;

      const isAlreadyOpen = entry.classList.contains("is-open");
      if (isAlreadyOpen) return;

      event.preventDefault();
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

      entry.classList.add("is-open");
      row.setAttribute("aria-expanded", "true");
      mobilePreview.setAttribute("aria-hidden", "false");
    });
  });

  // Cegah lompatan scroll jika proyek belum memiliki link web (href="#projects")
  document
    .querySelectorAll(".project-row, .project-preview-link, #projectFloatingPreview")
    .forEach((linkEl) => {
      linkEl.addEventListener("click", (event) => {
        if (linkEl.getAttribute("href") === "#projects") {
          event.preventDefault();
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

  // ---------------------------------------------------------------
  // 4. Custom Cursor Bulat "GO" saat hover item di Menu Navigasi
  // ---------------------------------------------------------------
  let menuCursorActive = false;
  let menuCursorTargetX = 0;
  let menuCursorTargetY = 0;
  let menuCursorCurrentX = 0;
  let menuCursorCurrentY = 0;
  let menuCursorLoopId = null;

  function renderMenuCursor() {
    if (!menuCursor) {
      menuCursorLoopId = null;
      return;
    }

    const ease = reducedMotion.matches ? 1 : 0.24;
    const dx = menuCursorTargetX - menuCursorCurrentX;
    const dy = menuCursorTargetY - menuCursorCurrentY;

    menuCursorCurrentX += dx * ease;
    menuCursorCurrentY += dy * ease;

    menuCursor.style.transform = `translate3d(${menuCursorCurrentX.toFixed(2)}px, ${menuCursorCurrentY.toFixed(2)}px, 0)`;

    if (!menuCursorActive && Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2) {
      menuCursorLoopId = null;
      return;
    }

    menuCursorLoopId = window.requestAnimationFrame(renderMenuCursor);
  }

  function startMenuCursorLoop() {
    if (menuCursorLoopId === null) {
      menuCursorLoopId = window.requestAnimationFrame(renderMenuCursor);
    }
  }

  function showMenuCursor(clientX, clientY) {
    if (!menuCursor || !desktopHover.matches) return;
    menuCursorTargetX = clientX;
    menuCursorTargetY = clientY;

    if (!menuCursorActive) {
      menuCursorCurrentX = clientX;
      menuCursorCurrentY = clientY;
      menuCursor.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`;
    }

    menuCursorActive = true;
    menuCursor.classList.add("is-visible");
    startMenuCursorLoop();
  }

  function hideMenuCursor() {
    if (!menuCursor) return;
    menuCursorActive = false;
    menuCursor.classList.remove("is-visible");
  }

  if (menuNav && menuCursor) {
    menuNav.addEventListener("pointerenter", (event) => {
      if (!desktopHover.matches || menuClosing) return;
      showMenuCursor(event.clientX, event.clientY);
    });

    menuNav.addEventListener("pointermove", (event) => {
      if (!desktopHover.matches || menuClosing) return;
      if (!menuCursorActive) {
        showMenuCursor(event.clientX, event.clientY);
      } else {
        menuCursorTargetX = event.clientX;
        menuCursorTargetY = event.clientY;
        startMenuCursorLoop();
      }
    });

    menuNav.addEventListener("pointerleave", () => {
      hideMenuCursor();
    });
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

    hideMenuCursor();
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

  // ---------------------------------------------------------------
  // 5. Interactive Horizontal Testimonial Section + Submission Modal
  // ---------------------------------------------------------------
  const testimonialsSection = document.getElementById("testimonials");
  const testimonialsViewport = document.getElementById("testimonialsViewport");
  const testimonialsTrack = document.getElementById("testimonialsTrack");
  const openModalBtn = document.getElementById("openTestimonialModalBtn");
  const testimonialModal = document.getElementById("testimonialModal");
  const testimonialModalBackdrop = document.getElementById("testimonialModalBackdrop");
  const closeModalBtn = document.getElementById("closeTestimonialModalBtn");
  const cancelModalBtn = document.getElementById("cancelTestimonialBtn");
  const testimonialForm = document.getElementById("testimonialForm");
  const tfFullName = document.getElementById("tfFullName");
  const tfProfession = document.getElementById("tfProfession");
  const tfPhotoUrl = document.getElementById("tfPhotoUrl");
  const tfComment = document.getElementById("tfComment");
  const tfCharCounter = document.getElementById("tfCharCounter");
  const testimonialFormFeedback = document.getElementById("testimonialFormFeedback");
  const submitTestimonialBtn = document.getElementById("submitTestimonialBtn");

  const cardThemes = ["card-lavender", "card-orange", "card-lilac"];

  let maxHorizontalShift = 0;
  let targetHorizontalX = 0;
  let currentHorizontalX = 0;
  let horizontalRafId = null;

  function getInitials(name) {
    return String(name || "V")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "V";
  }

  function createTestimonialCardElement(item, index) {
    const article = document.createElement("article");
    const theme = cardThemes[index % cardThemes.length];
    article.className = `testimonial-card ${theme}`;

    const top = document.createElement("div");
    top.className = "testimonial-card-top";

    const author = document.createElement("div");
    author.className = "testimonial-author";

    const avatar = document.createElement("div");
    avatar.className = "testimonial-avatar";
    avatar.setAttribute("aria-hidden", "true");

    if (item.photoUrl) {
      const img = document.createElement("img");
      img.src = item.photoUrl;
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", () => {
        avatar.textContent = getInitials(item.fullName);
      });
      avatar.appendChild(img);
    } else {
      avatar.textContent = getInitials(item.fullName);
    }

    const meta = document.createElement("div");
    meta.className = "testimonial-meta";

    const nameEl = document.createElement("h3");
    nameEl.textContent = item.fullName;

    const profEl = document.createElement("p");
    profEl.textContent = item.profession;

    meta.append(nameEl, profEl);
    author.append(avatar, meta);

    const idxEl = document.createElement("span");
    idxEl.className = "testimonial-index";
    idxEl.textContent = String(index + 1).padStart(2, "0");

    top.append(author, idxEl);

    const quote = document.createElement("blockquote");
    quote.className = "testimonial-quote";
    quote.textContent = `“${item.comment.replace(/^[“"]|[”"]$/g, "")}”`;

    article.append(top, quote);
    return article;
  }

  function recalcTestimonialsScroll() {
    if (!testimonialsSection || !testimonialsTrack) return;

    if (reducedMotion.matches) {
      testimonialsSection.style.height = "";
      maxHorizontalShift = 0;
      targetHorizontalX = 0;
      currentHorizontalX = 0;
      testimonialsTrack.style.transform = "";
      return;
    }

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const trackW = testimonialsTrack.scrollWidth;
    maxHorizontalShift = Math.max(0, trackW - viewportW);

    // Total vertical scroll height = 1 viewport height + horizontal travel distance
    testimonialsSection.style.height = `${viewportH + maxHorizontalShift}px`;
    scheduler.schedule();
  }

  function animateTestimonialsHorizontal() {
    if (!testimonialsTrack || reducedMotion.matches) {
      horizontalRafId = null;
      return;
    }

    const diff = targetHorizontalX - currentHorizontalX;
    currentHorizontalX += diff * 0.14;

    if (Math.abs(diff) < 0.15) {
      currentHorizontalX = targetHorizontalX;
    }

    testimonialsTrack.style.transform = `translate3d(-${currentHorizontalX.toFixed(2)}px, 0, 0)`;

    if (Math.abs(targetHorizontalX - currentHorizontalX) >= 0.15) {
      horizontalRafId = window.requestAnimationFrame(animateTestimonialsHorizontal);
    } else {
      horizontalRafId = null;
    }
  }

  function startTestimonialsAnimation() {
    if (horizontalRafId === null) {
      horizontalRafId = window.requestAnimationFrame(animateTestimonialsHorizontal);
    }
  }

  if (testimonialsSection && testimonialsTrack) {
    scheduler.add({
      read(viewportHeight) {
        if (reducedMotion.matches || viewportHeight === 0 || maxHorizontalShift <= 0) {
          return 0;
        }
        const rect = testimonialsSection.getBoundingClientRect();
        const scrollDistance = rect.height - viewportHeight;
        if (scrollDistance <= 0) return 0;

        const progress = clamp01(-rect.top / scrollDistance);
        return progress * maxHorizontalShift;
      },
      write(nextTargetX) {
        if (reducedMotion.matches) return false;
        if (Math.abs(nextTargetX - targetHorizontalX) < 0.1) return false;
        targetHorizontalX = nextTargetX;
        startTestimonialsAnimation();
        return false;
      },
    });

    // Support horizontal touch drag on mobile devices mapped cleanly to vertical scroll
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartScrollY = 0;
    let isHorizontalGesture = null;

    if (testimonialsViewport) {
      testimonialsViewport.addEventListener(
        "touchstart",
        (event) => {
          if (reducedMotion.matches || event.touches.length !== 1) return;
          touchStartX = event.touches[0].clientX;
          touchStartY = event.touches[0].clientY;
          touchStartScrollY = window.scrollY;
          isHorizontalGesture = null;
        },
        { passive: true },
      );

      testimonialsViewport.addEventListener(
        "touchmove",
        (event) => {
          if (reducedMotion.matches || event.touches.length !== 1) return;
          const dx = touchStartX - event.touches[0].clientX;
          const dy = touchStartY - event.touches[0].clientY;

          if (isHorizontalGesture === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
            isHorizontalGesture = Math.abs(dx) > Math.abs(dy);
          }

          if (isHorizontalGesture) {
            event.preventDefault();
            const sectionTop =
              window.scrollY + testimonialsSection.getBoundingClientRect().top;
            const minScroll = sectionTop;
            const maxScroll = sectionTop + maxHorizontalShift;
            const desiredScroll = Math.max(
              minScroll,
              Math.min(maxScroll, touchStartScrollY + dx * 1.15),
            );
            window.scrollTo({ top: desiredScroll, behavior: "auto" });
          }
        },
        { passive: false },
      );
    }

    window.addEventListener("resize", recalcTestimonialsScroll, { passive: true });
    reducedMotion.addEventListener("change", recalcTestimonialsScroll);
    recalcTestimonialsScroll();
  }

  // Load approved testimonials from backend API (falls back gracefully if offline)
  async function loadApprovedTestimonials() {
    if (!testimonialsTrack || !openModalBtn) return;
    try {
      const response = await fetch("/api/testimonials", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data.testimonials)) return;

      const existingCards = testimonialsTrack.querySelectorAll(
        ".testimonial-card:not(.testimonial-add-card)",
      );
      existingCards.forEach((card) => card.remove());

      data.testimonials.forEach((item, idx) => {
        const cardEl = createTestimonialCardElement(item, idx);
        testimonialsTrack.insertBefore(cardEl, openModalBtn);
      });

      recalcTestimonialsScroll();
    } catch (_) {
      // Static mode fallback: keep initial seeded cards intact
    }
  }

  void loadApprovedTestimonials();

  // Modal controls & form validation
  let lastFocusedBeforeModal = null;

  function clearFormErrors() {
    document
      .querySelectorAll("#testimonialForm .form-field")
      .forEach((field) => field.classList.remove("has-error"));
    document
      .querySelectorAll("#testimonialForm .field-error")
      .forEach((el) => {
        el.textContent = "";
      });
  }

  function setFieldError(inputEl, errorElId, message) {
    const field = inputEl?.closest(".form-field");
    const errEl = document.getElementById(errorElId);
    if (field) field.classList.add("has-error");
    if (errEl) errEl.textContent = message;
  }

  function openTestimonialModal() {
    if (!testimonialModal) return;
    lastFocusedBeforeModal = document.activeElement;
    clearFormErrors();
    if (testimonialFormFeedback) {
      testimonialFormFeedback.className = "form-feedback";
      testimonialFormFeedback.textContent = "";
    }
    testimonialModal.classList.add("is-open");
    testimonialModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    window.setTimeout(() => {
      tfFullName?.focus();
    }, 50);
  }

  function closeTestimonialModal() {
    if (!testimonialModal || !testimonialModal.classList.contains("is-open")) {
      return;
    }
    testimonialModal.classList.remove("is-open");
    testimonialModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === "function") {
      lastFocusedBeforeModal.focus();
    }
  }

  if (openModalBtn) {
    openModalBtn.addEventListener("click", openTestimonialModal);
  }
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeTestimonialModal);
  }
  if (cancelModalBtn) {
    cancelModalBtn.addEventListener("click", closeTestimonialModal);
  }
  if (testimonialModalBackdrop) {
    testimonialModalBackdrop.addEventListener("click", closeTestimonialModal);
  }

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      testimonialModal &&
      testimonialModal.classList.contains("is-open")
    ) {
      closeTestimonialModal();
    }
  });

  if (tfComment && tfCharCounter) {
    tfComment.addEventListener("input", () => {
      tfCharCounter.textContent = `${tfComment.value.length} / 420`;
    });
  }

  if (testimonialForm) {
    testimonialForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearFormErrors();
      if (testimonialFormFeedback) {
        testimonialFormFeedback.className = "form-feedback";
        testimonialFormFeedback.textContent = "";
      }

      const fullName = (tfFullName?.value || "").trim();
      const profession = (tfProfession?.value || "").trim();
      const photoUrl = (tfPhotoUrl?.value || "").trim();
      const comment = (tfComment?.value || "").trim();
      const website = testimonialForm.querySelector('input[name="website"]')?.value || "";

      let hasError = false;

      if (fullName.length < 2) {
        setFieldError(tfFullName, "errFullName", "Please enter your full name (at least 2 characters).");
        hasError = true;
      }
      if (profession.length < 2) {
        setFieldError(tfProfession, "errProfession", "Please enter your profession or role.");
        hasError = true;
      }
      if (photoUrl) {
        try {
          const parsed = new URL(photoUrl);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            throw new Error("Invalid protocol");
          }
        } catch (_) {
          setFieldError(tfPhotoUrl, "errPhotoUrl", "Please enter a valid http:// or https:// image URL.");
          hasError = true;
        }
      }
      if (comment.length < 10) {
        setFieldError(tfComment, "errComment", "Please write at least 10 characters of feedback.");
        hasError = true;
      }

      if (hasError) return;

      if (submitTestimonialBtn) {
        submitTestimonialBtn.disabled = true;
        submitTestimonialBtn.classList.add("is-loading");
      }

      try {
        const res = await fetch("/api/testimonials", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            fullName,
            profession,
            photoUrl,
            comment,
            website,
          }),
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload.error || "Unable to submit your review right now.");
        }

        testimonialForm.reset();
        if (tfCharCounter) tfCharCounter.textContent = "0 / 420";
        if (testimonialFormFeedback) {
          testimonialFormFeedback.className = "form-feedback is-success";
          testimonialFormFeedback.textContent =
            payload.message ||
            "Thank you! Your review has been submitted and is awaiting approval before appearing publicly.";
        }
      } catch (err) {
        if (testimonialFormFeedback) {
          testimonialFormFeedback.className = "form-feedback is-error";
          testimonialFormFeedback.textContent =
            err.message === "Failed to fetch"
              ? "Backend server is not running yet. Start the Node.js server (npm start) to submit reviews."
              : err.message;
        }
      } finally {
        if (submitTestimonialBtn) {
          submitTestimonialBtn.disabled = false;
          submitTestimonialBtn.classList.remove("is-loading");
        }
      }
    });
  }

});
