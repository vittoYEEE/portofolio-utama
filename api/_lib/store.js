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
const REDIS_CERTS_KEY = "veneto:certificates:v1";
const REDIS_PROJECTS_KEY = "veneto:projects:v1";

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

const SEED_CERTIFICATES = [
  {
    id: "cert-1",
    title: "HTML",
    issuer: "Skilvul.com",
    year: "2026",
    category: "web",
    tag: "HTML CERTIFICATE",
    theme: "theme-deep",
    imageUrl: "./asset/html.png",
    description:
      "Sertifikasi kelulusan penyusunan kerangka halaman web menggunakan struktur HTML5 semantik, pengelolaan elemen media, formulir interaktif, dan standar penulisan kode yang bersih.",
    createdAt: "2026-11-01T08:00:00.000Z",
  },
  {
    id: "cert-2",
    title: "CSS",
    issuer: "Skilvul.com",
    year: "2026",
    category: "design",
    tag: "CSS CERTIFICATE",
    theme: "theme-royal",
    imageUrl: "./asset/css.png",
    description:
      "Sertifikasi kelulusan perancangan tata letak dan visual website modern menggunakan CSS3, Flexbox, CSS Grid, variabel gaya, serta animasi transisi yang halus.",
    createdAt: "2026-11-02T08:00:00.000Z",
  },
  {
    id: "cert-3",
    title: "JavaScript",
    issuer: "Skilvul.com",
    year: "2026",
    category: "web",
    tag: "JavaScript CERTIFICATE",
    theme: "theme-orange",
    imageUrl: "./asset/javascript.png",
    description:
      "Implementasi animasi berbasis scroll, optimasi performa GPU 60fps, dan arsitektur aplikasi web interaktif.",
    createdAt: "2026-11-03T08:00:00.000Z",
  },
  {
    id: "cert-4",
    title: "HTML",
    issuer: "Sololearn",
    year: "2026",
    category: "web",
    tag: "HTML CERTIFICATE",
    theme: "theme-lavender",
    imageUrl: "./asset/html.sololearn.jpg",
    description:
      "Sertifikasi kelulusan penyusunan kerangka halaman web menggunakan struktur HTML5 semantik, pengelolaan elemen media, formulir interaktif, dan standar penulisan kode yang bersih.",
    createdAt: "2026-11-04T08:00:00.000Z",
  },
  {
    id: "cert-5",
    title: "Creative Visual & Branding",
    issuer: "Adobe Certified",
    year: "2026",
    category: "design",
    tag: "Creative Design",
    theme: "theme-royal",
    imageUrl: "./asset/Sertifikat Penghargaan Juara Merah Putih Biru.png",
    description:
      "Eksplorasi tipografi editorial, sistem identitas visual, dan komposisi warna antarmuka digital.",
    createdAt: "2026-11-05T08:00:00.000Z",
  },
];

const SEED_PROJECTS = [
  {
    id: "proj-1",
    title: "SevenSummit",
    year: "2026",
    category: "live",
    url: "https://7summit.vercel.app/",
    imageUrl: "asset/Screenshot 2026-11-13 210405 1.png",
    description:
      "Website eksplorasi ekspedisi dan informasi tujuh puncak tertinggi dengan visual sinematik, tata letak editorial, dan navigasi responsif.",
    tags: ["HTML5", "CSS3", "JavaScript", "Responsive UI"],
    featuredOnHome: true,
    createdAt: "2026-11-01T08:00:00.000Z",
  },
  {
    id: "proj-2",
    title: "Svara Nusantara",
    year: "2026",
    category: "live",
    url: "https://svara-nusantara.vercel.app",
    imageUrl: "./asset/SVARA 2.png",
    description:
      "Platform digital bertema kekayaan budaya dan seni Nusantara yang menggabungkan tipografi ekspresif dengan interaksi modern.",
    tags: ["Web Design", "HTML & CSS", "Responsive UI"],
    featuredOnHome: true,
    createdAt: "2026-11-02T08:00:00.000Z",
  },
  {
    id: "proj-3",
    title: "Sekolah Unggul",
    year: "2026",
    category: "live",
    url: "https://sekolah-unggul.vercel.app",
    imageUrl: "./asset/SEKOLAH 1.png",
    description:
      "Sistem antarmuka portal informasi pendidikan dan profil institusi sekolah dengan struktur konten yang bersih dan ramah pengguna.",
    tags: ["Web Design", "HTML & CSS", "Responsive UI"],
    featuredOnHome: true,
    createdAt: "2026-11-03T08:00:00.000Z",
  },
  {
    id: "proj-4",
    title: "HAVZA",
    year: "2026",
    category: "concept",
    url: "",
    imageUrl: "./asset/Ecommerce.png",
    description:
      "Konsep desain toko online dan katalog produk modern dengan fokus pada visual produk yang kuat serta alur belanja yang ringkas.",
    tags: ["E-Commerce UI", "Figma", "Frontend Prototype"],
    featuredOnHome: true,
    createdAt: "2026-11-04T08:00:00.000Z",
  },
  {
    id: "proj-5",
    title: "COVO",
    year: "2026",
    category: "concept",
    url: "",
    imageUrl: "./asset/COVO.png",
    description:
      "Aplikasi belajar bahasa dan pencocokan partner percakapan berbasis minat dengan fitur persiapan frasa interaktif, pelacakan progres, dan antarmuka bersih berilustrasi ramah.",
    tags: ["App Design", "Figma", "Frontend Prototype"],
    featuredOnHome: false,
    createdAt: "2026-11-05T08:00:00.000Z",
  },
  {
    id: "proj-6",
    title: "INVICTUS",
    year: "2026",
    category: "live",
    url: "https://invictus3.vercel.app/",
    imageUrl: "./asset/Invictus.web.png",
    description:
      "Website resmi angkatan dengan tampilan modern, galeri momen kebersamaan, dan informasi profil anggota.",
    tags: ["Website", "HTML & CSS", "Responsive UI"],
    featuredOnHome: false,
    createdAt: "2026-11-06T08:00:00.000Z",
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

async function getCollection(key, seedData) {
  const { url, token } = getRedisConfig();
  if (!url || !token) {
    return [...seedData];
  }

  const raw = await redisCommand(["GET", key]);
  if (!raw) {
    await redisCommand(["SET", key, JSON.stringify(seedData)]);
    return [...seedData];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...seedData];
  } catch (_) {
    return [...seedData];
  }
}

async function getAllTestimonials() {
  return getCollection(REDIS_KEY, SEED_TESTIMONIALS);
}

async function saveAllTestimonials(items) {
  await redisCommand(["SET", REDIS_KEY, JSON.stringify(items)]);
}

async function getAllCertificates() {
  return getCollection(REDIS_CERTS_KEY, SEED_CERTIFICATES);
}

async function saveAllCertificates(items) {
  await redisCommand(["SET", REDIS_CERTS_KEY, JSON.stringify(items)]);
}

async function getAllProjects() {
  return getCollection(REDIS_PROJECTS_KEY, SEED_PROJECTS);
}

async function saveAllProjects(items) {
  await redisCommand(["SET", REDIS_PROJECTS_KEY, JSON.stringify(items)]);
}

function escapeHtml(str) {
  return String(str || "")
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
  getAllCertificates,
  saveAllCertificates,
  getAllProjects,
  saveAllProjects,
  sendNewReviewEmail,
  signSessionToken,
  isAdminAuthenticated,
};