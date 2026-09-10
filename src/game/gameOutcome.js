export const DEFAULT_MAX_GAME_ROUNDS = 14;

function toCoins(value) {
  const coins = Number(value);
  return Number.isFinite(coins) ? coins : 0;
}

/**
 * Build a privacy-safe final result from authoritative players.
 *
 * Ties are intentionally preserved: if several players share the highest
 * balance they are all winners. No tie-break rule is invented here.
 */
export function buildGameOutcome(gameState, maxRounds = DEFAULT_MAX_GAME_ROUNDS) {
  const players = Array.isArray(gameState?.players) ? gameState.players : [];
  const completedRound = Number(gameState?.round || 0);

  if (!players.length || completedRound < Number(maxRounds || DEFAULT_MAX_GAME_ROUNDS)) {
    return null;
  }

  const ranked = players
    .map((player, actorIndex) => ({
      actorIndex,
      actorType: player?.isBot === true ? 'bot' : 'human',
      coins: toCoins(player?.coins),
      policyVersion: player?.isBot === true ? player?.botPolicyVersion || 'unknown' : null,
      behaviorProfile: player?.isBot === true ? player?.botBehaviorProfile || 'balanced' : null,
    }))
    .sort((a, b) => {
      const coinsDiff = b.coins - a.coins;
      return coinsDiff !== 0 ? coinsDiff : a.actorIndex - b.actorIndex;
    });

  let previousCoins = null;
  let previousPlace = 0;

  const ranking = ranked.map((entry, index) => {
    const place = previousCoins !== null && entry.coins === previousCoins ? previousPlace : index + 1;
    previousCoins = entry.coins;
    previousPlace = place;

    return {
      ...entry,
      place,
    };
  });

  const maxCoins = ranking.length ? ranking[0].coins : 0;
  const winnerActorIndexes = ranking
    .filter(entry => entry.coins === maxCoins)
    .map(entry => entry.actorIndex);

  return {
    schemaVersion: 1,
    rule: 'highest_coins',
    completedRound,
    maxRounds: Number(maxRounds || DEFAULT_MAX_GAME_ROUNDS),
    maxCoins,
    winnerActorIndexes,
    ranking: ranking.map(entry => ({
      ...entry,
      isWinner: winnerActorIndexes.includes(entry.actorIndex),
    })),
  };
}

export function isFinalGameRound(gameState, maxRounds = DEFAULT_MAX_GAME_ROUNDS) {
  return Number(gameState?.round || 0) >= Number(maxRounds || DEFAULT_MAX_GAME_ROUNDS);
}
