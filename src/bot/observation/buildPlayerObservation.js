import { getGameSectors, getSectorCapacity, normalizeSectorKey } from '../../game/placeTraderRules';

function normalizeProductSector(product) {
  return product?.sector || product?.product_sector || 'unknown';
}

function normalizeProductLegality(product) {
  return product?.legality === 'illegal' ? 'illegal' : 'legal';
}

function getEnglishField(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    return value.en || Object.values(value)[0] || null;
  }

  return null;
}

/**
 * Build the information boundary used by bot decision logic.
 *
 * IMPORTANT:
 * Do not pass raw authoritative gameState into a decision provider.
 * This function should expose only information that the represented
 * player is allowed to know.
 *
 * The whitelist is expanded action-by-action. SELECT_TRADER, BUY_PRODUCT
 * PLACE_TRADER and personal event choices use only public board data plus
 * the represented player's own inventory/trader/event-card information.
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
    schemaVersion: 4,
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
      traders: (player.traders || []).map(trader => ({
        traderId: trader?.traderId || null,
        location: trader?.location || null,
        favoriteSector:
          getEnglishField(trader?.sector_favorite) ||
          getEnglishField(trader?.best_sector) ||
          null,
        goodsCount: Array.isArray(trader?.goods) ? trader.goods.length : 0,
        goods: (trader?.goods || []).map(good => ({
          productId: good?.productId ?? null,
          sector: normalizeProductSector(good),
          legality: normalizeProductLegality(good),
          sellingPrice: Number(good?.sellingPrice || 0),
          profit: Number(good?.profit || 0),
          quantity: Number(good?.quantity_player_card || 1),
        })),
        protectedFromIllegalInspection: !!(trader?.Illigal_protection || trader?.illegal_protection),
      })),
      eventCards: (player.eventCards || []).map(card => ({
        cardId: card?.id || null,
        fortune: card?.fortune || null,
        goalAction: card?.goal_action || null,
        goalItem: card?.goal_item || null,
        effect: Array.isArray(card?.effect) ? card.effect : [],
      })),
      eventChoicePending:
        gameState.phase === 'personal_events' && gameState.eventCardPhase?.[playerId] === false,
      products: playerProducts
        .filter(product => product?.productId !== null && product?.productId !== undefined)
        .map(product => ({
          productId: product.productId,
          quantity: Number(product.quantity_player_card ?? 1),
          sector: normalizeProductSector(product),
          legality: normalizeProductLegality(product),
          sellingPrice: Number(product.sellingPrice || 0),
          profit: Number(product.profit || 0),
        })),
    },

    visibleOpponents: gameState.players
      .map((currentPlayer, actorIndex) => ({ currentPlayer, actorIndex }))
      .filter(({ currentPlayer }) => currentPlayer.user_id !== playerId)
      .map(({ currentPlayer, actorIndex }) => ({
        actorIndex,
        coins: Number(currentPlayer.coins || 0),
        traders: (currentPlayer.traders || [])
          .filter(trader => trader?.traderId && trader?.location)
          .map(trader => ({
            traderId: trader.traderId,
            location: trader.location,
            protectedFromIllegalInspection: !!(
              trader?.Illigal_protection || trader?.illegal_protection
            ),
            goods: (trader.goods || []).map(good => ({
              productId: good?.productId ?? null,
              sector: normalizeProductSector(good),
              legality: normalizeProductLegality(good),
              sellingPrice: Number(good?.sellingPrice || 0),
              profit: Number(good?.profit || 0),
              quantity: Number(good?.quantity_player_card || 1),
            })),
          })),
      })),

    visibleTraders: traderList.map(trader => ({
      traderId: trader?.traderId || null,
      taken: trader?.taken === true,
    })),

    visibleSectors: getGameSectors(gameState).map(sector => ({
      sector,
      occupied: gameState.players
        .flatMap(currentPlayer => currentPlayer.traders || [])
        .filter(trader => normalizeSectorKey(trader?.location) === normalizeSectorKey(sector)).length,
      capacity: getSectorCapacity(gameState),
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
