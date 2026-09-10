import { buildLearningOutcome } from './buildLearningOutcome';
import { sendLearningRecord } from './sendLearningRecord';

/**
 * Best-effort persistence. Outcome telemetry must never block gameplay.
 */
export async function recordLearningOutcome(gameState) {
  const record = buildLearningOutcome(gameState);

  if (!record) {
    return null;
  }

  try {
    return await sendLearningRecord(record);
  } catch (error) {
    console.warn('[LEARNING] Could not save game outcome:', error);
    return null;
  }
}
