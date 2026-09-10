import { PHASES } from '../../game/phases';
import {
  MAX_PLAYER_TRADERS,
  MAX_TRADER_GOODS,
  normalizeSectorKey,
} from '../../game/placeTraderRules';
import policy from '../policies/policy-v008.json';

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

  const tradersCount = Number(observation.self?.tradersCount || 0);

  if (tradersCount >= MAX_PLAYER_TRADERS) {
    return [];
  }

  const traderPrice = tradersCount * 15;

  /*
   * Hiring is the only trader-related coin cost. Placing an already-owned
   * trader on the market is free.
   */
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
  const unplacedTraders = (observation.self?.traders || []).filter(
    currentTrader => currentTrader?.traderId && !currentTrader.location
  );

  if (!unplacedTraders.length) {
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

  const candidates = unplacedTraders.flatMap(trader =>
    availableSectors.map(sectorInfo => {
      const allowed = productUnits.filter(product =>
        productAllowedInObservedSector(product, sectorInfo.sector)
      );
      const filtered = filterPlacementGoodsByProfile(allowed, config.legalityMode);
      const goods = rankPlacementGoods(filtered, config.legalityMode).slice(0, maxGoods);

      return {
        trader,
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
    })
  );

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
    traderId: selected.trader.traderId,
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

function getEffectNumber(effect, key, fallback = 0) {
  const raw = effect?.[key];

  if (Array.isArray(raw)) {
    return Number(raw[0] ?? fallback) || fallback;
  }

  return Number(raw ?? fallback) || fallback;
}

function getEventEffectProfile(card) {
  const effects = Array.isArray(card?.effect) ? card.effect : [];
  const priceFineEffect = effects.find(effect => effect?.price_fine !== undefined);
  const fineEffect = effects.find(effect => effect?.fine !== undefined);
  const extraPriceProduct = effects.find(
    effect => effect?.effect_goal === 'product' && effect?.extra_price !== undefined
  );
  const extraPriceTraders = effects.find(
    effect => effect?.effect_goal === 'trader' && effect?.extra_price !== undefined
  );

  return {
    confiscation: effects.some(effect => effect?.confiscation === true),
    fineEach: getEffectNumber(fineEffect, 'fine', 0),
    priceFine: getEffectNumber(priceFineEffect, 'price_fine', 0),
    extraProduct: effects.some(effect => effect?.extra_product !== undefined),
    extraPriceProduct: getEffectNumber(extraPriceProduct, 'extra_price', 0),
    extraPriceTraders: getEffectNumber(extraPriceTraders, 'extra_price', 0),
    protection: effects.some(
      effect => effect?.Illigal_protection === true || effect?.illegal_protection === true
    ),
    traderAction: effects.find(effect => effect?.trader_action)?.trader_action || null,
  };
}

function hasUsefulPositiveEventTarget(card, observation) {
  const effectProfile = getEventEffectProfile(card);
  const placed = (observation.self?.traders || []).filter(trader => trader?.location);
  const placedWithGoods = placed.filter(
    trader => Array.isArray(trader.goods) && trader.goods.length > 0
  );

  if (effectProfile.protection) {
    return placed.some(
      trader =>
        !trader.protectedFromIllegalInspection ||
        (effectProfile.traderAction && trader.traderAction !== effectProfile.traderAction)
    );
  }

  if (
    effectProfile.extraProduct ||
    effectProfile.extraPriceProduct > 0 ||
    effectProfile.extraPriceTraders > 0
  ) {
    return placedWithGoods.length > 0;
  }

  if (card?.goalItem === 'trader') {
    return placed.length > 0;
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
  const effectProfile = getEventEffectProfile(card);

  switch (config.positiveMode) {
    case 'use_now':
      return 'use';

    case 'keep_if_affordable':
      return canKeep ? 'keep' : 'use';

    case 'use_if_illegal_goods':
      // Smuggler treats protection specially, but should not hoard unrelated
      // economic cards simply because no illegal goods happen to be on board.
      if (effectProfile.protection) {
        if (hasIllegalGoodsOnOwnBoard(observation) && effectiveNow) {
          return 'use';
        }
        return canKeep ? 'keep' : 'use';
      }

      if (effectiveNow) {
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

  // Negative sector cards hit the first opponent (player order) who has a
  // trader in the selected sector. Mirror that exact rule here instead of
  // aggregating later opponents that the authoritative engine would not hit.
  (observation.visibleOpponents || []).forEach(opponent => {
    (opponent.traders || []).forEach(trader => {
      if (!trader?.location) {
        return;
      }

      const sector = trader.location;
      const sectorKey = normalizeObservedSector(sector);
      const existing = stats.get(sectorKey);

      if (existing && existing.victimActorIndex !== opponent.actorIndex) {
        return;
      }

      const current = existing || {
        sector,
        victimActorIndex: opponent.actorIndex,
        victimCoins: Number(opponent.coins || 0),
        traderCount: 0,
        unprotectedTraders: 0,
        protectedTraders: 0,
        goodsCount: 0,
        goodsValue: 0,
        unprotectedGoodsCount: 0,
        unprotectedGoodsValue: 0,
        illegalGoods: 0,
        mismatchedGoods: 0,
      };

      current.traderCount += 1;
      const protectedTrader = trader.protectedFromIllegalInspection === true;

      if (protectedTrader) {
        current.protectedTraders += 1;
      } else {
        current.unprotectedTraders += 1;
      }

      (trader.goods || []).forEach(good => {
        const quantity = Math.max(1, Number(good?.quantity || 1));
        const value = Number(good?.sellingPrice || good?.profit || 0) * quantity;

        current.goodsCount += quantity;
        current.goodsValue += value;

        if (!protectedTrader) {
          current.unprotectedGoodsCount += quantity;
          current.unprotectedGoodsValue += value;
        }

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

function scoreProfileSectorPreference(stat, observation, mode) {
  const ownSectors = new Set(
    (observation.self?.traders || [])
      .flatMap(trader => [trader.location, trader.favoriteSector])
      .filter(Boolean)
      .map(normalizeObservedSector)
  );

  const inOwnCompetition = ownSectors.has(normalizeObservedSector(stat.sector));

  switch (mode) {
    case 'max_damage':
      return stat.unprotectedGoodsValue * 6 + stat.unprotectedGoodsCount * 50;

    case 'own_sector_competition':
      return (
        (inOwnCompetition ? 1800 : 0) +
        stat.unprotectedTraders * 100 +
        stat.unprotectedGoodsCount * 35
      );

    case 'crowded_sector':
      return stat.traderCount * 350 + stat.unprotectedGoodsCount * 45;

    case 'illegal_competition':
      return stat.illegalGoods * 700 + stat.mismatchedGoods * 500 + stat.unprotectedTraders * 80;

    case 'illegal_exposure':
    default:
      return stat.illegalGoods * 650 + stat.mismatchedGoods * 450 + stat.unprotectedTraders * 90;
  }
}

function scoreNegativeSectorTarget(stat, observation, mode, card) {
  const effectProfile = getEventEffectProfile(card);
  let score = 0;

  if (effectProfile.priceFine > 0) {
    // Price penalties are strongest where the actual first victim has the most
    // unprotected goods. Protected traders are skipped by the rules engine.
    score += stat.unprotectedGoodsCount * effectProfile.priceFine * 10000;
    score += stat.unprotectedGoodsValue * 20;
  }

  if (effectProfile.confiscation) {
    // Confiscation destroys current sale value and sends unprotected traders
    // back to hand, so goods value is the primary damage signal.
    score += stat.unprotectedGoodsValue * 1000;
    score += stat.unprotectedGoodsCount * 500;
    score += stat.unprotectedTraders * 250;
  }

  if (effectProfile.fineEach > 0) {
    score += stat.unprotectedTraders * effectProfile.fineEach * 1000;
  }

  if (!effectProfile.confiscation && !effectProfile.priceFine && !effectProfile.fineEach) {
    score += stat.unprotectedGoodsValue * 100 + stat.unprotectedTraders * 1000;
  }

  return score + scoreProfileSectorPreference(stat, observation, mode);
}

function chooseNegativeSectorTarget(observation, mode, card) {
  const candidates = buildOpponentSectorStats(observation)
    .filter(stat => stat.unprotectedTraders > 0 || stat.unprotectedGoodsCount > 0)
    .map(stat => ({
      ...stat,
      score: scoreNegativeSectorTarget(stat, observation, mode, card),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (a.victimActorIndex !== b.victimActorIndex) {
        return a.victimActorIndex - b.victimActorIndex;
      }

      return String(a.sector).localeCompare(String(b.sector));
    });

  return candidates[0]?.sector || null;
}

function scorePositiveTraderTarget(trader, card) {
  const effectProfile = getEventEffectProfile(card);
  const goods = Array.isArray(trader?.goods) ? trader.goods : [];
  const goodsUnits = goods.reduce(
    (sum, good) => sum + Math.max(1, Number(good?.quantity || 1)),
    0
  );
  const goodsValue = goods.reduce(
    (sum, good) =>
      sum +
      Number(good?.sellingPrice || good?.profit || 0) *
        Math.max(1, Number(good?.quantity || 1)),
    0
  );
  const illegalUnits = goods.reduce(
    (sum, good) =>
      sum +
      (good?.legality === 'illegal' ? Math.max(1, Number(good?.quantity || 1)) : 0),
    0
  );
  const mismatchedUnits = goods.reduce((sum, good) => {
    if (
      good?.sector &&
      trader?.location &&
      normalizeObservedSector(good.sector) !== normalizeObservedSector(trader.location)
    ) {
      return sum + Math.max(1, Number(good?.quantity || 1));
    }
    return sum;
  }, 0);

  if (effectProfile.protection) {
    return (
      (trader.protectedFromIllegalInspection ? -100000 : 0) +
      illegalUnits * 12000 +
      mismatchedUnits * 8000 +
      goodsValue * 20 +
      goodsUnits * 100
    );
  }

  if (effectProfile.extraPriceProduct > 0) {
    return goodsUnits * effectProfile.extraPriceProduct * 10000 + goodsValue * 10;
  }

  if (effectProfile.extraPriceTraders > 0 || effectProfile.extraProduct) {
    return goodsUnits * 1000 + goodsValue * 10;
  }

  return goodsUnits * 100 + goodsValue;
}

function choosePositiveTraderTarget(observation, card) {
  const traders = (observation.self?.traders || [])
    .filter(trader => trader?.traderId && trader?.location)
    .map(trader => ({
      trader,
      score: scorePositiveTraderTarget(trader, card),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return String(a.trader.traderId).localeCompare(String(b.trader.traderId));
    });

  return traders[0]?.trader?.traderId || null;
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
        const traderId = choosePositiveTraderTarget(observation, card);
        if (traderId) {
          effectTargets[card.cardId] = { traderId };
        }
      }

      return;
    }

    if (card.fortune === 'negative' && card.goalAction === 'sector') {
      const sector = chooseNegativeSectorTarget(
        observation,
        config.negativeTargetMode || 'illegal_exposure',
        card
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
