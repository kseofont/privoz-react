import { ACTION_TYPES } from './actions';
import { PHASES } from './phases';
import { awardEventCardById } from './eventCards';
import { validatePlaceTrader } from './placeTraderRules';

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

    case ACTION_TYPES.BUY_PRODUCT:
      return reduceBuyProduct(gameState, action.payload);

    case ACTION_TYPES.PLACE_TRADER:
      return reducePlaceTrader(gameState, action.payload);

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


function reduceBuyProduct(gameState, payload = {}) {
  const { playerId, productId } = payload;

  if (!playerId || productId === null || productId === undefined || productId === '') {
    return gameState;
  }

  /*
   * Wholesale is still part of the prototype turn while gameState.phase
   * commonly remains TRADER_SELECTION. Do not introduce a new phase rule
   * here until the wider turn/phase flow is migrated.
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

  const productList = Array.isArray(gameState.products)
    ? gameState.products
    : Array.isArray(gameState.products?.products)
      ? gameState.products.products
      : [];

  const productIndex = productList.findIndex(product => product.productId === productId);

  if (productIndex === -1) {
    return gameState;
  }

  const product = productList[productIndex];
  const availableQuantity = Number(product.quantity_free_card || 0);
  const price = Number(product.wholesalePrice || 0);

  if (availableQuantity <= 0 || price < 0) {
    return gameState;
  }

  const player = gameState.players[playerIndex];
  const currentCoins = Number(player.coins || 0);

  if (currentCoins < price) {
    return gameState;
  }

  const updatedProduct = {
    ...product,
    quantity_free_card: Math.max(0, availableQuantity - 1),
  };

  const updatedProductList = [...productList];
  updatedProductList[productIndex] = updatedProduct;

  const playerProducts = Array.isArray(player.products) ? [...player.products] : [];
  const existingPlayerProductIndex = playerProducts.findIndex(
    playerProduct => playerProduct.productId === updatedProduct.productId
  );

  if (existingPlayerProductIndex !== -1) {
    playerProducts[existingPlayerProductIndex] = {
      ...playerProducts[existingPlayerProductIndex],
      ...updatedProduct,
      quantity_player_card:
        Number(playerProducts[existingPlayerProductIndex].quantity_player_card || 1) + 1,
    };
  } else {
    playerProducts.push({
      ...updatedProduct,
      quantity_player_card: 1,
    });
  }

  const updatedPlayer = {
    ...player,
    products: playerProducts,
    coins: Math.max(0, currentCoins - price),
  };

  const updatedPlayers = [...gameState.players];
  updatedPlayers[playerIndex] = updatedPlayer;

  let updatedProducts = gameState.products;

  if (Array.isArray(gameState.products)) {
    updatedProducts = updatedProductList;
  } else if (gameState.products && Array.isArray(gameState.products.products)) {
    updatedProducts = {
      ...gameState.products,
      products: updatedProductList,
    };
  }

  return {
    ...gameState,
    players: updatedPlayers,
    products: updatedProducts,
  };
}


function reducePlaceTrader(gameState, payload = {}) {
  const validation = validatePlaceTrader(gameState, payload);

  if (!validation.ok) {
    return gameState;
  }

  const { player, trader, sector, productIds, placementCost } = validation;
  const playerIndex = gameState.players.findIndex(currentPlayer => currentPlayer.user_id === payload.playerId);
  const remainingProducts = Array.isArray(player.products)
    ? player.products.map(product => ({ ...product }))
    : [];
  const goods = [];

  productIds.forEach(productId => {
    const productIndex = remainingProducts.findIndex(
      product => String(product.productId) === String(productId)
    );

    if (productIndex === -1) {
      return;
    }

    const sourceProduct = remainingProducts[productIndex];
    const quantity = Math.max(0, Number(sourceProduct.quantity_player_card || 0));

    goods.push({
      ...sourceProduct,
      quantity_player_card: 1,
    });

    if (quantity > 1) {
      remainingProducts[productIndex] = {
        ...sourceProduct,
        quantity_player_card: quantity - 1,
      };
    } else {
      remainingProducts.splice(productIndex, 1);
    }
  });

  const updatedTraders = (player.traders || []).map(currentTrader =>
    currentTrader.traderId === trader.traderId
      ? {
          ...currentTrader,
          card_in_game: `sector_${sector}_user_${payload.playerId}`,
          location: sector,
          goods,
        }
      : currentTrader
  );

  const sectorsWithTraders = [
    ...new Set(updatedTraders.map(currentTrader => currentTrader.location).filter(Boolean)),
  ];

  const updatedPlayers = [...gameState.players];
  updatedPlayers[playerIndex] = {
    ...player,
    traders: updatedTraders,
    products: remainingProducts,
    coins: Number(player.coins || 0) - placementCost,
    sectorsWithTraders,
  };

  let nextState = {
    ...gameState,
    players: updatedPlayers,
  };

  if (productIds.length > 0 && payload.eventCardId) {
    nextState = awardEventCardById(nextState, payload.playerId, payload.eventCardId);
  }

  return nextState;
}
