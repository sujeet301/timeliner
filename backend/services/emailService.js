// services/emailService.js
const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.email.host || !env.email.user || !env.email.pass) {
    // eslint-disable-next-line no-console
    console.warn(
      '[emailService] SMTP is not fully configured (SMTP_HOST/SMTP_USER/SMTP_PASS). ' +
        'Emails will be logged to the console instead of actually sent.'
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.secure, // true for 465, false for other ports (STARTTLS)
    auth: {
      user: env.email.user,
      pass: env.email.pass,
    },
  });

  return transporter;
}

/**
 * Sends an email. Throws on failure so callers (auth flows, the scheduler)
 * can decide how to handle/report the failure.
 */
async function sendEmail({ to, subject, text, html }) {
  if (!to) throw new Error('sendEmail: "to" address is required');

  const t = getTransporter();

  if (!t) {
    // Dev-friendly fallback so the rest of the app is fully runnable without
    // real SMTP credentials.
    // eslint-disable-next-line no-console
    console.log(`[emailService:DEV] To: ${to}\nSubject: ${subject}\n${text || html}`);
    return { simulated: true };
  }

  const info = await t.sendMail({
    from: env.email.from,
    to,
    subject,
    text,
    html,
  });

  return info;
}

module.exports = { sendEmail };
