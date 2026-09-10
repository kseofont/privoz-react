import { getAppVersionInfo } from '../feedback/appVersion';
import { buildLearningDecision } from './buildLearningDecision';
import { sendLearningDecision } from './sendLearningDecision';

/**
 * Best-effort persistence. Learning telemetry must never block gameplay.
 */
export async function recordAcceptedLearningDecision({ beforeState, afterState, action, actorId }) {
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
    return await sendLearningDecision(decision);
  } catch (error) {
    console.warn('[LEARNING] Could not save decision:', error);
    return null;
  }
}
