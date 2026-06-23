import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Helper: resolve Twilio credentials from env (supports both TWILIO_ and VITE_TWILIO_ prefixes)
  const getTwilioCreds = () => ({
    accountSid: env.TWILIO_ACCOUNT_SID || env.VITE_TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN || env.VITE_TWILIO_AUTH_TOKEN,
    whatsappNumber: env.TWILIO_WHATSAPP_NUMBER || env.VITE_TWILIO_WHATSAPP_NUMBER || '+14155238886',
    phoneNumber: env.TWILIO_PHONE_NUMBER || env.VITE_TWILIO_PHONE_NUMBER,
  });

  // Helper: ensure phone number has + prefix (E.164 format required by Twilio)
  const toE164 = (number) => {
    if (!number) return number;
    // Strip everything except digits
    const digits = number.replace(/[^\d]/g, '');
    return '+' + digits;
  };

  return {
    server: {
      host: true,
      allowedHosts: true,
    },
    plugins: [
      react(),
      {
        name: 'twilio-api',
        configureServer(server) {

          // ── /api/send-whatsapp ──────────────────────────────────────────
          server.middlewares.use('/api/send-whatsapp', (req, res, next) => {
            if (req.method !== 'POST') return next();

            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', async () => {
              try {
                const { to, message } = JSON.parse(body);
                const { accountSid, authToken, whatsappNumber } = getTwilioCreds();

                console.log('\n[Twilio WhatsApp] Request received');
                console.log(`  → To: ${to}`);
                console.log(`  → AccountSid: ${accountSid ? accountSid.substring(0, 10) + '...' : 'MISSING'}`);
                console.log(`  → AuthToken: ${authToken ? '***configured***' : 'MISSING'}`);
                console.log(`  → From WhatsApp: ${whatsappNumber}`);

                if (!accountSid || !authToken) {
                  console.error('[Twilio WhatsApp] ❌ Missing credentials!');
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Twilio credentials not configured' }));
                  return;
                }

                const toNumber = toE164(to);
                console.log(`  → Formatted To (E.164): ${toNumber}`);

                const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
                const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

                const params = new URLSearchParams({
                  From: `whatsapp:${whatsappNumber}`,
                  To: `whatsapp:${toNumber}`,
                  Body: message,
                });

                console.log(`  → Sending to Twilio API: From=whatsapp:${whatsappNumber} To=whatsapp:${toNumber}`);

                const response = await fetch(url, {
                  method: 'POST',
                  headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: params.toString(),
                });

                const result = await response.json();
                console.log(`  → Twilio HTTP Status: ${response.status}`);
                console.log(`  → Twilio Response:`, JSON.stringify(result, null, 2));

                if (response.ok) {
                  console.log(`  ✅ WhatsApp message sent! SID: ${result.sid}`);
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, sid: result.sid }));
                } else {
                  console.error(`  ❌ Twilio error ${response.status}: ${result.message} (code ${result.code})`);
                  // Pass full Twilio error details to the frontend
                  res.statusCode = 400; // always 400 so frontend can read the body
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    error: result.message || 'Twilio API error',
                    twilioCode: result.code,        // e.g. 63015
                    moreInfo: result.more_info,
                    status: result.status,
                  }));
                }
              } catch (error) {
                console.error('[Twilio WhatsApp] ❌ Exception:', error.message);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: error.message }));
              }
            });
          });

          // ── /api/send-voice-call ────────────────────────────────────────
          server.middlewares.use('/api/send-voice-call', (req, res, next) => {
            if (req.method !== 'POST') return next();

            let body = '';
            req.on('data', (chunk) => { body += chunk; });
            req.on('end', async () => {
              try {
                const { to, personName, eventTitle, eventTime, eventDescription } = JSON.parse(body);
                const { accountSid, authToken, phoneNumber } = getTwilioCreds();

                console.log('\n[Twilio Voice] Request received');
                console.log(`  → To: ${to}`);
                console.log(`  → AccountSid: ${accountSid ? accountSid.substring(0, 10) + '...' : 'MISSING'}`);
                console.log(`  → AuthToken: ${authToken ? '***configured***' : 'MISSING'}`);
                console.log(`  → From Phone: ${phoneNumber || 'MISSING'}`);

                if (!accountSid || !authToken) {
                  console.error('[Twilio Voice] ❌ Missing credentials!');
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Twilio credentials not configured' }));
                  return;
                }

                if (!phoneNumber || phoneNumber === 'your_twilio_phone_number') {
                  console.error('[Twilio Voice] ❌ TWILIO_PHONE_NUMBER not set!');
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'TWILIO_PHONE_NUMBER not configured in .env' }));
                  return;
                }

                const toNumber = toE164(to);
                console.log(`  → Formatted To (E.164): ${toNumber}`);

                const descText = eventDescription ? ` Description: ${eventDescription}.` : '';
                const ttsMessage = `Hi ${personName || 'there'}, this is a reminder for ${eventTitle} scheduled for ${eventTime}.${descText} Please check your calendar. Thank you!`;

                const twiml = `<Response><Say voice="alice">${ttsMessage}</Say></Response>`;

                const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
                const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

                console.log(`  → Placing call From: ${phoneNumber} To: ${toNumber}`);

                const response = await fetch(url, {
                  method: 'POST',
                  headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: new URLSearchParams({
                    From: phoneNumber,
                    To: toNumber,
                    Twiml: twiml,
                  }).toString(),
                });

                const result = await response.json();
                console.log(`  → Twilio HTTP Status: ${response.status}`);
                console.log(`  → Twilio Response:`, JSON.stringify(result, null, 2));

                if (response.ok) {
                  console.log(`  ✅ Voice call initiated! SID: ${result.sid}`);
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, sid: result.sid }));
                } else {
                  console.error(`  ❌ Twilio voice error ${response.status}: ${result.message}`);
                  res.statusCode = response.status;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: result.message || 'Twilio Voice API error', code: result.code, moreInfo: result.more_info }));
                }
              } catch (error) {
                console.error('[Twilio Voice] ❌ Exception:', error.message);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: error.message }));
              }
            });
          });

        },
      },
    ],
  };
})
