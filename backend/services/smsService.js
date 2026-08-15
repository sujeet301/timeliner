// services/smsService.js
const env = require('../config/env');

let client = null;

function getClient() {
  if (client) return client;

  if (!env.sms.accountSid || !env.sms.authToken || !env.sms.fromNumber) {
    // eslint-disable-next-line no-console
    console.warn(
      '[smsService] Twilio is not fully configured (TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER). ' +
        'SMS messages will be logged to the console instead of actually sent.'
    );
    return null;
  }

  // Lazy-required so the app can boot even if the package isn't needed yet.
  // eslint-disable-next-line global-require
  const twilio = require('twilio');
  client = twilio(env.sms.accountSid, env.sms.authToken);
  return client;
}

/**
 * Sends an SMS. Throws on failure so callers can handle/report it.
 */
async function sendSMS({ to, body }) {
  if (!to) throw new Error('sendSMS: "to" phone number is required');

  const c = getClient();

  if (!c) {
    // eslint-disable-next-line no-console
    console.log(`[smsService:DEV] To: ${to}\nMessage: ${body}`);
    return { simulated: true };
  }

  const message = await c.messages.create({
    to,
    from: env.sms.fromNumber,
    body,
  });

  return message;
}

module.exports = { sendSMS };
