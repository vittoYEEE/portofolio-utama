document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.getElementById("navbar") || document.querySelector(".navbar");
  const openMenuBtn = document.getElementById("openMenuBtn") || document.querySelector(".menu-btn");
  const closeMenuBtn = document.getElementById("closeMenuBtn") || document.querySelector(".close-menu-btn");
  const menuOverlay = document.getElementById("menuOverlay") || document.querySelector(".menu-overlay");
  const menuNav = document.getElementById("menuNav") || document.querySelector(".menu-nav");
  const menuItems = document.querySelectorAll(".menu-item");
  const goBadge = document.getElementById("goBadge") || document.querySelector(".go-badge");

  // 1. Efek Navbar Menyempit Jadi Kapsul Saat Halaman Di-Scroll
  if (navbar) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 50) {
        navbar.classList.add("scrolled");
      } else {
        navbar.classList.remove("scrolled");
      }
    });
  }

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

    item.addEventListener("click", closeMenu);
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

  let isInsideMenu = false;
  let hasInitializedPos = false;

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
  }

  function hideCustomCursor() {
    isInsideMenu = false;
    targetScale = 0;
    targetOpacity = 0;
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
      if (isInsideMenu) targetScale = 0.88;
    });
    menuNav.addEventListener("mouseup", () => {
      if (isInsideMenu) targetScale = 1;
    });

    // Sembunyikan juga jika kursor keluar dari jendela browser
    document.addEventListener("mouseleave", () => {
      hideCustomCursor();
      hasInitializedPos = false;
    });

    // Loop animasi 60/120fps
    function animateCursor() {
      const posEase = 0.16;   // Kehalusan gerakan mengikuti kursor
      const scaleEase = 0.2;  // Kehalusan efek muncul & menghilang

      currentX += (targetX - currentX) * posEase;
      currentY += (targetY - currentY) * posEase;
      currentScale += (targetScale - currentScale) * scaleEase;
      currentOpacity += (targetOpacity - currentOpacity) * scaleEase;

      goBadge.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0) scale(${currentScale.toFixed(3)})`;
      goBadge.style.opacity = currentOpacity.toFixed(3);

      requestAnimationFrame(animateCursor);
    }

    requestAnimationFrame(animateCursor);
  }
});