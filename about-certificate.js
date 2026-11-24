document.addEventListener("DOMContentLoaded", () => {
  const fanContainer = document.querySelector(".cert-cards-fan");
  const kickerEl = document.querySelector(".cert-bento-kicker");
  const expandBtn = document.getElementById("openAllCertificatesBtn");
  const modal = document.getElementById("certModal");
  const backdrop = document.getElementById("certModalBackdrop");
  const closeBtn = document.getElementById("closeCertModalBtn");
  const modalBadge = document.getElementById("certModalBadge");
  const modalTitle = document.getElementById("certModalTitle");
  const modalImg = document.getElementById("certModalImg");
  const modalMeta = document.getElementById("certModalMeta");
  const modalDesc = document.getElementById("certModalDesc");
  const modalList = document.getElementById("certModalList");

  if (!modal) return;

  function getCertCards() {
    return Array.from(document.querySelectorAll(".cert-card"));
  }

  function openSingleCertificate(card) {
    const num = card.dataset.certNum || "01";
    const title = card.dataset.certTitle || "Sertifikat Kompetensi";
    const issuer = card.dataset.certIssuer || "Veneto Studio";
    const year = card.dataset.certYear || "2026";
    const imgSrc = card.dataset.certImg || "";
    const desc =
      card.dataset.certDesc ||
      "Sertifikasi resmi pengembangan antarmuka web modern, desain responsif, dan arsitektur frontend.";

    modalBadge.textContent = `SERTIFIKAT • ${num}`;
    modalTitle.textContent = title;
    if (modalImg) {
      if (imgSrc) {
        modalImg.src = imgSrc;
        modalImg.alt = `Sertifikat ${title}`;
        modalImg.style.display = "block";
      } else {
        modalImg.removeAttribute("src");
        modalImg.style.display = "none";
      }
    }
    modalMeta.innerHTML = `<span>Penerbit: <strong>${issuer}</strong></span><span>Tahun: <strong>${year}</strong></span>`;
    modalDesc.textContent = desc;
    modalList.innerHTML = "";
    modalList.style.display = "none";

    showModal();
  }

  function openAllCertificates() {
    const certCards = getCertCards();
    modalBadge.textContent = `DAFTAR SERTIFIKAT • [${String(certCards.length).padStart(2, "0")}]`;
    modalTitle.textContent = "Semua Sertifikat & Pencapaian";
    if (modalImg) {
      modalImg.removeAttribute("src");
      modalImg.style.display = "none";
    }
    modalMeta.innerHTML =
      "<span>Pilih salah satu sertifikat di bawah untuk melihat detailnya.</span>";
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

  function bindCardListeners() {
    getCertCards().forEach((card) => {
      card.onclick = () => openSingleCertificate(card);
    });
  }

  async function hydrateCertificates() {
    if (!fanContainer) return;
    try {
      const res = await fetch("/api/certificates", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data.certificates)) return;

      const total = data.certificates.length;
      if (kickerEl) {
        kickerEl.textContent = `SERTIFIKAT • [${String(total).padStart(2, "0")}]`;
      }

      // Tampilkan hingga 5 sertifikat di kipas bento home (sisanya tetap bisa dilihat di certificates.html)
     const visibleCerts = data.certificates.slice(-5);
      fanContainer.innerHTML = "";

      visibleCerts.forEach((cert, idx) => {
        const num = String(idx + 1).padStart(2, "0");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `cert-card ${cert.theme || "theme-deep"}${cert.imageUrl ? " has-full-img" : ""}`;
        btn.dataset.certNum = num;
        btn.dataset.certTitle = cert.title;
        btn.dataset.certIssuer = cert.issuer;
        btn.dataset.certYear = cert.year || "2026";
        btn.dataset.certImg = cert.imageUrl || "";
        btn.dataset.certDesc = cert.description || "";

        if (cert.imageUrl) {
          const img = document.createElement("img");
          img.className = "cert-card-img";
          img.src = cert.imageUrl;
          img.alt = `Sertifikat ${cert.title}`;
          btn.appendChild(img);
        }

        const head = document.createElement("div");
        head.className = "cert-card-head";
        const numSpan = document.createElement("span");
        numSpan.className = "cert-num";
        numSpan.textContent = num;
        const h3 = document.createElement("h3");
        h3.className = "cert-title";
        h3.textContent = cert.title;
        head.append(numSpan, h3);

        const extra = document.createElement("div");
        extra.className = "cert-card-extra";
        const issuerSpan = document.createElement("span");
        issuerSpan.className = "cert-issuer";
        issuerSpan.textContent = `${cert.issuer} • ${cert.year || "2026"}`;
        const pillSpan = document.createElement("span");
        pillSpan.className = "cert-action-pill";
        pillSpan.textContent = "Detail ↗";
        extra.append(issuerSpan, pillSpan);

        btn.append(head, extra);
        fanContainer.appendChild(btn);
      });

      bindCardListeners();
    } catch (_) {
      // Fallback ke HTML statis jika offline
    }
  }

  bindCardListeners();
  void hydrateCertificates();

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