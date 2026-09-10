import { PHASES } from '../../game/phases';
import policy from '../policies/policy-v002.json';

export const BOT_DECISION_TYPES = Object.freeze({
  SELECT_TRADER: 'select_trader',
  BUY_PRODUCT: 'buy_product',
});

export const BOT_BEHAVIOR_PROFILES = Object.freeze([
  'balanced',
  'all_in',
  'saver',
  'specialist',
  'diversifier',
  'smuggler',
]);

export function normalizeBotBehaviorProfile(value) {
  return BOT_BEHAVIOR_PROFILES.includes(value) ? value : policy.defaultBehaviorProfile;
}

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

function getOwnedSectorCounts(observation) {
  return (observation.self?.products || []).reduce((acc, product) => {
    const quantity = Number(product?.quantity || 0);
    const sector = product?.sector || 'unknown';

    if (quantity > 0) {
      acc[sector] = (acc[sector] || 0) + quantity;
    }

    return acc;
  }, {});
}

function getProductProfile(profileId) {
  const normalizedProfile = normalizeBotBehaviorProfile(profileId);

  return {
    id: normalizedProfile,
    config:
      policy.buyProduct?.profiles?.[normalizedProfile] ||
      policy.buyProduct?.profiles?.[policy.defaultBehaviorProfile] ||
      {},
  };
}

function matchesLegalityMode(product, legalityMode) {
  const isIllegal = product.legality === 'illegal';

  if (legalityMode === 'legal_only') {
    return !isIllegal;
  }

  if (legalityMode === 'illegal_only') {
    return isIllegal;
  }

  return true;
}

function scoreProduct(product, profileConfig, sectorCounts) {
  const price = Number(product.wholesalePrice || 0);
  const profit = Number(product.profit || 0);
  const sector = product.sector || 'unknown';
  const isIllegal = product.legality === 'illegal';
  const ownedInSector = Number(sectorCounts[sector] || 0);

  let score = 0;

  switch (profileConfig.priceMode) {
    case 'spend':
      score += price * 12 + profit;
      break;

    case 'profit':
      score += profit * 12 - price;
      break;

    case 'cheap':
      score += profit - price * 12;
      break;

    case 'value':
    default:
      score += (profit / Math.max(1, price)) * 100 + profit * 2;
      break;
  }

  if (profileConfig.sectorMode === 'focus') {
    const hasOwnedSector = Object.keys(sectorCounts).length > 0;

    if (hasOwnedSector) {
      score += ownedInSector > 0 ? 160 + ownedInSector * 10 : -40;
    }
  } else if (profileConfig.sectorMode === 'diversify') {
    score += ownedInSector === 0 ? 120 : -ownedInSector * 35;
  }

  if (profileConfig.legalityMode === 'prefer_legal') {
    score += isIllegal ? -100 : 50;
  } else if (profileConfig.legalityMode === 'prefer_illegal') {
    score += isIllegal ? 80 : -20;
  }

  return score;
}

function decideProduct(observation, behaviorProfile) {
  if (observation.currentTurnUserId !== observation.self?.playerId) {
    return null;
  }

  const { id: profileId, config } = getProductProfile(behaviorProfile);
  const coins = Number(observation.self?.coins || 0);
  const reserveCoins = Math.max(0, Number(config.reserveCoins || 0));
  const spendableCoins = Math.max(0, coins - reserveCoins);

  if (spendableCoins <= 0) {
    return null;
  }

  const candidates = (observation.visibleProducts || []).filter(product => {
    const price = Number(product?.wholesalePrice || 0);

    return (
      product?.productId !== null &&
      product?.productId !== undefined &&
      Number(product?.quantityFree || 0) > 0 &&
      price >= 0 &&
      price <= spendableCoins &&
      matchesLegalityMode(product, config.legalityMode)
    );
  });

  if (!candidates.length) {
    return null;
  }

  const sectorCounts = getOwnedSectorCounts(observation);

  const ranked = candidates
    .map(product => ({
      product,
      score: scoreProduct(product, config, sectorCounts),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return String(a.product.productId).localeCompare(String(b.product.productId), undefined, {
        numeric: true,
      });
    });

  return {
    type: BOT_DECISION_TYPES.BUY_PRODUCT,
    productId: ranked[0].product.productId,
    behaviorProfile: profileId,
    policyVersion: policy.version,
  };
}

/**
 * Small deployable policy used by the website.
 *
 * context.stage is a bot lifecycle/UI stage, not an authoritative game
 * phase. This is temporary while the prototype still keeps trader choice
 * and wholesale purchase inside the same broader turn phase.
 */
export async function decideWithPolicy(observation, context = {}) {
  if (!observation) {
    return null;
  }

  if (context.stage === 'wholesale') {
    return decideProduct(observation, context.behaviorProfile);
  }

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

export function getDefaultBotBehaviorProfile() {
  return policy.defaultBehaviorProfile;
}
