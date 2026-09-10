import { sendLearningRecord } from './sendLearningRecord';

export async function sendLearningDecision(decision) {
  return sendLearningRecord(decision);
}
