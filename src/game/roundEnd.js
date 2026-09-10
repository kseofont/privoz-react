import { PHASES } from './phases';
import { syncPlayerSectorsWithTraders } from './playerDerivedState';
import { buildGameOutcome, DEFAULT_MAX_GAME_ROUNDS, isFinalGameRound } from './gameOutcome';

/**
 * Pure authoritative round settlement.
 *
 * Applies sales/returns-to-hand first. If the round being settled is the
 * configured final round, the resulting balances become the final outcome
 * and the game stops in GAME_END. Otherwise the next round begins.
 */
export function settleRound(gameState, maxRounds = DEFAULT_MAX_GAME_ROUNDS) {
  if (!gameState || !Array.isArray(gameState.players)) {
    return gameState;
  }

  const updatedPlayers = gameState.players.map(player => {
    let coinsEarned = 0;

    const updatedTraders = (player.traders || []).map(trader => {
      if (
        typeof trader.card_in_game === 'string' &&
        trader.card_in_game.startsWith('sector_') &&
        Array.isArray(trader.goods) &&
        trader.goods.length > 0
      ) {
        trader.goods.forEach(product => {
          const quantity = Number(product.quantity_player_card) || 0;
          const sellingPrice =
            Number(product.sellingPrice) ||
            Number(product.retailPrice) ||
            Number(product.profit) ||
            0;

          coinsEarned += quantity * sellingPrice;
        });

        return {
          ...trader,
          goods: [],
          card_in_game: `${player.user_id}_hand`,
          location: null,
        };
      }

      return trader;
    });

    return syncPlayerSectorsWithTraders(
      {
        ...player,
        coins: Number(player.coins || 0) + coinsEarned,
      },
      updatedTraders
    );
  });

  const settledState = {
    ...gameState,
    players: updatedPlayers,
    __roundProcessing: true,
    eventCardPhase: undefined,
    playerEventChoices: undefined,
  };

  if (isFinalGameRound(settledState, maxRounds)) {
    const finalState = {
      ...settledState,
      phase: PHASES.GAME_END,
      currentTurnUserId: null,
      waitingForHost: false,
    };

    return {
      ...finalState,
      gameOutcome: buildGameOutcome(finalState, maxRounds),
    };
  }

  return {
    ...settledState,
    round: Number(gameState.round || 1) + 1,
    phase: PHASES.TRADER_SELECTION,
  };
}
