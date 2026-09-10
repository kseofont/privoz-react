function normalizeProductSector(product) {
  return product?.sector || product?.product_sector || 'unknown';
}

function normalizeProductLegality(product) {
  return product?.legality === 'illegal' ? 'illegal' : 'legal';
}

/**
 * Build the information boundary used by bot decision logic.
 *
 * IMPORTANT:
 * Do not pass raw authoritative gameState into a decision provider.
 * This function should expose only information that the represented
 * player is allowed to know.
 *
 * The whitelist is expanded action-by-action. SELECT_TRADER and
 * BUY_PRODUCT currently use only public market data plus the bot's own
 * inventory/balance.
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

  const productList = Array.isArray(gameState.products)
    ? gameState.products
    : Array.isArray(gameState.products?.products)
      ? gameState.products.products
      : [];

  const playerProducts = Array.isArray(player.products) ? player.products : [];

  return {
    schemaVersion: 2,
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
      products: playerProducts
        .filter(product => product?.productId !== null && product?.productId !== undefined)
        .map(product => ({
          productId: product.productId,
          quantity: Number(product.quantity_player_card || 0),
          sector: normalizeProductSector(product),
          legality: normalizeProductLegality(product),
        })),
    },

    visibleTraders: traderList.map(trader => ({
      traderId: trader?.traderId || null,
      taken: trader?.taken === true,
    })),

    visibleProducts: productList
      .filter(product => product?.productId !== null && product?.productId !== undefined)
      .map(product => ({
        productId: product.productId,
        wholesalePrice: Number(product.wholesalePrice || 0),
        sellingPrice: Number(product.sellingPrice || 0),
        profit: Number(product.profit || 0),
        sector: normalizeProductSector(product),
        legality: normalizeProductLegality(product),
        quantityFree: Number(product.quantity_free_card || 0),
      })),
  };
}
