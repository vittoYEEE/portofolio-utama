const crypto = require("crypto");
const {
  getAllCertificates,
  saveAllCertificates,
  isAdminAuthenticated,
} = require("./_lib/store");

const ALLOWED_THEMES = new Set([
  "theme-deep",
  "theme-royal",
  "theme-orange",
  "theme-lavender",
]);

function isValidImageSource(src) {
  if (!src) return true;
  if (src.startsWith("data:image/")) return src.length <= 1_500_000;
  if (src.startsWith("./") || src.startsWith("/") || src.startsWith("asset/")) {
    return src.length <= 300;
  }
  try {
    const parsed = new URL(src);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_) {
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const certificates = await getAllCertificates();
      return res.status(200).json({ certificates });
    } catch (err) {
      return res
        .status(500)
        .json({ error: err.message || "Gagal memuat data sertifikat." });
    }
  }

  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ error: "Unauthorized. Silakan login admin." });
  }

  const body =
    typeof req.body === "string"
      ? JSON.parse(req.body || "{}")
      : req.body || {};

  if (req.method === "POST") {
    try {
      const title = String(body.title || "").trim().slice(0, 100);
      const issuer = String(body.issuer || "").trim().slice(0, 80);
      const year = String(body.year || "2026").trim().slice(0, 10);
      const category = body.category === "design" ? "design" : "web";
      const tag =
        String(body.tag || "").trim().slice(0, 40) ||
        `${title.toUpperCase()} CERTIFICATE`;
      const theme = ALLOWED_THEMES.has(body.theme) ? body.theme : "theme-deep";
      const imageUrl = String(body.imageUrl || "").trim();
      const description = String(body.description || "").trim().slice(0, 600);

      if (title.length < 2) {
        return res.status(400).json({ error: "Judul sertifikat minimal 2 karakter." });
      }
      if (issuer.length < 2) {
        return res.status(400).json({ error: "Nama penerbit minimal 2 karakter." });
      }
      if (!isValidImageSource(imageUrl)) {
        return res
          .status(400)
          .json({ error: "URL/file gambar sertifikat tidak valid atau terlalu besar." });
      }

      const newCert = {
        id: `cert-${crypto.randomUUID()}`,
        title,
        issuer,
        year: year || "2026",
        category,
        tag,
        theme,
        imageUrl,
        description:
          description ||
          `Sertifikasi kompetensi ${title} yang diterbitkan oleh ${issuer}.`,
        createdAt: new Date().toISOString(),
      };

      const all = await getAllCertificates();
      all.push(newCert);
      await saveAllCertificates(all);

      return res.status(201).json({ ok: true, certificate: newCert });
    } catch (err) {
      return res
        .status(500)
        .json({ error: err.message || "Gagal menambah sertifikat." });
    }
  }

  if (req.method === "DELETE") {
    try {
      const targetId = String(req.query?.id || body.id || "").trim();
      if (!targetId) {
        return res.status(400).json({ error: "ID sertifikat wajib disertakan." });
      }

      const all = await getAllCertificates();
      const filtered = all.filter((item) => item.id !== targetId);
      if (filtered.length === all.length) {
        return res.status(404).json({ error: "Sertifikat tidak ditemukan." });
      }

      await saveAllCertificates(filtered);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res
        .status(500)
        .json({ error: err.message || "Gagal menghapus sertifikat." });
    }
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed." });
};