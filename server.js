require("dotenv").config();

const express = require("express");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "vvitto878@gmail.com";
const GMAIL_USER = process.env.GMAIL_USER || "vvitto878@gmail.com";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "veneto-admin-2026";
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash("sha256").update(ADMIN_PASSWORD + "_veneto_salt").digest("hex");
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "testimonials.json");
const COOKIE_NAME = "veneto_admin_session";

// Ensure database directory & initial seeded approved items exist
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

function ensureDatabaseSync() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(SEED_TESTIMONIALS, null, 2), "utf8");
  }
}

ensureDatabaseSync();

// Serialized async read/write lock so concurrent submissions never corrupt JSON DB
let dbQueue = Promise.resolve();

function readTestimonials() {
  return fsp
    .readFile(DB_FILE, "utf8")
    .then((raw) => JSON.parse(raw))
    .catch(() => []);
}

function writeTestimonials(items) {
  dbQueue = dbQueue.then(async () => {
    const tmpFile = `${DB_FILE}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    await fsp.writeFile(tmpFile, JSON.stringify(items, null, 2), "utf8");
    await fsp.rename(tmpFile, DB_FILE);
  });
  return dbQueue;
}

// Nodemailer Gmail Transporter
const mailTransporter = GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    })
  : null;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendNewReviewEmailNotification(entry) {
  if (!mailTransporter) {
    console.warn(
      `[Email Skipped] Set GMAIL_APP_PASSWORD in .env to email ${NOTIFY_EMAIL} on new submissions.`,
    );
    return;
  }

  const adminUrl = `${SITE_URL.replace(/\/$/, "")}/admin.html`;
  const subject = `New Portfolio Review Pending Approval — ${entry.fullName}`;

  const textBody = [
    `New testimonial submitted on Veneto Portfolio:`,
    ``,
    `Name: ${entry.fullName}`,
    `Profession: ${entry.profession}`,
    `Status: PENDING APPROVAL`,
    `Comment:`,
    `"${entry.comment}"`,
    ``,
    `Review and approve/delete securely in your Admin Dashboard:`,
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

  await mailTransporter.sendMail({
    from: `"Veneto Portfolio" <${GMAIL_USER}>`,
    to: NOTIFY_EMAIL,
    subject,
    text: textBody,
    html: htmlBody,
  });
}

// HMAC-signed HttpOnly session helpers
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
  const header = req.headers.cookie || "";
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

function requireAdmin(req, res, next) {
  const cookies = parseCookies(req);
  if (!verifySessionToken(cookies[COOKIE_NAME])) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }
  return next();
}

// Simple in-memory rate limit for public submissions (max 5 per 15 min per IP)
const submitBuckets = new Map();
function rateLimitSubmissions(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const recent = (submitBuckets.get(ip) || []).filter((ts) => now - ts < windowMs);
  if (recent.length >= 5) {
    return res
      .status(429)
      .json({ error: "Too many submissions. Please try again in a few minutes." });
  }
  recent.push(now);
  submitBuckets.set(ip, recent);
  return next();
}

app.use(express.json({ limit: "32kb" }));

// Block direct HTTP access to raw data directory
app.use("/data", (_req, res) => res.status(403).end());

// Serve static portfolio files
app.use(express.static(__dirname));

// -------------------------------------------------------------------------
// PUBLIC API ROUTES
// -------------------------------------------------------------------------

// GET /api/testimonials -> returns ONLY approved testimonials
app.get("/api/testimonials", async (_req, res) => {
  const all = await readTestimonials();
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

  res.json({ testimonials: approved });
});

// POST /api/testimonials -> validates, saves as 'pending', emails vvitto878@gmail.com
app.post("/api/testimonials", rateLimitSubmissions, async (req, res) => {
  const { fullName, profession, photoUrl, comment, website } = req.body || {};

  // Silent honeypot check
  if (website && String(website).trim().length > 0) {
    return res.status(201).json({
      message:
        "Thank you! Your review has been submitted and is awaiting approval.",
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

  const all = await readTestimonials();
  all.push(newEntry);
  await writeTestimonials(all);

  // Send Gmail notification asynchronously so user gets an instant response
  sendNewReviewEmailNotification(newEntry).catch((err) => {
    console.error("[Gmail Notification Error]", err.message);
  });

  return res.status(201).json({
    message:
      "Thank you! Your comment has been saved and is awaiting approval before appearing publicly.",
  });
});

// -------------------------------------------------------------------------
// ADMIN AUTH & MODERATION ROUTES
// -------------------------------------------------------------------------

app.post("/api/admin/login", (req, res) => {
  const supplied = String(req.body?.password || "");
  const a = Buffer.from(supplied, "utf8");
  const b = Buffer.from(ADMIN_PASSWORD, "utf8");

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Invalid admin password." });
  }

  const maxAgeSec = 60 * 60 * 8; // 8 hours
  const token = signSessionToken(Date.now() + maxAgeSec * 1000);
  const isProd = process.env.NODE_ENV === "production";

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAgeSec}; SameSite=Strict${isProd ? "; Secure" : ""}`,
  );
  return res.json({ ok: true });
});

app.post("/api/admin/logout", (_req, res) => {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`,
  );
  return res.json({ ok: true });
});

app.get("/api/admin/testimonials", requireAdmin, async (_req, res) => {
  const all = await readTestimonials();
  const sorted = [...all].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
  res.json({ testimonials: sorted });
});

app.patch("/api/admin/testimonials/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!["pending", "approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }

  const all = await readTestimonials();
  const item = all.find((entry) => entry.id === id);
  if (!item) {
    return res.status(404).json({ error: "Testimonial not found." });
  }

  item.status = status;
  item.updatedAt = new Date().toISOString();
  await writeTestimonials(all);

  return res.json({ ok: true, testimonial: item });
});

app.delete("/api/admin/testimonials/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const all = await readTestimonials();
  const next = all.filter((entry) => entry.id !== id);
  if (next.length === all.length) {
    return res.status(404).json({ error: "Testimonial not found." });
  }
  await writeTestimonials(next);
  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Veneto Portfolio server running at ${SITE_URL}`);
  console.log(`Admin Moderation Dashboard: ${SITE_URL}/admin.html`);
  console.log(`Gmail notifications destination: ${NOTIFY_EMAIL}`);
});
