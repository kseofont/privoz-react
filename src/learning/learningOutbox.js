import { sendLearningRecord } from './sendLearningRecord';

const OUTBOX_KEY = 'privozLearningOutbox:v1';
const MAX_OUTBOX_RECORDS = 500;
let flushPromise = null;

function canUseStorage() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function readQueue() {
  if (!canUseStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(OUTBOX_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(item => item?.eventId && item?.gameId) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(queue.slice(-MAX_OUTBOX_RECORDS)));
  } catch {}
}

function removeQueued(eventId) {
  if (!eventId) return;
  const queue = readQueue();
  const next = queue.filter(item => item?.eventId !== eventId);
  if (next.length !== queue.length) writeQueue(next);
}

function isRetryable(error) {
  const status = Number(error?.status || 0);
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

export function queueLearningRecord(record) {
  if (!record?.eventId || !record?.gameId || !canUseStorage()) return false;
  const queue = readQueue();
  if (queue.some(item => item.eventId === record.eventId && item.gameId === record.gameId)) {
    return true;
  }
  writeQueue([...queue, record]);
  return true;
}

export function getLearningOutboxSize() {
  return readQueue().length;
}

export async function flushLearningOutbox() {
  if (!canUseStorage()) return { sent: 0, remaining: 0 };
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    let queue = readQueue();
    let sent = 0;

    for (const record of [...queue]) {
      try {
        await sendLearningRecord(record);
        queue = queue.filter(item => !(item.eventId === record.eventId && item.gameId === record.gameId));
        writeQueue(queue);
        sent += 1;
      } catch (error) {
        if (!isRetryable(error)) {
          // Permanent validation/client errors should not block later valid records forever.
          queue = queue.filter(item => !(item.eventId === record.eventId && item.gameId === record.gameId));
          writeQueue(queue);
          continue;
        }
        break;
      }
    }

    return { sent, remaining: queue.length };
  })();

  try {
    return await flushPromise;
  } finally {
    flushPromise = null;
  }
}

export async function sendLearningRecordReliably(record) {
  try {
    const result = await sendLearningRecord(record);
    removeQueued(record?.eventId);
    // A successful request is a good opportunity to retry older queued records.
    void flushLearningOutbox();
    return result;
  } catch (error) {
    if (isRetryable(error)) {
      queueLearningRecord(record);
      error.learningQueued = true;
    }
    throw error;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushLearningOutbox();
  });

  setTimeout(() => {
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      void flushLearningOutbox();
    }
  }, 0);
}
