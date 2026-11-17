document.addEventListener("DOMContentLoaded", () => {
  const filterBtns = document.querySelectorAll(".filter-pill");
  const cards = document.querySelectorAll(".cert-page-card");

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const filter = btn.dataset.filter;
      cards.forEach((card) => {
        const match = filter === "all" || card.dataset.category === filter;
        card.classList.toggle("is-hidden", !match);
      });
    });
  });

  const modal = document.getElementById("certPageModal");
  const modalImg = document.getElementById("mCertImg");
  const backdrop = document.getElementById("certPageBackdrop");
  const closeBtn = document.getElementById("mCertClose");

  if (!modal) return;

  document.querySelectorAll(".open-cert-detail").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("mCertBadge").textContent =
        `SERTIFIKAT • ${btn.dataset.num}`;
      document.getElementById("mCertTitle").textContent = btn.dataset.title;
      document.getElementById("mCertMeta").textContent =
        `Penerbit: ${btn.dataset.issuer} • Tahun ${btn.dataset.year}`;
      document.getElementById("mCertDesc").textContent = btn.dataset.desc;

      if (modalImg) {
        const cardImg = btn
          .closest(".cert-page-card")
          ?.querySelector(".cert-thumb img");
        const imgSrc =
          btn.dataset.img || (cardImg ? cardImg.getAttribute("src") : "");

        if (imgSrc) {
          modalImg.src = imgSrc;
          modalImg.alt = `Sertifikat ${btn.dataset.title}`;
          modalImg.style.display = "block";
        } else {
          modalImg.removeAttribute("src");
          modalImg.style.display = "none";
        }
      }

      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
    });
  });

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  closeBtn?.addEventListener("click", closeModal);
  backdrop?.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });
});
