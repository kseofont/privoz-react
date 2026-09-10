import {
  buildCoinChangeEntries,
  buildEventHistoryEntries,
  buildPlayerActivityEntries,
  mergeHistoryEntries,
} from './gameDebugHistory';

export const DEBUG_HISTORY_EVENT = 'privoz:debug-history-updated';

export function getDebugHistoryStorageKeys(gameId) {
  const safeGameId = gameId || 'defaultGame';
  return {
    coins: `debugCoinHistory:${safeGameId}`,
    events: `debugEventHistory:${safeGameId}`,
    activity: `debugActivityHistory:${safeGameId}`,
  };
}

function readJson(key, fallback) {
  if (typeof window === 'undefined' || !window.sessionStorage) return fallback;
  try {
    const value = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function readDebugHistories(gameId) {
  const keys = getDebugHistoryStorageKeys(gameId);
  const coins = readJson(keys.coins, {});
  const events = readJson(keys.events, []);
  const activity = readJson(keys.activity, []);

  return {
    coins: coins && typeof coins === 'object' && !Array.isArray(coins) ? coins : {},
    events: Array.isArray(events) ? events : [],
    activity: Array.isArray(activity) ? activity : [],
  };
}

export function persistDebugTransition({ beforeState, afterState }) {
  if (
    typeof window === 'undefined' ||
    !beforeState?.gameId ||
    beforeState.gameId !== afterState?.gameId
  ) {
    return { coinEntries: [], eventEntries: [], activityEntries: [] };
  }

  const gameId = afterState.gameId;
  const keys = getDebugHistoryStorageKeys(gameId);
  const coinEntries = buildCoinChangeEntries(beforeState, afterState);
  const eventEntries = buildEventHistoryEntries(beforeState, afterState);
  const activityEntries = buildPlayerActivityEntries(beforeState, afterState);

  if (coinEntries.length) {
    const current = readDebugHistories(gameId).coins;
    const next = { ...current };
    coinEntries.forEach(entry => {
      next[entry.playerId] = mergeHistoryEntries(next[entry.playerId] || [], [entry], 300);
    });
    writeJson(keys.coins, next);
  }

  if (eventEntries.length) {
    const current = readDebugHistories(gameId).events;
    writeJson(keys.events, mergeHistoryEntries(current, eventEntries, 300));
  }

  if (activityEntries.length) {
    const current = readDebugHistories(gameId).activity;
    writeJson(keys.activity, mergeHistoryEntries(current, activityEntries, 500));
  }

  if (coinEntries.length || eventEntries.length || activityEntries.length) {
    try {
      window.dispatchEvent(new CustomEvent(DEBUG_HISTORY_EVENT, { detail: { gameId } }));
    } catch {}
  }

  return { coinEntries, eventEntries, activityEntries };
}
