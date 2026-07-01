# EventFlow — Setup Guide
## Background Reminders with Meta WhatsApp Cloud API

This guide walks you through everything you need to make reminders work **without keeping the website open**.

---

## Architecture Overview

```
User creates event → saved to Firebase Firestore
                           ↓
Firebase Cloud Function (runs every 1 min, 24/7 serverside)
                           ↓
     Finds events due in next 2 minutes
                           ↓
     Sends WhatsApp via Meta Cloud API (FREE, no keywords!)
                           ↓
     Meta sends read receipts to webhook → updates Firestore
                           ↓
     If NOT read after 2 min → Twilio voice call 📞
```

---

## Part 1: Firebase Setup (Required)

### 1.1 — Enable Firestore
1. Go to [Firebase Console](https://console.firebase.google.com) → your project `remainder-agent`
2. Click **Firestore Database** → **Create database**
3. Edition: choose **Standard** (not Enterprise — Standard is for all regular apps)
4. Location: choose **asia-south1 (Mumbai, India)** — closest to you for lowest latency
5. Click **Create database**

### 1.2 — Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 1.3 — Enable Firebase Auth (Email/Password)
1. Firebase Console → **Authentication** → **Sign-in method**
2. Enable **Email/Password**

### 1.4 — Deploy Cloud Functions
> ⚠️ Cloud Functions require the **Firebase Blaze (pay-as-you-go)** plan.  
> The free tier provides **2 million function invocations/month** — far more than enough for personal use.
> Typical cost: **$0/month** for personal reminder apps.

```bash
# In the functions/ directory:
cd functions
npm install
cd .. functions
firebase deploy --only functions
```

After deploy, note the webhook URL printed in the terminal:
```
✔ functions[us-central1-metaWhatsAppWebhook]: Successful
  https://us-central1-remainder-agent.cloudfunctions.net/metaWhatsAppWebhook
```
**Save this URL — you'll need it in Part 2, Step 4.**

---

## Part 2: Meta WhatsApp Cloud API Setup (FREE)

### 2.1 — Create a Meta Developer Account
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **My Apps** → **Create App**
3. Select **Business** type → give it a name (e.g. "EventFlow Reminders")
4. Click **Create App**

### 2.2 — Add WhatsApp to Your App
1. In your app dashboard → click **Add Product**
2. Find **WhatsApp** → click **Set up**
3. You'll land on the **WhatsApp Getting Started** page

### 2.3 — Get Your Phone Number ID & Test Token
1. On the **API Setup** page you'll see:
   - **Phone Number ID** — copy this (looks like `123456789012345`)
   - **Temporary access token** — copy this for now
2. Add your own WhatsApp number as a **test recipient**:
   - Click **Add phone number** → enter your number with country code (e.g. `+91XXXXXXXXXX`)
   - Verify with the OTP sent to your WhatsApp

### 2.4 — Create a Permanent System User Token (Never Expires!)
> The temporary token expires in 24 hours. Do this to get a permanent one:

1. Go to [business.facebook.com](https://business.facebook.com) → **Settings** → **System Users**
2. Click **Add** → name it "EventFlow Bot" → role: **Admin**
3. Click **Generate New Token** → select your app → enable **whatsapp_business_messaging** and **whatsapp_business_management** scopes
4. Copy the token — **this never expires**

### 2.5 — Configure the Webhook (for Read Receipts)
> This is what enables the "if not read in 2 min → call" logic.

1. In Meta Developer Console → **WhatsApp** → **Configuration**
2. Under **Webhook** → click **Edit**
3. Enter:
   - **Callback URL**: `https://asia-south1-remainder-agent.cloudfunctions.net/metaWhatsAppWebhook`
   - **Verify Token**: `eventflow_verify_token` (must match `META_WEBHOOK_VERIFY_TOKEN` in `functions/.env`)
4. Click **Verify and Save**
5. Under **Webhook Fields** → subscribe to **messages** ✅

### 2.6 — Save Credentials to the App
1. Open EventFlow in your browser
2. Go to **Profile** (top right avatar) → **WhatsApp** tab
3. Enter:
   - **Phone Number ID** from Step 2.3
   - **Permanent Access Token** from Step 2.4
4. Click **Save & Activate** ✅

---

## Part 3: Update functions/.env

Open `functions/.env` and fill in your values:
```env
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxx    # Your permanent system user token
META_PHONE_NUMBER_ID=123456789012345     # Your Phone Number ID from Meta
META_WEBHOOK_VERIFY_TOKEN=eventflow_verify_token

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx   # For voice calls
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
```

Then redeploy functions:
```bash
firebase deploy --only functions
```

---

## Part 4: Test It Works

1. Create an event in EventFlow scheduled **2 minutes from now**
2. **Close the browser** completely
3. Wait 2-3 minutes
4. ✅ You should receive a WhatsApp message from Meta
5. If you don't open the WhatsApp within 2 minutes → ✅ You should receive a voice call

### Check Logs if Something's Wrong
```bash
firebase functions:log
```

---

## Free Tier Limits

| Service | Free Tier |
|---|---|
| Firebase Cloud Functions | 2M invocations/month |
| Firebase Firestore | 50K reads, 20K writes/day |
| Meta WhatsApp Cloud API | 1,000 conversations/month |
| Twilio Voice Calls | Trial credit ($15) |

For a personal reminder app, **all of these are effectively unlimited at no cost**.

---

## FAQ

**Q: Will messages come from my own number?**  
A: Yes! Meta uses your registered WhatsApp Business number as the sender.

**Q: What if Meta WhatsApp isn't configured yet?**  
A: The Cloud Function will log an error and skip the WhatsApp send. The app won't crash.

**Q: Can I still send to any number?**  
A: During development mode, you can only message numbers you've added as test recipients. To message anyone, submit your app for Meta review (free process).
