// Helper: resolve Twilio credentials from process.env
const getTwilioCreds = () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID || process.env.VITE_TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN || process.env.VITE_TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || process.env.VITE_TWILIO_PHONE_NUMBER,
});

const toE164 = (number) => {
  if (!number) return number;
  const digits = number.replace(/[^\d]/g, '');
  return '+' + digits;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, personName, eventTitle, eventTime, eventDescription } = req.body;
    const { accountSid, authToken, phoneNumber } = getTwilioCreds();

    if (!accountSid || !authToken) {
      return res.status(400).json({ error: 'Twilio credentials not configured in Vercel Environment Variables' });
    }

    if (!phoneNumber || phoneNumber === 'your_twilio_phone_number') {
      return res.status(400).json({ error: 'TWILIO_PHONE_NUMBER not configured in Vercel Environment Variables' });
    }

    const toNumber = toE164(to);
    const descText = eventDescription ? ` Description: ${eventDescription}.` : '';
    const ttsMessage = `Hi ${personName || 'there'}, this is an automated reminder for ${eventTitle} scheduled for ${eventTime}.${descText} Please check your calendar. Thank you!`;
    const twiml = `<Response><Pause length="2"/><Say voice="Polly.Aditi">${ttsMessage}</Say><Pause length="1"/><Say voice="Polly.Aditi">To repeat: ${ttsMessage}</Say></Response>`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

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

    if (response.ok) {
      return res.status(200).json({ success: true, sid: result.sid });
    } else {
      return res.status(400).json({
        error: result.message || 'Twilio Voice call error',
        twilioCode: result.code,
      });
    }
  } catch (error) {
    console.error('[Vercel Voice API] Exception:', error);
    return res.status(500).json({ error: error.message });
  }
}
