const nodemailer = require("nodemailer");

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (_) {
      return res.status(400).json({ error: "Format data tidak valid." });
    }
  }
  body = body || {};

  // Honeypot anti-spam
  if (body.website) {
    return res.status(200).json({ ok: true, message: "Pesan terkirim!" });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const message = String(body.message || "").trim();

  if (name.length < 2 || name.length > 80) {
    return res.status(400).json({ error: "Nama harus 2–80 karakter." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
    return res.status(400).json({ error: "Alamat email tidak valid." });
  }
  if (message.length < 10 || message.length > 1500) {
    return res.status(400).json({ error: "Pesan harus 10–1500 karakter." });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const gmailUser = process.env.GMAIL_USER || "vvitto878@gmail.com";
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const notifyEmail = process.env.NOTIFY_EMAIL || "vvitto878@gmail.com";

  const subject = `Pesan Proyek Baru dari ${name}`;
  const textContent = `Nama: ${name}\nEmail: ${email}\n\nPesan:\n${message}`;
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1c033d;">
      <h2 style="margin-bottom:8px;">Pesan Proyek Baru — Veneto Portfolio</h2>
      <p><strong>Nama:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
      <hr style="border:none;border-top:1px solid #e5dcff;margin:16px 0;" />
      <p style="white-space:pre-line;">${escapeHtml(message)}</p>
    </div>
  `;

  try {
    if (resendApiKey) {
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Veneto Portfolio Contact <onboarding@resend.dev>",
          to: [notifyEmail],
          reply_to: email,
          subject,
          text: textContent,
          html: htmlContent,
        }),
      });

      if (!resendRes.ok) {
        const errDetail = await resendRes.text();
        throw new Error(`Resend API error (${resendRes.status}): ${errDetail}`);
      }
    } else if (gmailPass) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      await transporter.sendMail({
        from: `"Veneto Portfolio Contact" <${gmailUser}>`,
        to: notifyEmail,
        replyTo: email,
        subject,
        text: textContent,
        html: htmlContent,
      });
    } else {
      return res.status(500).json({
        error: "Konfigurasi email server (RESEND_API_KEY) belum diatur.",
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Terima kasih! Pesanmu sudah terkirim ke Vittorio0521@student.abudzar.sch.id.",
    });
  } catch (err) {
    console.error("Contact email error:", err);
    return res.status(500).json({
      error: "Terjadi kesalahan saat mengirim email. Silakan coba lagi.",
    });
  }
};