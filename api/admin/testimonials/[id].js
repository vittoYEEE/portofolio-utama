const {
  getAllTestimonials,
  saveAllTestimonials,
  isAdminAuthenticated,
} = require("../../_lib/store");

module.exports = async function handler(req, res) {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }

  const { id } = req.query || {};
  if (!id) {
    return res.status(400).json({ error: "Missing testimonial ID." });
  }

  if (req.method === "PATCH") {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { status } = body;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value." });
    }

    try {
      const all = await getAllTestimonials();
      const item = all.find((entry) => entry.id === id);
      if (!item) {
        return res.status(404).json({ error: "Testimonial not found." });
      }

      item.status = status;
      item.updatedAt = new Date().toISOString();
      await saveAllTestimonials(all);
      return res.status(200).json({ ok: true, testimonial: item });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Failed to update testimonial." });
    }
  }

  if (req.method === "DELETE") {
    try {
      const all = await getAllTestimonials();
      const next = all.filter((entry) => entry.id !== id);
      if (next.length === all.length) {
        return res.status(404).json({ error: "Testimonial not found." });
      }
      await saveAllTestimonials(next);
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Failed to delete testimonial." });
    }
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed." });
};
