import { ACTION_TYPES } from './actions';
import { PHASES } from './phases';

/**
 * Pure game-state reducer.
 *
 * It does not:
 * - call setState
 * - send PeerJS messages
 * - navigate
 * - touch window.*
 *
 * It receives state + action and returns a new state.
 */
export function gameReducer(gameState, action) {
  if (!gameState || !action?.type) {
    return gameState;
  }

  switch (action.type) {
    case ACTION_TYPES.SELECT_TRADER:
      return reduceSelectTrader(gameState, action.payload);

    default:
      return gameState;
  }
}

function reduceSelectTrader(gameState, payload = {}) {
  const { playerId, traderId } = payload;

  if (!playerId || !traderId) {
    return gameState;
  }

  /*
   * This action is only valid during trader selection.
   */
  if (gameState.phase !== PHASES.TRADER_SELECTION) {
    return gameState;
  }

  /*
   * Only the current player may select a trader.
   */
  if (gameState.currentTurnUserId !== playerId) {
    return gameState;
  }

  if (!Array.isArray(gameState.players)) {
    return gameState;
  }

  const playerIndex = gameState.players.findIndex(player => player.user_id === playerId);

  if (playerIndex === -1) {
    return gameState;
  }

  if (!Array.isArray(gameState.traderList)) {
    return gameState;
  }

  const traderIndex = gameState.traderList.findIndex(trader => trader.traderId === traderId);

  if (traderIndex === -1) {
    return gameState;
  }

  const player = gameState.players[playerIndex];

  const trader = gameState.traderList[traderIndex];

  /*
   * Trader is already owned by someone.
   */
  if (trader.taken) {
    return gameState;
  }

  /*
   * Protect against selecting the same trader twice.
   */
  if (player.traders?.some(ownedTrader => ownedTrader.traderId === traderId)) {
    return gameState;
  }

  /*
   * Preserve current prototype pricing:
   *
   * first trader  = 0
   * second trader = 15
   * third trader  = 30
   *
   * We are NOT changing game rules during this refactor.
   */
  const tradersCount = player.traders?.length || 0;

  const traderPrice = tradersCount * 15;

  if (Number(player.coins || 0) < traderPrice) {
    return gameState;
  }

  const traderForPlayer = {
    ...trader,

    taken: true,
    traderOwnerId: playerId,
    card_in_game: `${playerId}_hand`,
  };

  const updatedPlayer = {
    ...player,

    traders: [...(player.traders || []), traderForPlayer],

    tradersCount: (player.tradersCount || 0) + 1,

    coins: Number(player.coins || 0) - traderPrice,
  };

  const updatedPlayers = [...gameState.players];

  updatedPlayers[playerIndex] = updatedPlayer;

  const updatedTraderList = [...gameState.traderList];

  updatedTraderList[traderIndex] = {
    ...trader,

    taken: true,
    card_in_game: `${playerId}_hand`,
  };

  return {
    ...gameState,

    players: updatedPlayers,
    traderList: updatedTraderList,
  };
}
