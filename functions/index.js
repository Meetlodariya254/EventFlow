const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ============================================================
// HELPER: Send WhatsApp message via Meta Cloud API
// Reads the user's accessToken + phoneNumberId from their
// Firestore profile document (set once in the Profile page).
// ============================================================
async function sendMetaWhatsApp({ mobileNumber, message, userId }) {
  // Load user's Meta credentials from Firestore
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    throw new Error(`User document not found for uid: ${userId}`);
  }

  const userData = userDoc.data();
  const accessToken = userData.metaAccessToken || process.env.META_ACCESS_TOKEN;
  const phoneNumberId = userData.metaPhoneNumberId || process.env.META_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    throw new Error(
      "Meta WhatsApp credentials not configured. " +
      "Go to Profile → WhatsApp Setup to add your Meta Access Token and Phone Number ID."
    );
  }

  // Ensure E.164 format (e.g. +919876543210)
  let phone = mobileNumber.replace(/[^\d]/g, "");
  if (phone.length === 10) phone = "91" + phone; // default India
  const toPhone = "+" + phone;

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "text",
    text: { body: message },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  if (!response.ok) {
    const errMsg = result?.error?.message || JSON.stringify(result);
    throw new Error(`Meta API error: ${errMsg}`);
  }

  // Return the Meta message ID (used for read-receipt tracking)
  const messageId = result?.messages?.[0]?.id;
  logger.info(`Meta WhatsApp sent to ${toPhone}, messageId: ${messageId}`);
  return messageId;
}

// ============================================================
// FUNCTION 1: checkAndSendReminders
// Runs every minute via Cloud Scheduler (server-side, always on)
// Checks Firestore for events due within 2 minutes and creates
// reminder documents to trigger the WhatsApp send function.
// ============================================================
exports.checkAndSendReminders = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async (event) => {
    try {
      const now = new Date();
      const twoMinutesFromNow = new Date(now.getTime() + 2 * 60 * 1000);

      logger.info(`Checking for events due before ${twoMinutesFromNow.toISOString()}`);

      const eventsSnapshot = await db.collection("events").get();
      let reminderCount = 0;

      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();

        // Build event datetime from Firestore date + startTime string
        const eventDate = eventData.date?.toDate
          ? eventData.date.toDate()
          : new Date(eventData.date);
        const [hours, minutes] = (eventData.startTime || "00:00").split(":").map(Number);
        const eventDateTime = new Date(eventDate);
        eventDateTime.setHours(hours, minutes, 0, 0);

        // Due within next 2 minutes OR overdue by up to 5 minutes
        if (
          eventDateTime <= twoMinutesFromNow &&
          eventDateTime >= new Date(now.getTime() - 5 * 60 * 1000)
        ) {
          // Avoid duplicate reminders for the same event
          const existingReminder = await db
            .collection("reminders")
            .where("eventId", "==", eventDoc.id)
            .limit(1)
            .get();

          if (existingReminder.empty) {
            await db.collection("reminders").add({
              eventId: eventDoc.id,
              userId: eventData.userId,
              mobileNumber: eventData.mobileNumber,
              personName: eventData.personName,
              eventTitle: eventData.title,
              eventDescription: eventData.description || "",
              eventTime: eventData.startTime,
              eventDate: eventData.date,
              whatsappStatus: "pending",
              whatsappMessageId: null, // Meta message ID for read-receipt tracking
              whatsappReadStatus: "unknown", // updated by webhook
              voiceCallStatus: "pending",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            reminderCount++;
            logger.info(`Created reminder for event: ${eventData.title} (${eventDoc.id})`);
          }
        }
      }

      logger.info(`Processed ${eventsSnapshot.size} events, created ${reminderCount} reminders`);
    } catch (error) {
      logger.error("Error checking reminders:", error);
      throw error;
    }
  }
);

// ============================================================
// FUNCTION 2: sendWhatsAppReminder
// Triggered when a new reminder document is created in Firestore.
// Sends a WhatsApp message via Meta Cloud API (free, no keywords!).
// Meta will POST read-receipt updates to our webhook (Function 3).
// ============================================================
exports.sendWhatsAppReminder = onDocumentCreated(
  {
    document: "reminders/{reminderId}",
    region: "asia-south1",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.error("No data in reminder document");
      return;
    }

    const reminderData = snapshot.data();
    const reminderId = event.params.reminderId;

    try {
      const descText = reminderData.eventDescription
        ? `\n\nDescription: ${reminderData.eventDescription}`
        : "";
      const message =
        `Hi ${reminderData.personName}, reminder: ` +
        `"${reminderData.eventTitle}" is scheduled for ${reminderData.eventTime} today.` +
        `${descText}\n\nDon't miss it! 📅`;

      const messageId = await sendMetaWhatsApp({
        mobileNumber: reminderData.mobileNumber,
        message,
        userId: reminderData.userId,
      });

      // Store the Meta message ID — the webhook uses it to match read receipts
      await snapshot.ref.update({
        whatsappStatus: "sent",
        whatsappMessageId: messageId,
        whatsappSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`WhatsApp sent for reminder ${reminderId}, messageId: ${messageId}`);
    } catch (error) {
      logger.error(`Error sending WhatsApp for reminder ${reminderId}:`, error);
      await snapshot.ref.update({
        whatsappStatus: "failed",
        whatsappError: error.message,
      });
    }
  }
);

// ============================================================
// FUNCTION 3: metaWhatsAppWebhook
// HTTP endpoint that Meta calls when message status changes
// (delivered, read, failed, etc.).
// Meta Dashboard → WhatsApp → Configuration → Webhook URL: 
//   https://us-central1-<project-id>.cloudfunctions.net/metaWhatsAppWebhook
// Verify token: set META_WEBHOOK_VERIFY_TOKEN in functions/.env
// ============================================================
exports.metaWhatsAppWebhook = onRequest(
  { region: "asia-south1" },
  async (req, res) => {
    // ── GET: Webhook verification handshake from Meta ──────────────────────
    if (req.method === "GET") {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || "eventflow_verify_token";

      if (mode === "subscribe" && token === verifyToken) {
        logger.info("Meta webhook verified successfully");
        res.status(200).send(challenge);
      } else {
        logger.warn("Meta webhook verification failed");
        res.status(403).send("Forbidden");
      }
      return;
    }

    // ── POST: Incoming status update from Meta ─────────────────────────────
    if (req.method === "POST") {
      try {
        const body = req.body;
        const entries = body?.entry || [];

        for (const entry of entries) {
          for (const change of entry.changes || []) {
            const statuses = change?.value?.statuses || [];

            for (const status of statuses) {
              const messageId = status.id;
              const statusValue = status.status; // "sent", "delivered", "read", "failed"

              logger.info(`Meta status update: messageId=${messageId}, status=${statusValue}`);

              if (!messageId) continue;

              // Find reminder by Meta message ID
              const remindersSnapshot = await db
                .collection("reminders")
                .where("whatsappMessageId", "==", messageId)
                .limit(1)
                .get();

              if (!remindersSnapshot.empty) {
                const reminderRef = remindersSnapshot.docs[0].ref;
                await reminderRef.update({
                  whatsappReadStatus: statusValue,
                  whatsappStatusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  // If read, mark voiceCallStatus as skipped
                  ...(statusValue === "read"
                    ? { voiceCallStatus: "skipped" }
                    : {}),
                });
                logger.info(`Updated reminder ${remindersSnapshot.docs[0].id} with status: ${statusValue}`);
              }
            }
          }
        }

        res.status(200).send("OK");
      } catch (error) {
        logger.error("Error processing Meta webhook:", error);
        res.status(500).send("Internal Server Error");
      }
      return;
    }

    res.status(405).send("Method Not Allowed");
  }
);

// ============================================================
// FUNCTION 4: checkAndSendVoiceCalls
// Runs every minute. If WhatsApp was sent 2+ minutes ago and
// NOT yet read (whatsappReadStatus != "read"), makes a Twilio
// voice call as a fallback reminder.
// ============================================================
exports.checkAndSendVoiceCalls = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
  },
  async (event) => {
    try {
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

      // Find reminders: WhatsApp sent, not yet read, voice call still pending
      const remindersSnapshot = await db
        .collection("reminders")
        .where("whatsappStatus", "==", "sent")
        .where("voiceCallStatus", "==", "pending")
        .get();

      for (const reminderDoc of remindersSnapshot.docs) {
        const reminderData = reminderDoc.data();
        const whatsappSentAt = reminderData.whatsappSentAt?.toDate?.();

        // Only proceed if 2 minutes have passed since WhatsApp was sent
        if (!whatsappSentAt || whatsappSentAt > twoMinutesAgo) continue;

        // Skip if the user already read the WhatsApp message
        if (reminderData.whatsappReadStatus === "read") {
          await reminderDoc.ref.update({ voiceCallStatus: "skipped" });
          logger.info(`WhatsApp was read for reminder ${reminderDoc.id}, skipping voice call`);
          continue;
        }

        // WhatsApp not read — make a Twilio voice call
        try {
          const accountSid = process.env.TWILIO_ACCOUNT_SID;
          const authToken = process.env.TWILIO_AUTH_TOKEN;
          const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

          if (!accountSid || !authToken || !twilioPhone) {
            logger.warn("Twilio credentials not configured for voice call");
            continue;
          }

          const twilio = require("twilio")(accountSid, authToken);

          const descText = reminderData.eventDescription
            ? ` Description: ${reminderData.eventDescription}.`
            : "";
          const ttsMessage =
            `Hi ${reminderData.personName}, this is an automated reminder for ` +
            `${reminderData.eventTitle} scheduled for ${reminderData.eventTime}.` +
            `${descText} Please check your calendar. Thank you!`;

          const call = await twilio.calls.create({
            from: twilioPhone,
            to: reminderData.mobileNumber,
            twiml: `<Response><Pause length="2"/><Say voice="Polly.Aditi">${ttsMessage}</Say><Pause length="1"/><Say voice="Polly.Aditi">To repeat: ${ttsMessage}</Say></Response>`,
          });

          logger.info(`Voice call made to ${reminderData.mobileNumber}: ${call.sid}`);

          await reminderDoc.ref.update({
            voiceCallStatus: "called",
            voiceCallAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
            voiceCallSid: call.sid,
          });
        } catch (callError) {
          logger.error(`Voice call failed for reminder ${reminderDoc.id}:`, callError);
          await reminderDoc.ref.update({
            voiceCallStatus: "failed",
            voiceCallError: callError.message,
            voiceCallAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    } catch (error) {
      logger.error("Error checking voice call reminders:", error);
      throw error;
    }
  }
);
