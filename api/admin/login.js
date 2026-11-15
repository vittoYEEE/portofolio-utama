const crypto = require("crypto");
const {
  ADMIN_PASSWORD,
  COOKIE_NAME,
  signSessionToken,
} = require("../_lib/store");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const supplied = String(body.password || "");
  const a = Buffer.from(supplied, "utf8");
  const b = Buffer.from(ADMIN_PASSWORD, "utf8");

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Invalid admin password." });
  }

  const maxAgeSec = 60 * 60 * 8;
  const token = signSessionToken(Date.now() + maxAgeSec * 1000);
  const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAgeSec}; SameSite=Strict${isProd ? "; Secure" : ""}`,
  );
  return res.status(200).json({ ok: true });
};
