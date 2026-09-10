export const MAX_TRADER_GOODS = 3;
export const MAX_PLAYER_TRADERS = 3;

export const DEFAULT_GAME_SECTORS = Object.freeze([
  'Fruits',
  'Vegetables',
  'Dairy',
  'Meat',
  'Fish',
  'Household goods',
]);

export function normalizeSectorKey(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (normalized === 'household goods') {
    return 'household';
  }

  return normalized;
}

export function getGameSectors(gameState) {
  return Array.isArray(gameState?.sectors) && gameState.sectors.length
    ? gameState.sectors
    : DEFAULT_GAME_SECTORS;
}

export function getSectorCapacity(gameState) {
  return Array.isArray(gameState?.players) ? gameState.players.length : 0;
}

export function isProductAllowedInSector(product, sector) {
  if (product?.legality === 'illegal') {
    return true;
  }

  return normalizeSectorKey(product?.sector || product?.product_sector) === normalizeSectorKey(sector);
}

function countRequestedProducts(productIds) {
  return (Array.isArray(productIds) ? productIds : []).reduce((counts, productId) => {
    const key = String(productId);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export function validatePlaceTrader(gameState, payload = {}) {
  const { playerId, traderId, sector } = payload;
  const productIds = Array.isArray(payload.productIds) ? payload.productIds : [];

  if (!gameState || !playerId || !traderId || !sector) {
    return { ok: false, reason: 'invalid_payload' };
  }

  if (gameState.currentTurnUserId !== playerId) {
    return { ok: false, reason: 'not_current_player' };
  }

  if (!Array.isArray(gameState.players)) {
    return { ok: false, reason: 'players_missing' };
  }

  const player = gameState.players.find(currentPlayer => currentPlayer.user_id === playerId);

  if (!player) {
    return { ok: false, reason: 'player_missing' };
  }

  const trader = (player.traders || []).find(currentTrader => currentTrader.traderId === traderId);

  if (!trader) {
    return { ok: false, reason: 'trader_not_owned' };
  }

  if (trader.location) {
    return { ok: false, reason: 'trader_already_placed' };
  }

  const gameSectors = getGameSectors(gameState);
  const matchedSector = gameSectors.find(
    candidate => normalizeSectorKey(candidate) === normalizeSectorKey(sector)
  );

  if (!matchedSector) {
    return { ok: false, reason: 'invalid_sector' };
  }

  const capacity = getSectorCapacity(gameState);
  const occupied = gameState.players
    .flatMap(currentPlayer => currentPlayer.traders || [])
    .filter(currentTrader => normalizeSectorKey(currentTrader.location) === normalizeSectorKey(matchedSector))
    .length;

  if (capacity <= 0 || occupied >= capacity) {
    return { ok: false, reason: 'sector_full' };
  }

  if (productIds.length > MAX_TRADER_GOODS) {
    return { ok: false, reason: 'too_many_products' };
  }

  const requestedCounts = countRequestedProducts(productIds);
  const ownedProducts = Array.isArray(player.products) ? player.products : [];

  for (const [productId, requestedQuantity] of Object.entries(requestedCounts)) {
    const product = ownedProducts.find(currentProduct => String(currentProduct.productId) === productId);

    if (!product) {
      return { ok: false, reason: 'product_not_owned' };
    }

    const ownedQuantity = Math.max(0, Number(product.quantity_player_card ?? 1));

    if (requestedQuantity > ownedQuantity) {
      return { ok: false, reason: 'product_quantity_exceeded' };
    }

    if (!isProductAllowedInSector(product, matchedSector)) {
      return { ok: false, reason: 'product_sector_mismatch' };
    }
  }

  return {
    ok: true,
    player,
    trader,
    sector: matchedSector,
    productIds,
    capacity,
    occupied,
  };
}
