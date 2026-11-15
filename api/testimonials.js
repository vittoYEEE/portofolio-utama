const crypto = require("crypto");
const {
  getAllTestimonials,
  saveAllTestimonials,
  sendNewReviewEmail,
} = require("./_lib/store");

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const all = await getAllTestimonials();
      const approved = all
        .filter((item) => item.status === "approved")
        .map(({ id, fullName, profession, photoUrl, comment, createdAt }) => ({
          id,
          fullName,
          profession,
          photoUrl,
          comment,
          createdAt,
        }));
      return res.status(200).json({ testimonials: approved });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Failed to load testimonials." });
    }
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const { fullName, profession, photoUrl, comment, website } = body;

      if (website && String(website).trim().length > 0) {
        return res.status(201).json({
          message: "Thank you! Your review has been submitted and is awaiting approval.",
        });
      }

      const cleanName = String(fullName || "").trim().slice(0, 80);
      const cleanProfession = String(profession || "").trim().slice(0, 80);
      const cleanComment = String(comment || "").trim().slice(0, 420);
      let cleanPhoto = String(photoUrl || "").trim().slice(0, 300);

      if (cleanName.length < 2) {
        return res.status(400).json({ error: "Full name must be at least 2 characters." });
      }
      if (cleanProfession.length < 2) {
        return res.status(400).json({ error: "Profession must be at least 2 characters." });
      }
      if (cleanComment.length < 10) {
        return res.status(400).json({ error: "Comment must be at least 10 characters." });
      }
      if (cleanPhoto) {
        try {
          const parsed = new URL(cleanPhoto);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return res.status(400).json({ error: "Photo URL must use http or https." });
          }
          cleanPhoto = parsed.toString();
        } catch (_) {
          return res.status(400).json({ error: "Invalid profile photo URL." });
        }
      }

      const nowIso = new Date().toISOString();
      const newEntry = {
        id: crypto.randomUUID(),
        fullName: cleanName,
        profession: cleanProfession,
        photoUrl: cleanPhoto,
        comment: cleanComment,
        status: "pending",
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const all = await getAllTestimonials();
      all.push(newEntry);
      await saveAllTestimonials(all);

      try {
        await sendNewReviewEmail(newEntry, req);
      } catch (mailErr) {
        console.error("Email notification failed:", mailErr.message);
      }

      return res.status(201).json({
        message:
          "Thank you! Your comment has been saved and is awaiting approval before appearing publicly.",
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || "Unable to submit review." });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed." });
};
