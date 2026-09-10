import { PHASES } from '../../game/phases';
import policy from '../policies/policy-v001.json';

export const BOT_DECISION_TYPES = Object.freeze({
  SELECT_TRADER: 'select_trader',
});

function getLegalTraderIds(observation) {
  if (!observation || observation.phase !== PHASES.TRADER_SELECTION) {
    return [];
  }

  if (observation.currentTurnUserId !== observation.self?.playerId) {
    return [];
  }

  const traderPrice = Number(observation.self?.tradersCount || 0) * 15;

  if (Number(observation.self?.coins || 0) < traderPrice) {
    return [];
  }

  const ownedTraderIds = new Set(observation.self?.traderIds || []);

  return (observation.visibleTraders || [])
    .filter(trader => trader?.traderId && !trader.taken && !ownedTraderIds.has(trader.traderId))
    .map(trader => trader.traderId);
}

/**
 * Small deployable policy used by the website.
 *
 * The public interface is async-capable from day one so a future
 * simulation-backed or model-backed provider can replace this policy
 * without changing BotPlayerController.
 */
export async function decideWithPolicy(observation) {
  const legalTraderIds = getLegalTraderIds(observation);

  if (!legalTraderIds.length) {
    return null;
  }

  if (policy.selectTrader?.strategy !== 'first_legal') {
    return null;
  }

  return {
    type: BOT_DECISION_TYPES.SELECT_TRADER,
    traderId: legalTraderIds[0],
    policyVersion: policy.version,
  };
}

export function getActiveBotPolicyVersion() {
  return policy.version;
}
