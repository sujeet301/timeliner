// services/emailService.js
const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.email.host || !env.email.user || !env.email.pass) {
    console.warn('[emailService] SMTP is not fully configured. Emails will be logged to the console instead of sent.');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.secure,
    auth: { user: env.email.user, pass: env.email.pass },
  });
  return transporter;
}

async function sendEmail({ to, subject, text, html }) {
  if (!to) throw new Error('sendEmail: "to" address is required');
  const t = getTransporter();
  if (!t) {
    console.log(`[emailService:DEV] To: ${to}\nSubject: ${subject}\n${text || html}`);
    return { simulated: true };
  }
  return t.sendMail({ from: env.email.from, to, subject, text, html });
}

module.exports = { sendEmail };
