/**
 * Build the information boundary used by bot decision logic.
 *
 * IMPORTANT:
 * Do not pass raw authoritative gameState into a decision provider.
 * This function should expose only information that the represented
 * player is allowed to know.
 *
 * The first vertical slice intentionally exposes only the data needed
 * for SELECT_TRADER. Expand this whitelist action-by-action.
 */
export function buildPlayerObservation(gameState, playerId) {
  if (!gameState || !playerId || !Array.isArray(gameState.players)) {
    return null;
  }

  const player = gameState.players.find(currentPlayer => currentPlayer.user_id === playerId);

  if (!player) {
    return null;
  }

  const traderList = Array.isArray(gameState.traderList) ? gameState.traderList : [];

  return {
    schemaVersion: 1,
    phase: gameState.phase || null,
    round: Number(gameState.round || 0),
    currentTurnUserId: gameState.currentTurnUserId || null,

    self: {
      playerId,
      isBot: player.isBot === true,
      coins: Number(player.coins || 0),
      traderIds: Array.isArray(player.traders)
        ? player.traders.map(trader => trader?.traderId).filter(Boolean)
        : [],
      tradersCount: Array.isArray(player.traders)
        ? player.traders.length
        : Number(player.tradersCount || 0),
    },

    visibleTraders: traderList.map(trader => ({
      traderId: trader?.traderId || null,
      taken: trader?.taken === true,
    })),
  };
}
