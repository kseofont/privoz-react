export const ACTION_TYPES = Object.freeze({
  SELECT_TRADER: 'SELECT_TRADER',
  BUY_PRODUCT: 'BUY_PRODUCT',
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

export function buyProductAction({ playerId, productId }) {
  return {
    type: ACTION_TYPES.BUY_PRODUCT,

    payload: {
      playerId,
      productId,
    },
  };
}
