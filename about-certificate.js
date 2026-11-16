document.addEventListener("DOMContentLoaded", () => {
  const certCards = Array.from(document.querySelectorAll(".cert-card"));
  const expandBtn = document.getElementById("openAllCertificatesBtn");
  const modal = document.getElementById("certModal");
  const backdrop = document.getElementById("certModalBackdrop");
  const closeBtn = document.getElementById("closeCertModalBtn");
  const modalBadge = document.getElementById("certModalBadge");
  const modalTitle = document.getElementById("certModalTitle");
  const modalMeta = document.getElementById("certModalMeta");
  const modalDesc = document.getElementById("certModalDesc");
  const modalList = document.getElementById("certModalList");

  if (!modal || !certCards.length) return;

  function openSingleCertificate(card) {
    const num = card.dataset.certNum || "01";
    const title = card.dataset.certTitle || "Sertifikat Kompetensi";
    const issuer = card.dataset.certIssuer || "Veneto Studio";
    const year = card.dataset.certYear || "2026";
    const desc =
      card.dataset.certDesc ||
      "Sertifikasi resmi pengembangan antarmuka web modern, desain responsif, dan arsitektur frontend.";

    modalBadge.textContent = `SERTIFIKAT • ${num}`;
    modalTitle.textContent = title;
    modalMeta.innerHTML = `<span>Penerbit: <strong>${issuer}</strong></span><span>Tahun: <strong>${year}</strong></span>`;
    modalDesc.textContent = desc;
    modalList.innerHTML = "";
    modalList.style.display = "none";

    showModal();
  }

  function openAllCertificates() {
    modalBadge.textContent = `DAFTAR SERTIFIKAT • [0${certCards.length}]`;
    modalTitle.textContent = "Semua Sertifikat & Pencapaian";
    modalMeta.innerHTML = "<span>Pilih salah satu sertifikat di bawah untuk melihat detailnya.</span>";
    modalDesc.textContent = "";
    modalList.innerHTML = "";
    modalList.style.display = "flex";

    certCards.forEach((card) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cert-modal-list-item";
      btn.innerHTML = `
        <span><strong style="color:#ff9f45;margin-right:8px;">${card.dataset.certNum}</strong> ${card.dataset.certTitle}</span>
        <span aria-hidden="true">↗</span>
      `;
      btn.addEventListener("click", () => openSingleCertificate(card));
      modalList.appendChild(btn);
    });

    showModal();
  }

  function showModal() {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  certCards.forEach((card) => {
    card.addEventListener("click", () => openSingleCertificate(card));
  });

  if (expandBtn) {
    expandBtn.addEventListener("click", openAllCertificates);
  }

  closeBtn?.addEventListener("click", closeModal);
  backdrop?.addEventListener("click", closeModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });
});
