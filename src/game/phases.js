// src/game/phases.js

export const PHASES = Object.freeze({
  LOBBY: 'lobby',

  TRADER_SELECTION: 'trader_selection',

  WHOLESALE_SETUP: 'wholesale_setup',
  WHOLESALE: 'wholesale',

  PLACEMENT: 'placement',

  PERSONAL_EVENTS: 'personal_events',
  GLOBAL_EVENT: 'global_event',

  BUYERS_SPAWN: 'buyers_spawn',
  SALES: 'sales',
  FEEDING: 'feeding',

  ROUND_END: 'round_end',

  GAME_END: 'game_end',
});

export const GAME_PHASES = Object.freeze(Object.values(PHASES));

export function isValidPhase(phase) {
  return GAME_PHASES.includes(phase);
}
