/**
 * Derived player fields that must stay in sync with authoritative trader state.
 */
export function deriveSectorsWithTraders(traders = []) {
  if (!Array.isArray(traders)) {
    return [];
  }

  return [
    ...new Set(
      traders
        .map(trader => trader?.location)
        .filter(location => typeof location === 'string' && location.length > 0)
    ),
  ];
}

export function syncPlayerSectorsWithTraders(player, traders = player?.traders) {
  if (!player) {
    return player;
  }

  const normalizedTraders = Array.isArray(traders) ? traders : [];

  return {
    ...player,
    traders: normalizedTraders,
    sectorsWithTraders: deriveSectorsWithTraders(normalizedTraders),
  };
}
