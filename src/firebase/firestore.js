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

export const createEvent = async (eventData) => {
  const eventsRef = collection(db, 'events');
  const docRef = await addDoc(eventsRef, {
    ...eventData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updateEvent = async (eventId, updates) => {
  const eventRef = doc(db, 'events', eventId);
  await updateDoc(eventRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteEvent = async (eventId) => {
  await deleteDoc(doc(db, 'events', eventId));
};

export const subscribeToEvents = (userId, callback) => {
  const eventsRef = collection(db, 'events');
  const q = query(
    eventsRef,
    where('userId', '==', userId),
    orderBy('date', 'asc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        // Convert Firestore Timestamp → JS Date
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
      };
    });
    callback(events);
  });

  return unsubscribe;
};

// =================== REMINDERS ===================

export const subscribeToReminders = (eventId, callback) => {
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
  });

  return unsubscribe;
};

export const subscribeToUserReminders = (userId, callback) => {
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
