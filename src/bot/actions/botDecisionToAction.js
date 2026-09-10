import {
  buyProductAction,
  endTurnAction,
  placeTraderAction,
  selectTraderAction,
} from '../../game/actions';
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

    case BOT_DECISION_TYPES.BUY_PRODUCT:
      if (decision.productId === null || decision.productId === undefined) {
        return null;
      }

      return buyProductAction({
        playerId,
        productId: decision.productId,
      });

    case BOT_DECISION_TYPES.PLACE_TRADER:
      if (!decision.traderId || !decision.sector) {
        return null;
      }

      return placeTraderAction({
        playerId,
        traderId: decision.traderId,
        sector: decision.sector,
        productIds: decision.productIds || [],
      });

    case BOT_DECISION_TYPES.END_TURN:
      return endTurnAction({ playerId });

    default:
      return null;
  }
}
