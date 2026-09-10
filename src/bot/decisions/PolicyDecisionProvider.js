import { PHASES } from '../../game/phases';
import { MAX_TRADER_GOODS, normalizeSectorKey } from '../../game/placeTraderRules';
import policy from '../policies/policy-v005.json';

export const BOT_DECISION_TYPES = Object.freeze({
  SELECT_TRADER: 'select_trader',
  BUY_PRODUCT: 'buy_product',
  PLACE_TRADER: 'place_trader',
  END_TURN: 'end_turn',
  SUBMIT_EVENT_CHOICES: 'submit_event_choices',
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


function expandOwnedProductUnits(observation) {
  return (observation.self?.products || []).flatMap(product =>
    Array.from({ length: Math.max(0, Number(product?.quantity || 0)) }, (_, index) => ({
      ...product,
      unitIndex: index,
    }))
  );
}

function productAllowedInObservedSector(product, sector) {
  return (
    product?.legality === 'illegal' ||
    normalizeSectorKey(product?.sector) === normalizeSectorKey(sector)
  );
}

function rankPlacementGoods(goods, legalityMode) {
  return [...goods].sort((a, b) => {
    if (legalityMode === 'prefer_legal' && a.legality !== b.legality) {
      return a.legality === 'legal' ? -1 : 1;
    }

    const aValue = Number(a.profit || 0) * 10 + Number(a.sellingPrice || 0);
    const bValue = Number(b.profit || 0) * 10 + Number(b.sellingPrice || 0);

    if (bValue !== aValue) {
      return bValue - aValue;
    }

    return String(a.productId).localeCompare(String(b.productId), undefined, { numeric: true });
  });
}

function filterPlacementGoodsByProfile(goods, legalityMode) {
  if (legalityMode === 'legal_only') {
    return goods.filter(product => product.legality !== 'illegal');
  }

  if (legalityMode === 'illegal_only') {
    return goods.filter(product => product.legality === 'illegal');
  }

  return goods;
}

function scorePlacementCandidate({ sectorInfo, trader, goods, config, ownPlacedSectors }) {
  const sector = sectorInfo.sector;
  const normalizedSector = normalizeSectorKey(sector);
  const normalizedFavorite = normalizeSectorKey(trader.favoriteSector);
  const legalGoods = goods.filter(product => product.legality !== 'illegal');
  const illegalGoods = goods.filter(product => product.legality === 'illegal');
  const value = goods.reduce(
    (sum, product) => sum + Number(product.profit || 0) * 10 + Number(product.sellingPrice || 0),
    0
  );

  let score = value + goods.length * 25;

  if (normalizedFavorite && normalizedFavorite === normalizedSector) {
    score += config.sectorMode === 'favorite' ? 220 : 45;
  }

  if (config.sectorMode === 'max_goods') {
    score += goods.length * 120;
  } else if (config.sectorMode === 'focus') {
    score += legalGoods.length * 140;
  } else if (config.sectorMode === 'diversify') {
    score += ownPlacedSectors.has(normalizedSector) ? -180 : 120;
  }

  if (config.legalityMode === 'illegal_only') {
    score += illegalGoods.length * 100;
  } else if (config.legalityMode === 'legal_only') {
    score += legalGoods.length * 80;
  } else if (config.legalityMode === 'prefer_legal') {
    score += legalGoods.length * 60 - illegalGoods.length * 10;
  }

  score -= Number(sectorInfo.occupied || 0) * 2;

  return score;
}

function decidePlacement(observation, behaviorProfile) {
  if (observation.currentTurnUserId !== observation.self?.playerId) {
    return null;
  }

  const profileId = normalizeBotBehaviorProfile(behaviorProfile);
  const config =
    policy.placeTrader?.profiles?.[profileId] ||
    policy.placeTrader?.profiles?.[policy.defaultBehaviorProfile] ||
    {};
  const placementCost = Number(observation.self?.placementCost || 0);

  if (Number(observation.self?.coins || 0) < placementCost) {
    return null;
  }

  const trader = (observation.self?.traders || []).find(currentTrader => !currentTrader.location);

  if (!trader?.traderId) {
    return null;
  }

  const availableSectors = (observation.visibleSectors || []).filter(
    sectorInfo => Number(sectorInfo.occupied || 0) < Number(sectorInfo.capacity || 0)
  );

  if (!availableSectors.length) {
    return null;
  }

  const productUnits = expandOwnedProductUnits(observation);
  const ownPlacedSectors = new Set(
    (observation.self?.traders || [])
      .map(currentTrader => normalizeSectorKey(currentTrader.location))
      .filter(Boolean)
  );
  const maxGoods = Math.max(
    0,
    Math.min(MAX_TRADER_GOODS, Number(config.maxGoods ?? MAX_TRADER_GOODS))
  );

  const candidates = availableSectors.map(sectorInfo => {
    const allowed = productUnits.filter(product =>
      productAllowedInObservedSector(product, sectorInfo.sector)
    );
    const filtered = filterPlacementGoodsByProfile(allowed, config.legalityMode);
    const goods = rankPlacementGoods(filtered, config.legalityMode).slice(0, maxGoods);

    return {
      sectorInfo,
      goods,
      score: scorePlacementCandidate({
        sectorInfo,
        trader,
        goods,
        config,
        ownPlacedSectors,
      }),
    };
  });

  const candidatesWithRequiredGoods =
    config.legalityMode === 'illegal_only' || config.legalityMode === 'legal_only'
      ? candidates.filter(candidate => candidate.goods.length > 0)
      : candidates;
  const ranked = (candidatesWithRequiredGoods.length ? candidatesWithRequiredGoods : candidates)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return String(a.sectorInfo.sector).localeCompare(String(b.sectorInfo.sector));
    });
  const selected = ranked[0];

  if (!selected) {
    return null;
  }

  return {
    type: BOT_DECISION_TYPES.PLACE_TRADER,
    traderId: trader.traderId,
    sector: selected.sectorInfo.sector,
    productIds: selected.goods.map(product => product.productId),
    behaviorProfile: profileId,
    policyVersion: policy.version,
  };
}


function normalizeObservedSector(value) {
  return normalizeSectorKey(value || '');
}

function getEventProfile(behaviorProfile) {
  const profileId = normalizeBotBehaviorProfile(behaviorProfile);

  return {
    id: profileId,
    config:
      policy.eventChoice?.profiles?.[profileId] ||
      policy.eventChoice?.profiles?.[policy.defaultBehaviorProfile] ||
      {},
  };
}

function hasUsefulPositiveEventTarget(card, observation) {
  const effects = Array.isArray(card?.effect) ? card.effect : [];
  const placedWithGoods = (observation.self?.traders || []).filter(
    trader => trader?.location && Array.isArray(trader.goods) && trader.goods.length > 0
  );

  if (effects.some(effect => effect?.extra_product)) {
    return placedWithGoods.length > 0;
  }

  if (effects.some(effect => effect?.extra_price)) {
    return placedWithGoods.length > 0;
  }

  if (card?.goalItem === 'trader') {
    return (observation.self?.traders || []).some(trader => trader?.location);
  }

  return true;
}

function hasIllegalGoodsOnOwnBoard(observation) {
  return (observation.self?.traders || []).some(trader =>
    (trader.goods || []).some(good => good?.legality === 'illegal')
  );
}

function choosePositiveEventAction(card, observation, config) {
  const keepCost = Math.max(0, Number(policy.eventChoice?.keepCost || 5));
  const canKeep = Number(observation.self?.coins || 0) >= keepCost;
  const effectiveNow = hasUsefulPositiveEventTarget(card, observation);

  switch (config.positiveMode) {
    case 'use_now':
      return 'use';

    case 'keep_if_affordable':
      return canKeep ? 'keep' : 'use';

    case 'use_if_illegal_goods':
      if (hasIllegalGoodsOnOwnBoard(observation) && effectiveNow) {
        return 'use';
      }
      return canKeep ? 'keep' : 'use';

    case 'use_if_effective':
    default:
      if (effectiveNow) {
        return 'use';
      }
      return canKeep ? 'keep' : 'use';
  }
}

function buildOpponentSectorStats(observation) {
  const stats = new Map();

  (observation.visibleOpponents || []).forEach(opponent => {
    (opponent.traders || []).forEach(trader => {
      if (!trader?.location) {
        return;
      }

      const sector = trader.location;
      const sectorKey = normalizeObservedSector(sector);
      const current = stats.get(sectorKey) || {
        sector,
        traderCount: 0,
        unprotectedTraders: 0,
        goodsCount: 0,
        illegalGoods: 0,
        mismatchedGoods: 0,
        goodsValue: 0,
      };

      current.traderCount += 1;
      if (!trader.protectedFromIllegalInspection) {
        current.unprotectedTraders += 1;
      }

      (trader.goods || []).forEach(good => {
        const quantity = Math.max(1, Number(good?.quantity || 1));
        current.goodsCount += quantity;
        current.goodsValue += Number(good?.sellingPrice || good?.profit || 0) * quantity;

        if (good?.legality === 'illegal') {
          current.illegalGoods += quantity;
        }

        if (
          good?.sector &&
          normalizeObservedSector(good.sector) !== normalizeObservedSector(trader.location)
        ) {
          current.mismatchedGoods += quantity;
        }
      });

      stats.set(sectorKey, current);
    });
  });

  return [...stats.values()];
}

function scoreNegativeSectorTarget(stat, observation, mode) {
  const ownSectors = new Set(
    (observation.self?.traders || [])
      .flatMap(trader => [trader.location, trader.favoriteSector])
      .filter(Boolean)
      .map(normalizeObservedSector)
  );

  const inOwnCompetition = ownSectors.has(normalizeObservedSector(stat.sector));

  switch (mode) {
    case 'max_damage':
      return stat.unprotectedTraders * 140 + stat.goodsCount * 45 + stat.goodsValue;

    case 'own_sector_competition':
      return (
        (inOwnCompetition ? 260 : 0) +
        stat.unprotectedTraders * 70 +
        stat.goodsCount * 20 +
        stat.illegalGoods * 30
      );

    case 'crowded_sector':
      return stat.traderCount * 140 + stat.goodsCount * 25 + stat.unprotectedTraders * 20;

    case 'illegal_competition':
      return (
        stat.illegalGoods * 240 +
        stat.mismatchedGoods * 180 +
        stat.unprotectedTraders * 35 +
        stat.goodsCount * 10
      );

    case 'illegal_exposure':
    default:
      return (
        stat.illegalGoods * 220 +
        stat.mismatchedGoods * 160 +
        stat.unprotectedTraders * 40 +
        stat.goodsCount * 12
      );
  }
}

function chooseNegativeSectorTarget(observation, mode) {
  const candidates = buildOpponentSectorStats(observation)
    .map(stat => ({
      ...stat,
      score: scoreNegativeSectorTarget(stat, observation, mode),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return String(a.sector).localeCompare(String(b.sector));
    });

  return candidates[0]?.sector || null;
}

function choosePositiveTraderTarget(observation) {
  const traders = (observation.self?.traders || [])
    .filter(trader => trader?.traderId && trader?.location)
    .sort((a, b) => {
      if ((b.goods?.length || 0) !== (a.goods?.length || 0)) {
        return (b.goods?.length || 0) - (a.goods?.length || 0);
      }
      return String(a.traderId).localeCompare(String(b.traderId));
    });

  return traders[0]?.traderId || null;
}

function decideEventChoices(observation, behaviorProfile) {
  if (
    observation.phase !== PHASES.PERSONAL_EVENTS ||
    observation.self?.eventChoicePending !== true
  ) {
    return null;
  }

  const { id: profileId, config } = getEventProfile(behaviorProfile);
  const positiveChoices = {};
  const effectTargets = {};

  (observation.self?.eventCards || []).forEach(card => {
    if (!card?.cardId) {
      return;
    }

    if (card.fortune === 'positive') {
      const choice = choosePositiveEventAction(card, observation, config);
      positiveChoices[card.cardId] = choice;

      if (choice === 'use' && card.goalAction === 'trader') {
        const traderId = choosePositiveTraderTarget(observation);
        if (traderId) {
          effectTargets[card.cardId] = { traderId };
        }
      }

      return;
    }

    if (card.fortune === 'negative' && card.goalAction === 'sector') {
      const sector = chooseNegativeSectorTarget(
        observation,
        config.negativeTargetMode || 'illegal_exposure'
      );

      if (sector) {
        effectTargets[card.cardId] = { sector };
      }
    }
  });

  return {
    type: BOT_DECISION_TYPES.SUBMIT_EVENT_CHOICES,
    positiveChoices,
    effectTargets,
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

  if (context.stage === 'personal_events') {
    return decideEventChoices(observation, context.behaviorProfile);
  }

  if (context.stage === 'wholesale') {
    return decideProduct(observation, context.behaviorProfile);
  }

  if (context.stage === 'placement') {
    return decidePlacement(observation, context.behaviorProfile);
  }

  if (context.stage === 'end_turn') {
    if (
      observation.currentTurnUserId !== observation.self?.playerId ||
      policy.endTurn?.strategy !== 'after_turn_work_complete'
    ) {
      return null;
    }

    return {
      type: BOT_DECISION_TYPES.END_TURN,
      policyVersion: policy.version,
    };
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
