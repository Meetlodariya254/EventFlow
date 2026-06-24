// Mock Firestore Implementation using LocalStorage
const EVENTS_KEY = 'mock_events';
const REMINDERS_KEY = 'mock_reminders';

const getCollection = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const setCollection = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// Real-time listeners
const listeners = {
  events: new Set(),
  reminders: new Set()
};

const notifyListeners = (collectionName) => {
  listeners[collectionName].forEach(cb => cb());
};

// =================== EVENTS ===================

export const createEvent = async (eventData) => {
  let data = typeof eventData === 'object' ? eventData : arguments[1];
  let uid = typeof eventData === 'object' ? data.userId : arguments[0];
  if (!data.userId) data.userId = uid;

  const events = getCollection(EVENTS_KEY);
  const newEvent = {
    ...data,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  events.push(newEvent);
  setCollection(EVENTS_KEY, events);
  notifyListeners('events');
  return newEvent.id;
};

export const updateEvent = async (eventId, updates) => {
  const events = getCollection(EVENTS_KEY);
  const index = events.findIndex(e => e.id === eventId);
  if (index !== -1) {
    events[index] = { ...events[index], ...updates, updatedAt: new Date().toISOString() };
    setCollection(EVENTS_KEY, events);
    notifyListeners('events');
  }
};

export const deleteEvent = async (eventId) => {
  const events = getCollection(EVENTS_KEY);
  setCollection(EVENTS_KEY, events.filter(e => e.id !== eventId));
  notifyListeners('events');
};

export const subscribeToEvents = (userId, callback) => {
  const handler = () => {
    const events = getCollection(EVENTS_KEY)
      .filter(e => e.userId === userId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(e => ({
        ...e,
        date: new Date(e.date),
        createdAt: new Date(e.createdAt),
        updatedAt: new Date(e.updatedAt),
      }));
    callback(events);
  };
  
  listeners.events.add(handler);
  handler(); // initial call
  
  return () => {
    listeners.events.delete(handler);
  };
};

// =================== REMINDERS ===================

export const subscribeToReminders = (eventId, callback) => {
  const handler = () => {
    const reminders = getCollection(REMINDERS_KEY)
      .filter(r => r.eventId === eventId)
      .map(r => ({ ...r, createdAt: new Date(r.createdAt) }));
    callback(reminders);
  };
  
  listeners.reminders.add(handler);
  handler();
  
  return () => listeners.reminders.delete(handler);
};

export const subscribeToUserReminders = (userId, callback) => {
  const handler = () => {
    const reminders = getCollection(REMINDERS_KEY)
      .filter(r => r.userId === userId)
      .map(r => ({ ...r, createdAt: new Date(r.createdAt) }));
    callback(reminders);
  };
  
  listeners.reminders.add(handler);
  handler();
  
  return () => listeners.reminders.delete(handler);
};

// Mock Timestamp
export const toFirestoreTimestamp = (date) => {
  return date.toISOString();
};

// Background worker to simulate Cloud Functions
export const startMockReminderWorker = (userId) => {
  if (!userId) return () => {};
  
  const interval = setInterval(() => {
    const events = getCollection(EVENTS_KEY).filter((e) => e.userId === userId);
    const reminders = getCollection(REMINDERS_KEY);
    
    let remindersUpdated = false;
    const now = new Date();
    
    events.forEach((event) => {
      if (!event.date) return;
      const eventDate = new Date(event.date);
      if (event.startTime) {
        const [hours, minutes] = event.startTime.split(':').map(Number);
        eventDate.setHours(hours, minutes, 0, 0);
      }
      
      const diffMins = (eventDate.getTime() - now.getTime()) / (1000 * 60);
      
      // Due within 2 mins or overdue up to 60 mins
      if (diffMins <= 2 && diffMins >= -60) {
        let reminder = reminders.find((r) => r.eventId === event.id);
        
        if (!reminder) {
          reminder = {
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            eventId: event.id,
            userId: userId,
            type: 'whatsapp',
            status: 'pending',
            createdAt: now.toISOString(),
          };
          reminders.push(reminder);
          remindersUpdated = true;

          // Simulate WhatsApp send after 3 seconds
          setTimeout(() => {
            const currentReminders = getCollection(REMINDERS_KEY);
            const idx = currentReminders.findIndex((r) => r.id === reminder.id);
            if (idx !== -1) {
              currentReminders[idx].status = 'sent';
              currentReminders[idx].sentAt = new Date().toISOString();
              setCollection(REMINDERS_KEY, currentReminders);
              notifyListeners('reminders');

              // Custom event to trigger WhatsApp send via Twilio in App.jsx
              const evt = new CustomEvent('whatsapp_sent', { detail: event });
              window.dispatchEvent(evt);

              // Simulate delivery check after 8 seconds
              setTimeout(() => {
                const r2 = getCollection(REMINDERS_KEY);
                const idx2 = r2.findIndex((r) => r.id === reminder.id);
                if (idx2 !== -1) {
                  r2[idx2].status = 'delivered';
                  setCollection(REMINDERS_KEY, r2);
                  notifyListeners('reminders');
                }

                // Add a voice call reminder entry and trigger voice call after 2 minutes
                // (simulates the 2-minute fallback for unseen messages)
                setTimeout(() => {
                  const r3 = getCollection(REMINDERS_KEY);
                  const existingVoice = r3.find((r) => r.eventId === event.id && r.type === 'voice');
                  if (!existingVoice) {
                    const voiceReminder = {
                      id: Date.now().toString() + Math.random().toString(36).substring(7),
                      eventId: event.id,
                      userId: userId,
                      type: 'voice',
                      status: 'pending',
                      createdAt: new Date().toISOString(),
                    };
                    r3.push(voiceReminder);
                    setCollection(REMINDERS_KEY, r3);
                    notifyListeners('reminders');

                    // Dispatch event to trigger actual voice call via Twilio
                    const callEvt = new CustomEvent('voice_call_triggered', { detail: event });
                    window.dispatchEvent(callEvt);

                    // Mark voice call as "called" after attempt
                    setTimeout(() => {
                      const r4 = getCollection(REMINDERS_KEY);
                      const vIdx = r4.findIndex((r) => r.id === voiceReminder.id);
                      if (vIdx !== -1) {
                        r4[vIdx].status = 'called';
                        r4[vIdx].sentAt = new Date().toISOString();
                        setCollection(REMINDERS_KEY, r4);
                        notifyListeners('reminders');
                      }
                    }, 5000);
                  }
                }, 120000); // 120,000 ms = 2 minutes
              }, 8000);
            }
          }, 3000);
        }
      }
    });
    
    if (remindersUpdated) {
      setCollection(REMINDERS_KEY, reminders);
      notifyListeners('reminders');
    }
  }, 5000); // Check every 5 seconds for simulation
  
  return () => clearInterval(interval);
};
