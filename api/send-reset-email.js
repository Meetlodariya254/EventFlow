import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, resetUrl, shortCode } = req.body;
    if (!to || !resetUrl) {
      return res.status(400).json({ error: 'Missing required parameters: to, resetUrl' });
    }

    const smtpUser = process.env.SMTP_USER || process.env.VITE_SMTP_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.VITE_SMTP_PASS || process.env.EMAIL_PASS;
    const smtpHost = process.env.SMTP_HOST || process.env.VITE_SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || process.env.VITE_SMTP_PORT || '465', 10);

    let transporter;
    let isTestAccount = false;

    if (smtpUser && smtpPass) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      isTestAccount = true;
    }

    const mailOptions = {
      from: '"EventFlow Security" <no-reply@eventflow.app>',
      to: to,
      subject: '🔒 Your EventFlow Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; color: #1e293b;">
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #6366f1; margin: 0; font-size: 28px; font-weight: 800;">EventFlow</h1>
          </div>
          <h2 style="color: #0f172a; font-size: 20px; text-align: center; margin-bottom: 10px;">Password Reset Verification</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; text-align: center;">
            We received a request to reset the password for account <b>${to}</b>. Use the one-time verification code below inside your application:
          </p>
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px solid #cbd5e1; padding: 25px; text-align: center; border-radius: 16px; margin: 30px 0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">One-Time Verification Code</span><br />
            <strong style="font-size: 40px; color: #4f46e5; letter-spacing: 10px; font-family: monospace; display: inline-block; margin-top: 12px; font-weight: 900;">${shortCode || '123456'}</strong>
          </div>
          <p style="color: #64748b; font-size: 13px; line-height: 1.5; text-align: center;">
            Enter this 6-digit code on the Reset Password screen to securely choose your new password.
          </p>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 25px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            If you did not request this password change, please ignore this email. This code expires in 15 minutes.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    let previewUrl = null;
    if (isTestAccount) {
      previewUrl = nodemailer.getTestMessageUrl(info);
    }

    return res.status(200).json({ success: true, messageId: info.messageId, previewUrl });
  } catch (error) {
    console.error('[Send Reset Email API] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
