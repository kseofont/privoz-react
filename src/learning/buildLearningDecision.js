import { ACTION_TYPES } from '../game/actions';
import { buildPlayerObservation } from '../bot/observation/buildPlayerObservation';
import { MAX_PLAYER_TRADERS, MAX_TRADER_GOODS, normalizeSectorKey } from '../game/placeTraderRules';
import { EVENT_KEEP_COST, getValidEventTargets } from '../game/eventChoiceRules';

function sanitizeIdPart(value) {
  const normalized = value === null || value === undefined || value === '' ? 'unknown' : value;

  return String(normalized)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 48);
}

function getLegalSelectTraderActions(observation) {
  if (!observation || observation.currentTurnUserId !== observation.self?.playerId) {
    return [];
  }

  const tradersCount = Number(observation.self?.tradersCount || 0);

  if (tradersCount >= MAX_PLAYER_TRADERS) {
    return [];
  }

  const price = tradersCount * 15;

  if (Number(observation.self?.coins || 0) < price) {
    return [];
  }

  const ownedTraderIds = new Set(observation.self?.traderIds || []);

  return (observation.visibleTraders || [])
    .filter(trader => trader?.traderId && !trader.taken && !ownedTraderIds.has(trader.traderId))
    .map(trader => ({
      type: ACTION_TYPES.SELECT_TRADER,
      traderId: trader.traderId,
    }));
}

function getLegalBuyProductActions(observation) {
  if (!observation || observation.currentTurnUserId !== observation.self?.playerId) {
    return [];
  }

  const coins = Number(observation.self?.coins || 0);

  return (observation.visibleProducts || [])
    .filter(product => {
      const price = Number(product?.wholesalePrice || 0);

      return (
        product?.productId !== null &&
        product?.productId !== undefined &&
        Number(product?.quantityFree || 0) > 0 &&
        price >= 0 &&
        price <= coins
      );
    })
    .map(product => ({
      type: ACTION_TYPES.BUY_PRODUCT,
      productId: product.productId,
    }));
}


function getLegalPlaceTraderActions(observation) {
  if (!observation || observation.currentTurnUserId !== observation.self?.playerId) {
    return [];
  }

  const unplacedTraders = (observation.self?.traders || []).filter(trader => !trader.location);

  if (!unplacedTraders.length) {
    return [];
  }

  return unplacedTraders.flatMap(trader =>
    (observation.visibleSectors || [])
      .filter(sectorInfo => Number(sectorInfo.occupied || 0) < Number(sectorInfo.capacity || 0))
      .map(sectorInfo => {
        const eligibleProducts = (observation.self?.products || [])
          .filter(product => {
            if (Number(product?.quantity || 0) <= 0) {
              return false;
            }

            return (
              product.legality === 'illegal' ||
              normalizeSectorKey(product.sector) === normalizeSectorKey(sectorInfo.sector)
            );
          })
          .map(product => ({
            productId: product.productId,
            quantity: Number(product.quantity || 0),
          }));

        return {
          type: ACTION_TYPES.PLACE_TRADER,
          traderId: trader.traderId,
          sector: sectorInfo.sector,
          maxProducts: MAX_TRADER_GOODS,
          eligibleProducts,
        };
      })
  );
}


function getLegalEventChoiceActions(beforeState, actorId, observation) {
  if (
    !observation ||
    observation.phase !== 'personal_events' ||
    observation.self?.eventChoicePending !== true
  ) {
    return [];
  }

  const cards = (observation.self?.eventCards || []).map(card => {
    const sourceCard = beforeState.players
      ?.find(player => player.user_id === actorId)
      ?.eventCards?.find(currentCard => currentCard.id === card.cardId);
    const validTargets = getValidEventTargets(beforeState, actorId, sourceCard);

    return {
      cardId: card.cardId,
      fortune: card.fortune,
      choices:
        card.fortune === 'positive'
          ? Number(observation.self?.coins || 0) >= EVENT_KEEP_COST
            ? ['use', 'keep']
            : ['use']
          : ['use'],
      targets: {
        sectors: validTargets.sectors,
        traderIds: validTargets.traderIds,
        playerActorIndexes: validTargets.playerIds
          .map(playerId => beforeState.players.findIndex(player => player.user_id === playerId))
          .filter(index => index >= 0),
      },
    };
  });

  return [
    {
      type: ACTION_TYPES.SUBMIT_EVENT_CHOICES,
      cards,
    },
  ];
}

function sanitizeLearningEffectTargets(beforeState, effectTargets = {}) {
  const next = {};

  Object.entries(effectTargets || {}).forEach(([cardId, target]) => {
    if (!target || typeof target !== 'object') {
      return;
    }

    const compactTarget = {};

    if (typeof target.sector === 'string' && target.sector) {
      compactTarget.sector = target.sector;
    }

    if (target.traderId) {
      compactTarget.traderId = target.traderId;
    }

    if (target.playerId) {
      const actorIndex =
        beforeState.players?.findIndex(player => player.user_id === target.playerId) ?? -1;

      if (actorIndex >= 0) {
        compactTarget.actorIndex = actorIndex;
      }
    }

    if (Object.keys(compactTarget).length > 0) {
      next[cardId] = compactTarget;
    }
  });

  return next;
}

function buildCompactObservation(observation, actionType) {
  const compact = {
    phase: observation.phase,
    round: observation.round,
    self: {
      coins: observation.self.coins,
      traderIds: observation.self.traderIds,
      tradersCount: observation.self.tradersCount,
    },
  };

  if (actionType === ACTION_TYPES.SELECT_TRADER) {
    return {
      ...compact,
      visibleTraders: observation.visibleTraders,
    };
  }

  if (actionType === ACTION_TYPES.BUY_PRODUCT) {
    return {
      ...compact,
      self: {
        ...compact.self,
        products: observation.self.products,
      },
      visibleProducts: observation.visibleProducts,
    };
  }

  if (actionType === ACTION_TYPES.PLACE_TRADER) {
    return {
      ...compact,
      self: {
        ...compact.self,
        traders: observation.self.traders,
        products: observation.self.products,
      },
      visibleSectors: observation.visibleSectors,
    };
  }

  if (actionType === ACTION_TYPES.SUBMIT_EVENT_CHOICES) {
    return {
      ...compact,
      self: {
        ...compact.self,
        traders: observation.self.traders,
        eventCards: observation.self.eventCards,
      },
      visibleOpponents: observation.visibleOpponents,
    };
  }

  return compact;
}

function buildSelectTraderEventId({ beforeState, actorIndex, observation, action }) {
  return [
    'LE',
    'TRADER',
    sanitizeIdPart(beforeState.round || 0),
    sanitizeIdPart(actorIndex),
    sanitizeIdPart(observation.self.tradersCount),
    sanitizeIdPart(action.payload?.traderId),
  ].join('-');
}

function buildBuyProductEventId({ beforeState, actorIndex, observation, action }) {
  const productId = action.payload?.productId;
  const ownedQuantity =
    observation.self?.products?.find(product => product.productId === productId)?.quantity || 0;

  return [
    'LE',
    'BUY',
    sanitizeIdPart(beforeState.round || 0),
    sanitizeIdPart(actorIndex),
    sanitizeIdPart(productId),
    sanitizeIdPart(ownedQuantity),
    sanitizeIdPart(observation.self.coins),
  ].join('-');
}


function buildPlaceTraderEventId({ beforeState, actorIndex, observation, action }) {
  const productKey = (action.payload?.productIds || []).map(sanitizeIdPart).join('_') || 'none';

  return [
    'LE',
    'PLACE',
    sanitizeIdPart(beforeState.round || 0),
    sanitizeIdPart(actorIndex),
    sanitizeIdPart(action.payload?.traderId),
    sanitizeIdPart(action.payload?.sector),
    sanitizeIdPart(productKey),
    sanitizeIdPart(observation.self?.traders?.filter(trader => trader.location).length || 0),
  ].join('-');
}


function buildEventChoiceEventId({ beforeState, actorIndex }) {
  return [
    'LE',
    'EVENT',
    sanitizeIdPart(beforeState.round || 0),
    sanitizeIdPart(actorIndex),
  ].join('-');
}

/**
 * Build a privacy-minimized learning sample for an accepted action.
 *
 * No player name, PeerJS ID, IP, browser fingerprint or full gameState
 * is included.
 */
export function buildLearningDecision({ beforeState, afterState, action, actorId, appVersion }) {
  if (!beforeState?.gameId || !action || !actorId || beforeState === afterState) {
    return null;
  }

  if (
    action.type !== ACTION_TYPES.SELECT_TRADER &&
    action.type !== ACTION_TYPES.BUY_PRODUCT &&
    action.type !== ACTION_TYPES.PLACE_TRADER &&
    action.type !== ACTION_TYPES.SUBMIT_EVENT_CHOICES
  ) {
    return null;
  }

  const actorIndex = beforeState.players?.findIndex(player => player.user_id === actorId) ?? -1;

  if (actorIndex < 0) {
    return null;
  }

  const actor = beforeState.players[actorIndex];
  const observation = buildPlayerObservation(beforeState, actorId);

  if (!observation) {
    return null;
  }

  let eventId = null;
  let legalActions = [];
  let selectedAction = null;

  if (action.type === ACTION_TYPES.SELECT_TRADER) {
    const traderId = action.payload?.traderId;

    if (!traderId) {
      return null;
    }

    eventId = buildSelectTraderEventId({ beforeState, actorIndex, observation, action });
    legalActions = getLegalSelectTraderActions(observation);
    selectedAction = {
      type: ACTION_TYPES.SELECT_TRADER,
      traderId,
    };
  }

  if (action.type === ACTION_TYPES.BUY_PRODUCT) {
    const productId = action.payload?.productId;

    if (productId === null || productId === undefined) {
      return null;
    }

    eventId = buildBuyProductEventId({ beforeState, actorIndex, observation, action });
    legalActions = getLegalBuyProductActions(observation);
    selectedAction = {
      type: ACTION_TYPES.BUY_PRODUCT,
      productId,
    };
  }

  if (action.type === ACTION_TYPES.PLACE_TRADER) {
    const traderId = action.payload?.traderId;
    const sector = action.payload?.sector;
    const productIds = Array.isArray(action.payload?.productIds) ? action.payload.productIds : [];

    if (!traderId || !sector) {
      return null;
    }

    eventId = buildPlaceTraderEventId({ beforeState, actorIndex, observation, action });
    legalActions = getLegalPlaceTraderActions(observation);
    selectedAction = {
      type: ACTION_TYPES.PLACE_TRADER,
      traderId,
      sector,
      productIds,
    };
  }

  if (action.type === ACTION_TYPES.SUBMIT_EVENT_CHOICES) {
    eventId = buildEventChoiceEventId({ beforeState, actorIndex });
    legalActions = getLegalEventChoiceActions(beforeState, actorId, observation);
    selectedAction = {
      type: ACTION_TYPES.SUBMIT_EVENT_CHOICES,
      positiveChoices: action.payload?.positiveChoices || {},
      effectTargets: sanitizeLearningEffectTargets(beforeState, action.payload?.effectTargets || {}),
    };
  }

  const players = Array.isArray(beforeState.players) ? beforeState.players : [];

  return {
    schemaVersion: 4,
    gameId: beforeState.gameId,
    eventId,
    gameVersion: appVersion?.version || 'dev',
    gitCommit: appVersion?.gitCommit || 'unknown',
    phase: beforeState.phase || null,
    round: Number(beforeState.round || 0),
    actorIndex,
    actorType: actor?.isBot === true ? 'bot' : 'human',
    policyVersion: actor?.isBot === true ? actor.botPolicyVersion || 'unknown' : null,
    behaviorProfile: actor?.isBot === true ? actor.botBehaviorProfile || 'balanced' : null,
    playerCounts: {
      total: players.length,
      human: players.filter(player => player?.isBot !== true).length,
      bot: players.filter(player => player?.isBot === true).length,
    },
    observation: buildCompactObservation(observation, action.type),
    legalActions,
    selectedAction,
    result: 'accepted',
  };
}
