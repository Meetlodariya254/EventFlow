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
  let instanceId = process.env.GREEN_API_INSTANCE_ID?.trim();
  let apiToken   = process.env.GREEN_API_TOKEN?.trim();

  if (userId) {
    try {
      const userDoc = await db.collection("users").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.greenApiInstanceId && userData.greenApiToken) {
          instanceId = String(userData.greenApiInstanceId).trim();
          apiToken   = String(userData.greenApiToken).trim();
        }
      }
    } catch (err) {
      logger.warn(`Could not fetch user doc for ${userId}, using fallback env vars:`, err.message);
    }
  }

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

  let response;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, message }),
      });
      break;
    } catch (err) {
      if (attempt === 3) throw err;
      logger.warn(`Green API fetch attempt ${attempt} failed: ${err.message}. Retrying...`);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

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

        let eventDateTime;
        if (eventData.eventDateTimeUTC?.toDate) {
          eventDateTime = eventData.eventDateTimeUTC.toDate();
        } else if (eventData.eventDateTimeUTC) {
          eventDateTime = new Date(eventData.eventDateTimeUTC);
        } else {
          // Fallback for older events: compute exact UTC epoch assuming event date & time are in IST (+05:30)
          const dateObj = eventData.date?.toDate ? eventData.date.toDate() : new Date(eventData.date);
          const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
          const dateStr = formatter.format(dateObj); // YYYY-MM-DD in IST
          eventDateTime = new Date(`${dateStr}T${eventData.startTime || "00:00"}:00+05:30`);
        }

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
              eventNotes:       eventData.notes || "",
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
        ? `\n📝 *Description:* ${reminderData.eventDescription}`
        : "";

      const notesText = reminderData.eventNotes
        ? `\n💡 *Notes:* ${reminderData.eventNotes}`
        : "";

      const message =
        `🔔 *Reminder from EventFlow*\n\n` +
        `Hi ${reminderData.personName}! This is a reminder for your upcoming event:\n\n` +
        `📌 *${reminderData.eventTitle}*\n` +
        `📅 ${dateStr} at ${timeStr}` +
        `${descText}` +
        `${notesText}\n\n` +
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

      if (reminderData.eventId) {
        await db.collection("events").doc(reminderData.eventId).update({
          reminderStatus: "whatsapp_sent",
          whatsappSentAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      }

      logger.info(`WhatsApp sent for reminder ${reminderId}, messageId: ${messageId}`);
    } catch (error) {
      logger.error(`Error sending WhatsApp for reminder ${reminderId}:`, error.message);
      await snapshot.ref.update({
        whatsappStatus: "failed",
        whatsappError:  error.message,
      });
      if (reminderData.eventId) {
        await db.collection("events").doc(reminderData.eventId).update({
          reminderStatus: "whatsapp_failed",
        }).catch(() => {});
      }
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
      if (webhookType === "outgoingMessageStatus" || webhookType === "outgoingAPIMessageReceived") {
        const messageId = body?.idMessage || body?.messageData?.idMessage || body?.instanceData?.idMessage;
        const statusRaw = body?.status || body?.statusData?.status || body?.statusMessage || "";
        const status    = String(statusRaw).toLowerCase(); // "sent" | "delivered" | "read" | "failed"

        logger.info(`Green API message status: id=${messageId}, status=${status}`);

        if (messageId && status) {
          const remindersSnapshot = await db
            .collection("reminders")
            .where("whatsappMessageId", "==", messageId)
            .limit(1)
            .get();

          if (!remindersSnapshot.empty) {
            const reminderDoc = remindersSnapshot.docs[0];
            const updates = {
              whatsappReadStatus:        status,
              whatsappStatusUpdatedAt:   admin.firestore.FieldValue.serverTimestamp(),
            };
            if (status === "read") {
              updates.voiceCallStatus = "skipped";
            }
            await reminderDoc.ref.update(updates);

            const eventId = reminderDoc.data().eventId;
            if (eventId) {
              await db.collection("events").doc(eventId).update({
                reminderStatus: status === "read" ? "whatsapp_read" : `whatsapp_${status}`,
              }).catch(() => {});
            }
            logger.info(
              `Reminder ${reminderDoc.id} updated → status: ${status}`
            );
          }
        }
      } else if (webhookType === "incomingMessageReceived") {
        // If the user replied on WhatsApp within the reminder window, they saw it!
        const chatId = body?.senderData?.chatId;
        if (chatId) {
          const phone = chatId.replace(/[^\d]/g, "");
          // Find active reminders for this mobile number
          const activeReminders = await db
            .collection("reminders")
            .where("voiceCallStatus", "==", "pending")
            .get();

          for (const doc of activeReminders.docs) {
            const rData = doc.data();
            const rPhone = (rData.mobileNumber || "").replace(/[^\d]/g, "");
            if (phone.endsWith(rPhone) || rPhone.endsWith(phone)) {
              await doc.ref.update({
                whatsappReadStatus: "read",
                voiceCallStatus: "skipped",
                whatsappStatusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              if (rData.eventId) {
                await db.collection("events").doc(rData.eventId).update({
                  reminderStatus: "whatsapp_read",
                }).catch(() => {});
              }
              logger.info(`Incoming WhatsApp reply from ${chatId} → marked reminder ${doc.id} as read & skipped call.`);
            }
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

async function checkGreenApiMessageStatus({ instanceId, apiToken, chatId, messageId }) {
  if (!instanceId || !apiToken || !chatId || !messageId) return null;
  try {
    const url = `https://api.green-api.com/waInstance${instanceId}/getMessage/${apiToken}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, idMessage: messageId }),
    });
    if (!res.ok) {
      logger.warn(`Green API getMessage returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    return (data?.statusMessage || data?.status || data?.statusData?.status || "").toLowerCase();
  } catch (err) {
    logger.warn(`Failed to check Green API status for ${messageId}:`, err.message);
    return null;
  }
}

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
        .where("whatsappStatus",   "in", ["sent", "failed"])
        .where("voiceCallStatus",  "==", "pending")
        .get();

      for (const reminderDoc of remindersSnapshot.docs) {
        const reminderData  = reminderDoc.data();
        const refTime = reminderData.whatsappSentAt?.toDate?.() || reminderData.createdAt?.toDate?.() || new Date(0);

        // Wait 2 minutes after WhatsApp attempt or creation
        if (refTime > twoMinutesAgo) continue;

        // User already read the WhatsApp or saw on website — skip call ✅
        if (reminderData.whatsappReadStatus === "read" || reminderData.seenOnWebsite || reminderData.voiceCallStatus === "skipped") {
          await reminderDoc.ref.update({ voiceCallStatus: "skipped", whatsappReadStatus: "read" });
          if (reminderData.eventId) {
            await db.collection("events").doc(reminderData.eventId).update({
              reminderStatus: "whatsapp_read",
            }).catch(() => {});
          }
          logger.info(`WhatsApp read or seen on website → skipping call for reminder ${reminderDoc.id}`);
          continue;
        }

        // Live check directly via Green API getMessageStatus right before triggering call
        if (reminderData.whatsappMessageId && reminderData.mobileNumber) {
          let instanceId = process.env.GREEN_API_INSTANCE_ID?.trim();
          let apiToken   = process.env.GREEN_API_TOKEN?.trim();
          if (reminderData.userId) {
            try {
              const userDoc = await db.collection("users").doc(reminderData.userId).get();
              if (userDoc.exists) {
                const ud = userDoc.data();
                if (ud.greenApiInstanceId && ud.greenApiToken) {
                  instanceId = String(ud.greenApiInstanceId).trim();
                  apiToken   = String(ud.greenApiToken).trim();
                }
              }
            } catch (_) {}
          }

          let phone = reminderData.mobileNumber.replace(/[^\d]/g, "");
          if (phone.length === 10) phone = "91" + phone;
          const chatId = `${phone}@c.us`;

          const liveStatus = await checkGreenApiMessageStatus({
            instanceId,
            apiToken,
            chatId,
            messageId: reminderData.whatsappMessageId,
          });

          logger.info(`Live WhatsApp status check for ${reminderDoc.id}: ${liveStatus}`);

          if (liveStatus === "read") {
            await reminderDoc.ref.update({ voiceCallStatus: "skipped", whatsappReadStatus: "read" });
            if (reminderData.eventId) {
              await db.collection("events").doc(reminderData.eventId).update({
                reminderStatus: "whatsapp_read",
              }).catch(() => {});
            }
            logger.info(`Live status is READ → skipping voice call for reminder ${reminderDoc.id}`);
            continue;
          }
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

          let spokenTime = reminderData.eventTime || "";
          if (spokenTime) {
            const [h, m] = spokenTime.split(":").map(Number);
            const period = h >= 12 ? "PM" : "AM";
            spokenTime = `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
          }

          const descText = reminderData.eventDescription
            ? ` Description: ${reminderData.eventDescription}.`
            : "";
          const notesText = reminderData.eventNotes
            ? ` Notes: ${reminderData.eventNotes}.`
            : "";
          const ttsMessage =
            `Hi ${reminderData.personName}, this is an automated reminder for ` +
            `${reminderData.eventTitle} scheduled for ${spokenTime}.` +
            `${descText}${notesText} Please check your schedule. Thank you!`;

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

          if (reminderData.eventId) {
            await db.collection("events").doc(reminderData.eventId).update({
              reminderStatus: "call_triggered",
              voiceCallAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
            }).catch(() => {});
          }
        } catch (callError) {
          logger.error(`Voice call failed for ${reminderDoc.id}:`, callError);
          await reminderDoc.ref.update({
            voiceCallStatus:   "failed",
            voiceCallError:    callError.message,
            voiceCallAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          if (reminderData.eventId) {
            await db.collection("events").doc(reminderData.eventId).update({
              reminderStatus: "call_failed",
            }).catch(() => {});
          }
        }
      }
    } catch (error) {
      logger.error("Error in checkAndSendVoiceCalls:", error);
      throw error;
    }
  }
);
