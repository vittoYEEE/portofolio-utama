const crypto = require("crypto");
const nodemailer = require("nodemailer");

const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "vvitto878@gmail.com";
const GMAIL_USER = process.env.GMAIL_USER || "vvitto878@gmail.com";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "veneto-admin-2026";
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash("sha256").update(ADMIN_PASSWORD + "_veneto_salt").digest("hex");

const COOKIE_NAME = "veneto_admin_session";
const REDIS_KEY = "veneto:testimonials:v1";

const SEED_TESTIMONIALS = [
  {
    id: "seed-1",
    fullName: "Alya Rahmadani",
    profession: "Product Designer",
    photoUrl: "",
    comment:
      "Vittorio blends bold typography with smooth motion that feels effortless. Every scroll transition on this portfolio has real craft behind it.",
    status: "approved",
    createdAt: "2026-11-10T09:00:00.000Z",
    updatedAt: "2026-11-10T09:00:00.000Z",
  },
  {
    id: "seed-2",
    fullName: "Dimas Kurniawan",
    profession: "Frontend Engineer",
    photoUrl: "",
    comment:
      "Clean architecture, snappy interactions, and a distinct visual identity. Working with Veneto turned our rough concept into a memorable web experience.",
    status: "approved",
    createdAt: "2026-11-11T11:30:00.000Z",
    updatedAt: "2026-11-11T11:30:00.000Z",
  },
  {
    id: "seed-3",
    fullName: "Nadia Pratama",
    profession: "Creative Director",
    photoUrl: "",
    comment:
      "Rarely do you see a developer who cares this deeply about spacing, rhythm, and micro-interactions. Truly standout work.",
    status: "approved",
    createdAt: "2026-11-12T15:15:00.000Z",
    updatedAt: "2026-11-12T15:15:00.000Z",
  },
];

function getRedisConfig() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    "";
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    "";
  return { url: url.replace(/\/$/, ""), token };
}

async function redisCommand(commandArray) {
  const { url, token } = getRedisConfig();
  if (!url || !token) {
    throw new Error(
      "Database belum terhubung. Tambahkan Upstash Redis di Vercel Storage (KV_REST_API_URL & KV_REST_API_TOKEN).",
    );
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commandArray),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Redis command failed");
  }
  return data.result;
}

async function getAllTestimonials() {
  const { url, token } = getRedisConfig();
  if (!url || !token) {
    return SEED_TESTIMONIALS;
  }

  const raw = await redisCommand(["GET", REDIS_KEY]);
  if (!raw) {
    await redisCommand(["SET", REDIS_KEY, JSON.stringify(SEED_TESTIMONIALS)]);
    return [...SEED_TESTIMONIALS];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...SEED_TESTIMONIALS];
  } catch (_) {
    return [...SEED_TESTIMONIALS];
  }
}

async function saveAllTestimonials(items) {
  await redisCommand(["SET", REDIS_KEY, JSON.stringify(items)]);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendNewReviewEmail(entry, req) {
  if (!GMAIL_APP_PASSWORD) {
    console.warn("GMAIL_APP_PASSWORD belum diatur di Vercel Environment Variables.");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  const host = req?.headers?.["x-forwarded-host"] || req?.headers?.host || "";
  const proto = req?.headers?.["x-forwarded-proto"] || "https";
  const baseUrl = process.env.SITE_URL || (host ? `${proto}://${host}` : "");
  const adminUrl = `${baseUrl.replace(/\/$/, "")}/admin.html`;

  const subject = `New Portfolio Review Pending Approval — ${entry.fullName}`;
  const textBody = [
    "New testimonial submitted on Veneto Portfolio:",
    "",
    `Name: ${entry.fullName}`,
    `Profession: ${entry.profession}`,
    "Status: PENDING APPROVAL",
    "Comment:",
    `"${entry.comment}"`,
    "",
    "Approve or delete securely in your Admin Dashboard:",
    adminUrl,
  ].join("\n");

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #16052b; color: #f0e5ff; padding: 28px; border-radius: 18px;">
      <p style="margin: 0 0 8px; color: #ff9a50; font-size: 12px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase;">
        Veneto Portfolio &bull; Pending Review
      </p>
      <h2 style="margin: 0 0 18px; font-size: 22px; color: #ffffff;">
        New Testimonial Submitted
      </h2>
      <div style="background: rgba(255,255,255,0.07); padding: 18px; border-radius: 12px; margin-bottom: 20px;">
        <p style="margin: 0 0 6px; font-size: 15px;"><strong>${escapeHtml(entry.fullName)}</strong></p>
        <p style="margin: 0 0 14px; font-size: 13px; color: #c5a6f5;">${escapeHtml(entry.profession)}</p>
        <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #ffffff;">“${escapeHtml(entry.comment)}”</p>
      </div>
      <a href="${escapeHtml(adminUrl)}" style="display: inline-block; background: #ff9a50; color: #16052b; text-decoration: none; font-weight: bold; padding: 12px 22px; border-radius: 999px; font-size: 14px;">
        Open Admin Moderation Dashboard &rarr;
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: `"Veneto Portfolio" <${GMAIL_USER}>`,
    to: NOTIFY_EMAIL,
    subject,
    text: textBody,
    html: htmlBody,
  });
}

function signSessionToken(expiresAtMs) {
  const payload = `${expiresAtMs}`;
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const expectedSig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");

  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function parseCookies(req) {
  const header = req.headers?.cookie || "";
  const out = {};
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  });
  return out;
}

function isAdminAuthenticated(req) {
  const cookies = parseCookies(req);
  return verifySessionToken(cookies[COOKIE_NAME]);
}

module.exports = {
  ADMIN_PASSWORD,
  COOKIE_NAME,
  getAllTestimonials,
  saveAllTestimonials,
  sendNewReviewEmail,
  signSessionToken,
  isAdminAuthenticated,
};
