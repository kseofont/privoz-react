import { ACTION_TYPES } from './actions';
import { chooseRandomEventCardId } from './eventCards';
import { validateAndNormalizeEventChoice } from './eventChoiceRules';

/**
 * Convert a client/host intent into the action that is allowed to reach
 * the authoritative reducer.
 *
 * Identity and host-only random outcomes are assigned here. Client-provided
 * playerId/eventCardId values are never trusted.
 */
export function prepareAuthoritativeGameAction(gameState, incomingAction, actorId) {
  if (!incomingAction || !actorId) {
    return incomingAction;
  }

  const payload = {
    ...(incomingAction.payload || {}),
    playerId: actorId,
  };

  if (incomingAction.type === ACTION_TYPES.PLACE_TRADER) {
    const productIds = Array.isArray(payload.productIds) ? payload.productIds : [];

    payload.eventCardId = productIds.length > 0 ? chooseRandomEventCardId(gameState) : null;
  }

  if (incomingAction.type === ACTION_TYPES.SUBMIT_EVENT_CHOICES) {
    const validation = validateAndNormalizeEventChoice(gameState, payload);

    if (validation.ok) {
      payload.positiveChoices = validation.positiveChoices;
      payload.effectTargets = validation.effectTargets;
    }
  }

  return {
    ...incomingAction,
    payload,
  };
}
