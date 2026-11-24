const crypto = require("crypto");
const {
  getAllProjects,
  saveAllProjects,
  isAdminAuthenticated,
} = require("./_lib/store");

function isValidImageSource(src) {
  if (!src) return false;
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
      const projects = await getAllProjects();
      return res.status(200).json({ projects });
    } catch (err) {
      return res
        .status(500)
        .json({ error: err.message || "Gagal memuat data project." });
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
      const year = String(body.year || "2026").trim().slice(0, 10);
      const category = body.category === "concept" ? "concept" : "live";
      let url = String(body.url || "").trim().slice(0, 300);
      const imageUrl = String(body.imageUrl || "").trim();
      const description = String(body.description || "").trim().slice(0, 600);
      const featuredOnHome = body.featuredOnHome !== false;

      const rawTags = Array.isArray(body.tags)
        ? body.tags
        : String(body.tags || "").split(",");
      const tags = rawTags
        .map((t) => String(t || "").trim().slice(0, 30))
        .filter(Boolean)
        .slice(0, 8);

      if (title.length < 2) {
        return res.status(400).json({ error: "Nama project minimal 2 karakter." });
      }
      if (!isValidImageSource(imageUrl)) {
        return res
          .status(400)
          .json({ error: "Gambar/screenshot project wajib diisi dan valid." });
      }
      if (url) {
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            throw new Error("Invalid protocol");
          }
          url = parsed.toString();
        } catch (_) {
          return res
            .status(400)
            .json({ error: "URL website harus diawali http:// atau https://." });
        }
      }

      const newProject = {
        id: `proj-${crypto.randomUUID()}`,
        title,
        year: year || "2026",
        category,
        url,
        imageUrl,
        description:
          description ||
          `Proyek pengembangan antarmuka web modern untuk ${title}.`,
        tags: tags.length ? tags : ["Web Design", "Responsive UI"],
        featuredOnHome,
        createdAt: new Date().toISOString(),
      };

      const all = await getAllProjects();
      all.push(newProject);
      await saveAllProjects(all);

      return res.status(201).json({ ok: true, project: newProject });
    } catch (err) {
      return res
        .status(500)
        .json({ error: err.message || "Gagal menambah project." });
    }
  }

  if (req.method === "DELETE") {
    try {
      const targetId = String(req.query?.id || body.id || "").trim();
      if (!targetId) {
        return res.status(400).json({ error: "ID project wajib disertakan." });
      }

      const all = await getAllProjects();
      const filtered = all.filter((item) => item.id !== targetId);
      if (filtered.length === all.length) {
        return res.status(404).json({ error: "Project tidak ditemukan." });
      }

      await saveAllProjects(filtered);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res
        .status(500)
        .json({ error: err.message || "Gagal menghapus project." });
    }
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed." });
};