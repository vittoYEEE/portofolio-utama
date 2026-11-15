const {
  getAllTestimonials,
  isAdminAuthenticated,
} = require("../_lib/store");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }

  try {
    const all = await getAllTestimonials();
    const sorted = [...all].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
    return res.status(200).json({ testimonials: sorted });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to load testimonials." });
  }
};
