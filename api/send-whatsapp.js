// Helper: resolve Twilio credentials from process.env
const getTwilioCreds = () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID || process.env.VITE_TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN || process.env.VITE_TWILIO_AUTH_TOKEN,
  whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || process.env.VITE_TWILIO_WHATSAPP_NUMBER || '+14155238886',
});

// Helper: ensure phone number has + prefix (E.164 format required by Twilio)
const toE164 = (number) => {
  if (!number) return number;
  const digits = number.replace(/[^\d]/g, '');
  return '+' + digits;
};

export default async function handler(req, res) {
  // CORS & Method check
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, message } = req.body;
    const { accountSid, authToken, whatsappNumber } = getTwilioCreds();

    if (!accountSid || !authToken) {
      return res.status(400).json({ error: 'Twilio credentials not configured in Vercel Environment Variables' });
    }

    const toNumber = toE164(to);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const params = new URLSearchParams({
      From: `whatsapp:${whatsappNumber}`,
      To: `whatsapp:${toNumber}`,
      Body: message,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const result = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true, sid: result.sid });
    } else {
      return res.status(400).json({
        error: result.message || 'Twilio API error',
        twilioCode: result.code,
        moreInfo: result.more_info,
        status: result.status,
      });
    }
  } catch (error) {
    console.error('[Vercel API] Exception:', error);
    return res.status(500).json({ error: error.message });
  }
}
