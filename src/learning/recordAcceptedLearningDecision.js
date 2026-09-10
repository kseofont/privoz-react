import { getAppVersionInfo } from '../feedback/appVersion';
import { buildLearningDecision } from './buildLearningDecision';
import { persistDebugTransition } from '../debug/debugHistoryStorage';
import { sendLearningRecordReliably } from './learningOutbox';

/**
 * Best-effort persistence. Learning telemetry must never block gameplay.
 */
export async function recordAcceptedLearningDecision({ beforeState, afterState, action, actorId }) {
  // Persist local diagnostics synchronously before any navigation/render batching can
  // hide an intermediate accepted action. Learning telemetry remains independent
  // and best-effort below.
  persistDebugTransition({ beforeState, afterState });

  const decision = buildLearningDecision({
    beforeState,
    afterState,
    action,
    actorId,
    appVersion: getAppVersionInfo(),
  });

  if (!decision) {
    return null;
  }

  try {
    return await sendLearningRecordReliably(decision);
  } catch (error) {
    console.warn(
      error?.learningQueued
        ? '[LEARNING] Decision queued for retry:'
        : '[LEARNING] Could not save decision:',
      error
    );
    return null;
  }
}
