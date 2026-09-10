import { selectTraderAction } from '../../game/actions';
import { BOT_DECISION_TYPES } from '../decisions/PolicyDecisionProvider';

/**
 * Convert a bot intention into the same game action used by human UI.
 *
 * The host remains authoritative and will overwrite playerId with
 * conn.peer before applying the reducer.
 */
export function botDecisionToAction(decision, playerId) {
  if (!decision || !playerId) {
    return null;
  }

  switch (decision.type) {
    case BOT_DECISION_TYPES.SELECT_TRADER:
      if (!decision.traderId) {
        return null;
      }

      return selectTraderAction({
        playerId,
        traderId: decision.traderId,
      });

    default:
      return null;
  }
}
