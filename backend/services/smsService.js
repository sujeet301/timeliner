// services/smsService.js
const env = require('../config/env');

let client = null;

function getClient() {
  if (client) return client;
  if (!env.sms.accountSid || !env.sms.authToken || !env.sms.fromNumber) {
    console.warn('[smsService] Twilio is not fully configured. SMS will be logged to the console instead of sent.');
    return null;
  }
  // eslint-disable-next-line global-require
  const twilio = require('twilio');
  client = twilio(env.sms.accountSid, env.sms.authToken);
  return client;
}

async function sendSMS({ to, body }) {
  if (!to) throw new Error('sendSMS: "to" phone number is required');
  const c = getClient();
  if (!c) {
    console.log(`[smsService:DEV] To: ${to}\nMessage: ${body}`);
    return { simulated: true };
  }
  return c.messages.create({ to, from: env.sms.fromNumber, body });
}

module.exports = { sendSMS };
