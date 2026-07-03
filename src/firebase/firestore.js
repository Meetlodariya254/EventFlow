// Real Firestore Implementation using Firebase SDK
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

// =================== EVENTS ===================

export const createEvent = async (userId, eventData) => {
  const eventsRef = collection(db, 'events');
  const docRef = await addDoc(eventsRef, {
    ...eventData,
    userId,                        // REQUIRED: links event to user for reminders
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateEvent = async (eventId, updates) => {
  const eventRef = doc(db, 'events', eventId);
  // Never allow overwriting userId on update
  const { userId: _removed, ...safeUpdates } = updates;
  await updateDoc(eventRef, {
    ...safeUpdates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteEvent = async (eventId) => {
  await deleteDoc(doc(db, 'events', eventId));
};

export const subscribeToEvents = (userId, callback, onError) => {
  const eventsRef = collection(db, 'events');
  // Simple equality query — requires ZERO custom composite indexes in Firestore
  const q = query(
    eventsRef,
    where('userId', '==', userId)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        // Convert Firestore Timestamp → JS Date
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date || Date.now()),
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
      };
    });
    // Sort client-side ascending by date
    events.sort((a, b) => a.date - b.date);
    callback(events);
  }, (error) => {
    console.error("Firestore subscribeToEvents error:", error);
    if (onError) onError(error);
  });

  return unsubscribe;
};

// =================== REMINDERS ===================

export const subscribeToReminders = (eventId, callback, onError) => {
  const remindersRef = collection(db, 'reminders');
  const q = query(remindersRef, where('eventId', '==', eventId));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    // Cloud Functions store one doc per event with whatsappStatus + voiceCallStatus.
    // Map each to the two-typed-object shape that EventDetails.jsx expects.
    const reminders = [];

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const createdAt = data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(data.createdAt || Date.now());

      // WhatsApp reminder entry
      reminders.push({
        ...data,
        id: docSnap.id + '_wa',
        type: 'whatsapp',
        status: data.whatsappStatus || 'pending',
        sentAt: data.whatsappSentAt instanceof Timestamp
          ? data.whatsappSentAt.toDate().toISOString()
          : null,
        createdAt,
      });

      // Voice call reminder entry (only show if voice was attempted or skipped)
      if (data.voiceCallStatus && data.voiceCallStatus !== 'pending') {
        reminders.push({
          ...data,
          id: docSnap.id + '_vc',
          type: 'voice',
          status: data.voiceCallStatus === 'called' ? 'called' : data.voiceCallStatus,
          sentAt: data.voiceCallAttemptAt instanceof Timestamp
            ? data.voiceCallAttemptAt.toDate().toISOString()
            : null,
          createdAt,
        });
      }
    });

    callback(reminders);
  }, (error) => {
    console.error("Firestore subscribeToReminders error:", error);
    if (onError) onError(error);
  });

  return unsubscribe;
};

export const subscribeToUserReminders = (userId, callback, onError) => {
  const remindersRef = collection(db, 'reminders');
  const q = query(remindersRef, where('userId', '==', userId));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const reminders = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
      };
    });
    callback(reminders);
  }, (error) => {
    console.error("Firestore subscribeToUserReminders error:", error);
    if (onError) onError(error);
  });

  return unsubscribe;
};

// Mock Timestamp (kept for compatibility with any callers)
export const toFirestoreTimestamp = (date) => {
  return Timestamp.fromDate(date);
};

// startMockReminderWorker is intentionally removed.
// Firebase Cloud Functions (functions/index.js) now handle all reminder
// scheduling server-side — no browser tab needs to be open.
export const startMockReminderWorker = () => {
  // No-op: Cloud Functions handle this now
  return () => {};
};
