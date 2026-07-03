const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ============================================================
// HELPER: Send WhatsApp via Green API (free, personal number)
// Messages come from YOUR OWN WhatsApp number after QR scan.
// Free plan: 100 messages/month. No Meta account needed.
// ============================================================
async function sendGreenApiWhatsApp({ mobileNumber, message, userId }) {
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    throw new Error(`User document not found for uid: ${userId}`);
  }

  const userData = userDoc.data();
  const instanceId = userData.greenApiInstanceId || process.env.GREEN_API_INSTANCE_ID;
  const apiToken   = userData.greenApiToken      || process.env.GREEN_API_TOKEN;

  if (!instanceId || !apiToken) {
    throw new Error(
      "Green API credentials not configured. " +
      "Go to Profile → WhatsApp Setup to add your Instance ID and Token."
    );
  }

  // chatId format: countryCode+number@c.us  (no + or spaces)
  let phone = mobileNumber.replace(/[^\d]/g, "");
  if (phone.length === 10) phone = "91" + phone; // default India
  const chatId = `${phone}@c.us`;

  const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiToken}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(`Green API error: ${JSON.stringify(result)}`);
  }

  const messageId = result.idMessage;
  logger.info(`Green API WhatsApp sent to ${chatId}, messageId: ${messageId}`);
  return messageId;
}

// ============================================================
// FUNCTION 1: checkAndSendReminders
// Runs every minute server-side (Cloud Scheduler).
// Finds events due in ≤2 min and creates reminder docs.
// Works 24/7 even when the browser is completely closed.
// ============================================================
exports.checkAndSendReminders = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    try {
      const now = new Date();
      // Look 2 minutes ahead — reminder fires exactly 2 minutes before event start
      const twoMinutesFromNow = new Date(now.getTime() + 2 * 60 * 1000);
      // 10-minute catch-up window handles any server timing jitter
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

      const eventsSnapshot = await db.collection("events").get();
      let reminderCount = 0;
      let skippedCount = 0;

      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();

        // Skip events without required fields
        if (!eventData.userId || !eventData.mobileNumber || !eventData.startTime) {
          logger.warn(`Event ${eventDoc.id} missing required fields (userId/mobileNumber/startTime) — skipping`);
          skippedCount++;
          continue;
        }

        const eventDate = eventData.date?.toDate
          ? eventData.date.toDate()
          : new Date(eventData.date);
        const [hours, minutes] = (eventData.startTime || "00:00").split(":").map(Number);
        const eventDateTime = new Date(eventDate);
        eventDateTime.setHours(hours, minutes, 0, 0);

        // Fire when event is within 2 minutes of starting (or up to 10 min past)
        const isUpcoming = eventDateTime <= twoMinutesFromNow;
        const notTooOld  = eventDateTime >= tenMinutesAgo;

        if (isUpcoming && notTooOld) {
          const existing = await db
            .collection("reminders")
            .where("eventId", "==", eventDoc.id)
            .limit(1)
            .get();

          if (existing.empty) {
            await db.collection("reminders").add({
              eventId:          eventDoc.id,
              userId:           eventData.userId,
              mobileNumber:     eventData.mobileNumber,
              personName:       eventData.personName,
              eventTitle:       eventData.title,
              eventDescription: eventData.description || "",
              eventTime:        eventData.startTime,
              eventDate:        eventData.date,
              whatsappStatus:   "pending",
              whatsappMessageId: null,
              whatsappReadStatus: "unknown",
              voiceCallStatus:  "pending",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            reminderCount++;
            logger.info(`Created reminder for event: "${eventData.title}" (${eventDoc.id}) at ${eventDateTime.toISOString()}`);
          }
        }
      }

      logger.info(
        `Checked ${eventsSnapshot.size} events → ${reminderCount} reminders created, ${skippedCount} skipped (missing fields)`
      );
    } catch (error) {
      logger.error("Error in checkAndSendReminders:", error);
      throw error;
    }
  }
);

// ============================================================
// FUNCTION 2: sendWhatsAppReminder
// Fires automatically when a reminder doc is created.
// Sends WhatsApp via Green API (personal number, free).
// ============================================================
exports.sendWhatsAppReminder = onDocumentCreated(
  {
    document: "reminders/{reminderId}",
    region: "asia-south1",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const reminderData = snapshot.data();
    const reminderId   = event.params.reminderId;

    try {
      // Format date for the message (e.g. "4 Jul 2026")
      let dateStr = "today";
      if (reminderData.eventDate) {
        const d = reminderData.eventDate?.toDate
          ? reminderData.eventDate.toDate()
          : new Date(reminderData.eventDate);
        dateStr = d.toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric",
          timeZone: "Asia/Kolkata",
        });
      }

      // Format time to 12-hour format
      let timeStr = reminderData.eventTime || "";
      if (timeStr) {
        const [h, m] = timeStr.split(":").map(Number);
        const period = h >= 12 ? "PM" : "AM";
        timeStr = `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
      }

      const descText = reminderData.eventDescription
        ? `\n📝 ${reminderData.eventDescription}`
        : "";

      const message =
        `🔔 *Reminder from EventFlow*\n\n` +
        `Hi ${reminderData.personName}! This is a reminder for your upcoming event:\n\n` +
        `📌 *${reminderData.eventTitle}*\n` +
        `📅 ${dateStr} at ${timeStr}` +
        `${descText}\n\n` +
        `Don't miss it! ⏰`;

      const messageId = await sendGreenApiWhatsApp({
        mobileNumber: reminderData.mobileNumber,
        message,
        userId: reminderData.userId,
      });

      await snapshot.ref.update({
        whatsappStatus:   "sent",
        whatsappMessageId: messageId,
        whatsappSentAt:   admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`WhatsApp sent for reminder ${reminderId}, messageId: ${messageId}`);
    } catch (error) {
      logger.error(`Error sending WhatsApp for reminder ${reminderId}:`, error.message);
      await snapshot.ref.update({
        whatsappStatus: "failed",
        whatsappError:  error.message,
      });
    }
  }
);

// ============================================================
// FUNCTION 3: greenApiWebhook
// Green API calls this URL when a message is delivered/read.
// Configure in: green-api.com → Instance → Settings → Webhooks
//   URL: https://asia-south1-remainder-agent.cloudfunctions.net/greenApiWebhook
//   Enable: "Notifications of outgoing messages statuses" ✅
//
// When status = "read" → voiceCallStatus set to "skipped"
// → The voice call scheduler will NOT call the user.
// ============================================================
exports.greenApiWebhook = onRequest(
  { region: "asia-south1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const body        = req.body;
      const webhookType = body?.typeWebhook;

      logger.info(`Green API webhook: ${webhookType}`);

      // outgoingMessageStatus fires when our sent message changes status
      if (webhookType === "outgoingMessageStatus") {
        const messageId = body?.idMessage;
        const status    = body?.status; // "sent" | "delivered" | "read" | "failed"

        logger.info(`Green API message status: id=${messageId}, status=${status}`);

        if (messageId) {
          const remindersSnapshot = await db
            .collection("reminders")
            .where("whatsappMessageId", "==", messageId)
            .limit(1)
            .get();

          if (!remindersSnapshot.empty) {
            const reminderRef = remindersSnapshot.docs[0].ref;
            await reminderRef.update({
              whatsappReadStatus:        status,
              whatsappStatusUpdatedAt:   admin.firestore.FieldValue.serverTimestamp(),
              // If read → skip the voice call
              ...(status === "read" ? { voiceCallStatus: "skipped" } : {}),
            });
            logger.info(
              `Reminder ${remindersSnapshot.docs[0].id} updated → status: ${status}`
            );
          }
        }
      }

      res.status(200).send("OK");
    } catch (error) {
      logger.error("Error in greenApiWebhook:", error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// ============================================================
// FUNCTION 4: checkAndSendVoiceCalls
// Runs every minute. If WhatsApp sent 2+ min ago and NOT read
// → Twilio voice call (fallback reminder). If read → skip.
// ============================================================
exports.checkAndSendVoiceCalls = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async () => {
    try {
      const now           = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

      const remindersSnapshot = await db
        .collection("reminders")
        .where("whatsappStatus",   "==", "sent")
        .where("voiceCallStatus",  "==", "pending")
        .get();

      for (const reminderDoc of remindersSnapshot.docs) {
        const reminderData  = reminderDoc.data();
        const whatsappSentAt = reminderData.whatsappSentAt?.toDate?.();

        // Not yet 2 minutes since WhatsApp was sent — wait
        if (!whatsappSentAt || whatsappSentAt > twoMinutesAgo) continue;

        // User already read the WhatsApp — skip call ✅
        if (reminderData.whatsappReadStatus === "read") {
          await reminderDoc.ref.update({ voiceCallStatus: "skipped" });
          logger.info(`WhatsApp read → skipping call for reminder ${reminderDoc.id}`);
          continue;
        }

        // Not read after 2 min → make a Twilio voice call 📞
        try {
          const accountSid = process.env.TWILIO_ACCOUNT_SID;
          const authToken  = process.env.TWILIO_AUTH_TOKEN;
          const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

          if (!accountSid || !authToken || !twilioPhone) {
            logger.warn("Twilio credentials not configured");
            continue;
          }

          const twilio = require("twilio")(accountSid, authToken);

          let phone = (reminderData.mobileNumber || "").replace(/[^\d]/g, "");
          if (phone.length === 10) phone = "91" + phone;
          const toPhone = "+" + phone;

          const descText = reminderData.eventDescription
            ? ` Description: ${reminderData.eventDescription}.`
            : "";
          const ttsMessage =
            `Hi ${reminderData.personName}, this is an automated reminder for ` +
            `${reminderData.eventTitle} scheduled for ${reminderData.eventTime}.` +
            `${descText} Please check your schedule. Thank you!`;

          const call = await twilio.calls.create({
            from:  twilioPhone,
            to:    toPhone,
            twiml: `<Response><Pause length="2"/><Say voice="Polly.Aditi">${ttsMessage}</Say><Pause length="1"/><Say voice="Polly.Aditi">To repeat: ${ttsMessage}</Say></Response>`,
          });

          logger.info(`Voice call made to ${toPhone}: ${call.sid}`);

          await reminderDoc.ref.update({
            voiceCallStatus:   "called",
            voiceCallAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
            voiceCallSid:      call.sid,
          });
        } catch (callError) {
          logger.error(`Voice call failed for ${reminderDoc.id}:`, callError);
          await reminderDoc.ref.update({
            voiceCallStatus:   "failed",
            voiceCallError:    callError.message,
            voiceCallAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    } catch (error) {
      logger.error("Error in checkAndSendVoiceCalls:", error);
      throw error;
    }
  }
);
