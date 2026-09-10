export const ACTION_TYPES = Object.freeze({
  SELECT_TRADER: 'SELECT_TRADER',
  BUY_PRODUCT: 'BUY_PRODUCT',
  PLACE_TRADER: 'PLACE_TRADER',
  END_TURN: 'END_TURN',
  SUBMIT_EVENT_CHOICES: 'SUBMIT_EVENT_CHOICES',
  ACK_EVENT_RESULTS: 'ACK_EVENT_RESULTS',
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


export function placeTraderAction({ playerId, traderId, sector, productIds = [] }) {
  return {
    type: ACTION_TYPES.PLACE_TRADER,

    payload: {
      playerId,
      traderId,
      sector,
      productIds: Array.isArray(productIds) ? productIds : [],
    },
  };
}


export function endTurnAction({ playerId }) {
  return {
    type: ACTION_TYPES.END_TURN,

    payload: {
      playerId,
    },
  };
}


export function submitEventChoicesAction({ playerId, positiveChoices = {}, effectTargets = {} }) {
  return {
    type: ACTION_TYPES.SUBMIT_EVENT_CHOICES,

    payload: {
      playerId,
      positiveChoices: positiveChoices && typeof positiveChoices === 'object' ? positiveChoices : {},
      effectTargets: effectTargets && typeof effectTargets === 'object' ? effectTargets : {},
    },
  };
}

export function ackEventResultsAction({ playerId }) {
  return {
    type: ACTION_TYPES.ACK_EVENT_RESULTS,

    payload: {
      playerId,
    },
  };
}
