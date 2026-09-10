import { buildLearningOutcome } from './buildLearningOutcome';
import { sendLearningRecordReliably } from './learningOutbox';

/**
 * Best-effort persistence. Outcome telemetry must never block gameplay.
 */
export async function recordLearningOutcome(gameState) {
  const record = buildLearningOutcome(gameState);

  if (!record) {
    return null;
  }

  try {
    return await sendLearningRecordReliably(record);
  } catch (error) {
    console.warn(
      error?.learningQueued
        ? '[LEARNING] Game outcome queued for retry:'
        : '[LEARNING] Could not save game outcome:',
      error
    );
    return null;
  }
}
