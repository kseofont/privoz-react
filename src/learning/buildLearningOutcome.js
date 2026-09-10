import { getAppVersionInfo } from '../feedback/appVersion';

function sanitizeText(value, fallback = null) {
  return typeof value === 'string' && value ? value.slice(0, 80) : fallback;
}

/**
 * Convert authoritative GAME_END state into a privacy-safe final learning record.
 */
export function buildLearningOutcome(gameState, appVersion = getAppVersionInfo()) {
  const outcome = gameState?.gameOutcome;

  if (!gameState?.gameId || !outcome || gameState?.phase !== 'game_end') {
    return null;
  }

  const ranking = Array.isArray(outcome.ranking)
    ? outcome.ranking.map(entry => ({
        actorIndex: Number(entry.actorIndex),
        actorType: entry.actorType === 'bot' ? 'bot' : 'human',
        coins: Number(entry.coins || 0),
        place: Number(entry.place || 0),
        isWinner: entry.isWinner === true,
        policyVersion:
          entry.actorType === 'bot' ? sanitizeText(entry.policyVersion, 'unknown') : null,
        behaviorProfile:
          entry.actorType === 'bot' ? sanitizeText(entry.behaviorProfile, 'balanced') : null,
      }))
    : [];

  const players = Array.isArray(gameState.players) ? gameState.players : [];

  return {
    schemaVersion: 1,
    recordType: 'outcome',
    gameId: gameState.gameId,
    eventId: `LE-OUTCOME-${Number(outcome.completedRound || gameState.round || 0)}`,
    gameVersion: appVersion?.version || 'dev',
    gitCommit: appVersion?.gitCommit || 'unknown',
    playerCounts: {
      total: players.length,
      human: players.filter(player => player?.isBot !== true).length,
      bot: players.filter(player => player?.isBot === true).length,
    },
    outcome: {
      schemaVersion: 1,
      rule: outcome.rule === 'highest_coins' ? 'highest_coins' : 'highest_coins',
      completedRound: Number(outcome.completedRound || gameState.round || 0),
      maxRounds: Number(outcome.maxRounds || 0),
      maxCoins: Number(outcome.maxCoins || 0),
      winnerActorIndexes: Array.isArray(outcome.winnerActorIndexes)
        ? outcome.winnerActorIndexes.map(Number).filter(Number.isInteger)
        : [],
      ranking,
    },
  };
}
