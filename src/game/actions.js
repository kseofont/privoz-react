export const ACTION_TYPES = Object.freeze({
  SELECT_TRADER: 'SELECT_TRADER',
});

export function selectTraderAction({ playerId, traderId }) {
  return {
    type: ACTION_TYPES.SELECT_TRADER,

    payload: {
      playerId,
      traderId,
    },
  };
}
