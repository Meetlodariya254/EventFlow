const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ============================================================
// FUNCTION 1: checkAndSendReminders
// Runs every minute via Cloud Scheduler
// Checks for events that are due within 2 minutes and creates
// reminder documents for them
// ============================================================
exports.checkAndSendReminders = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Asia/Kolkata", // Adjust to your timezone
    region: "us-central1",
  },
  async (event) => {
    try {
      const now = new Date();
      const twoMinutesFromNow = new Date(now.getTime() + 2 * 60 * 1000);

      logger.info(`Checking for events due before ${twoMinutesFromNow.toISOString()}`);

      // Query all events
      const eventsSnapshot = await db.collection("events").get();
      let reminderCount = 0;

      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();

        // Build event datetime from date + startTime
        const eventDate = eventData.date.toDate ? eventData.date.toDate() : new Date(eventData.date);
        const [hours, minutes] = (eventData.startTime || "00:00").split(":").map(Number);
        const eventDateTime = new Date(eventDate);
        eventDateTime.setHours(hours, minutes, 0, 0);

        // Check if event is due within the next 2 minutes
        if (eventDateTime <= twoMinutesFromNow && eventDateTime >= new Date(now.getTime() - 5 * 60 * 1000)) {
          // Check if reminder already exists for this event
          const existingReminder = await db
            .collection("reminders")
            .where("eventId", "==", eventDoc.id)
            .limit(1)
            .get();

          if (existingReminder.empty) {
            // Create a new reminder document
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
// Triggered when a new reminder document is created
// Sends a WhatsApp message via Twilio
// ============================================================
exports.sendWhatsAppReminder = onDocumentCreated(
  {
    document: "reminders/{reminderId}",
    region: "us-central1",
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
      // Initialize Twilio client
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER || "+14155238886";

      if (!accountSid || !authToken) {
        logger.warn("Twilio credentials not configured. Skipping WhatsApp send.");
        await snapshot.ref.update({
          whatsappStatus: "failed",
          whatsappError: "Twilio credentials not configured",
        });
        return;
      }

      const twilio = require("twilio")(accountSid, authToken);

      // Format the message
      const descText = reminderData.eventDescription ? `\n\nDescription: ${reminderData.eventDescription}` : "";
      const message = `Hi ${reminderData.personName}, reminder: "${reminderData.eventTitle}" is scheduled for ${reminderData.eventTime} today.${descText}\n\nDon't miss it! 📅`;

      // Send WhatsApp message
      const result = await twilio.messages.create({
        from: `whatsapp:${twilioWhatsApp}`,
        to: `whatsapp:${reminderData.mobileNumber}`,
        body: message,
      });

      logger.info(`WhatsApp sent to ${reminderData.mobileNumber}: ${result.sid}`);

      // Update reminder status
      await snapshot.ref.update({
        whatsappStatus: "sent",
        whatsappSentAt: admin.firestore.FieldValue.serverTimestamp(),
        whatsappMessageSid: result.sid,
      });

      // Schedule voice call fallback after 5 minutes
      // We use a delayed Cloud Task or just store the time and check later
      const fiveMinutesLater = new Date(Date.now() + 5 * 60 * 1000);
      await snapshot.ref.update({
        voiceCallScheduledAt: admin.firestore.Timestamp.fromDate(fiveMinutesLater),
      });

      logger.info(`Voice call fallback scheduled for ${fiveMinutesLater.toISOString()}`);
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
// FUNCTION 3: checkAndSendVoiceCalls
// Runs every minute, checks for reminders where WhatsApp was
// sent 2+ minutes ago but not read (seen), then makes voice call
// ============================================================
exports.checkAndSendVoiceCalls = onSchedule(
  {
    schedule: "every 1 minutes",
    timeZone: "Asia/Kolkata",
    region: "us-central1",
  },
  async (event) => {
    try {
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

      // Find reminders where WhatsApp was sent but voice call hasn't been made
      const remindersSnapshot = await db
        .collection("reminders")
        .where("whatsappStatus", "==", "sent")
        .where("voiceCallStatus", "==", "pending")
        .get();

      for (const reminderDoc of remindersSnapshot.docs) {
        const reminderData = reminderDoc.data();
        const whatsappSentAt = reminderData.whatsappSentAt?.toDate?.();

        // Check if 2 minutes have passed since WhatsApp was sent
        if (whatsappSentAt && whatsappSentAt <= twoMinutesAgo) {
          // Check WhatsApp read status via Twilio
          let isRead = false;

          try {
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;

            if (accountSid && authToken && reminderData.whatsappMessageSid) {
              const twilio = require("twilio")(accountSid, authToken);
              const messageStatus = await twilio.messages(reminderData.whatsappMessageSid).fetch();
              // Check if the user actually opened/saw the message
              isRead = messageStatus.status === "read";

              if (isRead) {
                await reminderDoc.ref.update({
                  whatsappStatus: "read",
                  voiceCallStatus: "skipped",
                });
                logger.info(`WhatsApp was read for reminder ${reminderDoc.id}, skipping voice call`);
                continue;
              }
            }
          } catch (err) {
            logger.warn(`Could not check WhatsApp status: ${err.message}`);
          }

          // WhatsApp not read — make voice call
          try {
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const authToken = process.env.TWILIO_AUTH_TOKEN;
            const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

            if (!accountSid || !authToken || !twilioPhone) {
              logger.warn("Twilio credentials not configured for voice call");
              continue;
            }

            const twilio = require("twilio")(accountSid, authToken);

            const descText = reminderData.eventDescription ? ` Description: ${reminderData.eventDescription}.` : "";
            const ttsMessage = `Hi ${reminderData.personName}, this is a reminder for ${reminderData.eventTitle} scheduled for ${reminderData.eventTime}.${descText} Please check your calendar. Thank you!`;

            const call = await twilio.calls.create({
              from: twilioPhone,
              to: reminderData.mobileNumber,
              twiml: `<Response><Say voice="alice">${ttsMessage}</Say></Response>`,
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
      }
    } catch (error) {
      logger.error("Error checking voice call reminders:", error);
      throw error;
    }
  }
);
