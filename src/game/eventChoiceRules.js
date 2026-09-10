import { PHASES } from './phases';

export const EVENT_KEEP_COST = 5;

function getCardKey(card, index) {
  return card?.id ?? String(index);
}

function sameSector(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function getPlacedTraders(player) {
  return (player?.traders || []).filter(trader => trader?.traderId && trader?.location);
}

export function getValidEventTargets(gameState, playerId, card) {
  const players = Array.isArray(gameState?.players) ? gameState.players : [];
  const player = players.find(currentPlayer => currentPlayer.user_id === playerId);

  if (!player || !card) {
    return {
      playerIds: [],
      sectors: [],
      traderIds: [],
    };
  }

  const isNegative = card.fortune === 'negative';
  const targetPlayers = isNegative
    ? players.filter(currentPlayer => currentPlayer.user_id !== playerId)
    : [player];

  const targetTraders = targetPlayers.flatMap(getPlacedTraders);

  return {
    playerIds: targetPlayers.map(currentPlayer => currentPlayer.user_id),
    sectors: [...new Set(targetTraders.map(trader => trader.location).filter(Boolean))],
    traderIds: targetTraders.map(trader => trader.traderId),
  };
}

function sanitizeTarget(gameState, playerId, card, rawTarget) {
  const target = rawTarget && typeof rawTarget === 'object' ? rawTarget : {};
  const valid = getValidEventTargets(gameState, playerId, card);
  const next = {};

  if (card.goal_action === 'sector') {
    const requestedSector = typeof target.sector === 'string' ? target.sector.trim() : '';
    const validSector = valid.sectors.find(sector => sameSector(sector, requestedSector));

    if (validSector) {
      next.sector = validSector;
    }
  }

  if (card.goal_action === 'trader') {
    if (target.traderId && valid.traderIds.includes(target.traderId)) {
      next.traderId = target.traderId;
    }
  }

  if (card.goal_action === 'player') {
    if (target.playerId && valid.playerIds.includes(target.playerId)) {
      next.playerId = target.playerId;
    }
  }

  return next;
}

/**
 * Validate and normalize one player's personal-event submission.
 *
 * The host controls playerId separately via prepareAuthoritativeGameAction().
 * This helper only accepts choices for cards actually owned by that player and
 * limits targets to legal visible board targets.
 */
export function validateAndNormalizeEventChoice(gameState, payload = {}) {
  const playerId = payload.playerId;

  if (
    !gameState ||
    !playerId ||
    gameState.phase !== PHASES.PERSONAL_EVENTS ||
    !Array.isArray(gameState.players) ||
    !gameState.eventCardPhase ||
    gameState.eventCardPhase[playerId] !== false
  ) {
    return { ok: false };
  }

  const player = gameState.players.find(currentPlayer => currentPlayer.user_id === playerId);

  if (!player) {
    return { ok: false };
  }

  const cards = Array.isArray(player.eventCards) ? player.eventCards : [];
  const rawPositiveChoices =
    payload.positiveChoices && typeof payload.positiveChoices === 'object'
      ? payload.positiveChoices
      : {};
  const rawEffectTargets =
    payload.effectTargets && typeof payload.effectTargets === 'object'
      ? payload.effectTargets
      : {};

  const positiveChoices = {};
  const effectTargets = {};
  let remainingCoins = Math.max(0, Number(player.coins || 0));

  cards.forEach((card, index) => {
    const key = getCardKey(card, index);

    if (card?.fortune === 'positive') {
      const requestedChoice = rawPositiveChoices[key];
      let choice = requestedChoice === 'keep' || requestedChoice === 'use' ? requestedChoice : null;

      if (!choice) {
        choice = remainingCoins >= EVENT_KEEP_COST ? 'keep' : 'use';
      }

      if (choice === 'keep' && remainingCoins < EVENT_KEEP_COST) {
        choice = 'use';
      }

      positiveChoices[key] = choice;

      if (choice === 'keep') {
        remainingCoins -= EVENT_KEEP_COST;
      }

      if (choice === 'use') {
        const target = sanitizeTarget(gameState, playerId, card, rawEffectTargets[key]);

        if (Object.keys(target).length > 0) {
          effectTargets[key] = target;
        }
      }

      return;
    }

    if (card?.fortune === 'negative') {
      const target = sanitizeTarget(gameState, playerId, card, rawEffectTargets[key]);

      if (Object.keys(target).length > 0) {
        effectTargets[key] = target;
      }
    }
  });

  return {
    ok: true,
    player,
    positiveChoices,
    effectTargets,
  };
}
