function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function playerById(state, playerId) {
  return asArray(state?.players).find(player => player?.user_id === playerId) || null;
}

function productQuantityMap(player) {
  const result = new Map();
  asArray(player?.products).forEach(product => {
    result.set(String(product?.productId), Number(product?.quantity_player_card || 0));
  });
  return result;
}

function getProductIncreases(beforePlayer, afterPlayer) {
  const beforeMap = productQuantityMap(beforePlayer);
  return asArray(afterPlayer?.products)
    .map(product => {
      const beforeQty = beforeMap.get(String(product?.productId)) || 0;
      const afterQty = Number(product?.quantity_player_card || 0);
      return afterQty > beforeQty
        ? {
            productId: product?.productId,
            productName: product?.productName,
            quantity: afterQty - beforeQty,
            wholesalePrice: Number(product?.wholesalePrice || 0),
            sellingPrice: Number(product?.sellingPrice || 0),
            legality: product?.legality || null,
            sector: product?.sector || product?.product_sector || null,
          }
        : null;
    })
    .filter(Boolean);
}

function getNewTraders(beforePlayer, afterPlayer) {
  const beforeIds = new Set(asArray(beforePlayer?.traders).map(trader => String(trader?.traderId)));
  return asArray(afterPlayer?.traders).filter(
    trader => trader?.traderId && !beforeIds.has(String(trader.traderId))
  );
}

function collectSoldGoods(beforePlayer, afterPlayer) {
  const afterTraderMap = new Map(
    asArray(afterPlayer?.traders).map(trader => [String(trader?.traderId), trader])
  );
  const sold = [];

  asArray(beforePlayer?.traders).forEach(beforeTrader => {
    const beforeGoods = asArray(beforeTrader?.goods);
    if (!beforeGoods.length) return;
    const afterTrader = afterTraderMap.get(String(beforeTrader?.traderId));
    const afterGoods = asArray(afterTrader?.goods);
    if (afterGoods.length >= beforeGoods.length) return;

    beforeGoods.forEach(product => {
      const quantity = Number(product?.quantity_player_card || 0);
      const unitPrice = Number(product?.sellingPrice || product?.retailPrice || product?.profit || 0);
      sold.push({
        traderId: beforeTrader?.traderId,
        traderName: beforeTrader?.name,
        productId: product?.productId,
        productName: product?.productName,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      });
    });
  });

  return sold;
}

function newEventMessages(beforeState, afterState, playerId) {
  const beforeMessages = asArray(beforeState?.eventResultLog?.[playerId]);
  const afterMessages = asArray(afterState?.eventResultLog?.[playerId]);
  if (!afterMessages.length) return [];
  if (!beforeMessages.length) return afterMessages;
  return afterMessages.filter(message => !beforeMessages.includes(message));
}

export function buildDebugStateSignature(state) {
  if (!state) return 'none';
  const players = asArray(state.players).map(player => ({
    id: player?.user_id,
    coins: Number(player?.coins || 0),
    products: asArray(player?.products).map(product => [
      product?.productId,
      Number(product?.quantity_player_card || 0),
    ]),
    traders: asArray(player?.traders).map(trader => [
      trader?.traderId,
      trader?.location || null,
      asArray(trader?.goods).map(product => [
        product?.productId,
        Number(product?.quantity_player_card || 0),
      ]),
    ]),
  }));

  return JSON.stringify({
    gameId: state.gameId,
    round: state.round,
    phase: state.phase,
    turn: state.currentTurnUserId,
    nonce: state.eventResultNonce || 0,
    eventCardPhase: state.eventCardPhase || null,
    playerEventChoices: state.playerEventChoices || null,
    eventResultLog: state.eventResultLog || null,
    players,
  });
}

export function buildCoinChangeEntries(beforeState, afterState) {
  if (!beforeState || !afterState || beforeState.gameId !== afterState.gameId) return [];

  const entries = [];
  const now = Date.now();

  asArray(afterState.players).forEach((afterPlayer, playerIndex) => {
    const playerId = afterPlayer?.user_id;
    const beforePlayer = playerById(beforeState, playerId);
    if (!playerId || !beforePlayer) return;

    const before = Number(beforePlayer.coins || 0);
    const after = Number(afterPlayer.coins || 0);
    if (before === after) return;

    const delta = after - before;
    const eventMessages = newEventMessages(beforeState, afterState, playerId);
    const newTraders = getNewTraders(beforePlayer, afterPlayer);
    const productIncreases = getProductIncreases(beforePlayer, afterPlayer);
    const soldGoods = collectSoldGoods(beforePlayer, afterPlayer);

    let reasonType = delta > 0 ? 'income' : 'expense';
    const context = {
      round: afterState.round || beforeState.round || 1,
      phase: afterState.phase || null,
      eventMessages,
    };

    // Preserve every observable contributor to the same authoritative state
    // transition. End-of-round sales and event-card effects can happen close
    // together, so diagnostics should not hide one just because another gets
    // the primary reason label.
    if (newTraders.length) {
      context.traders = newTraders.map(trader => ({
        traderId: trader?.traderId,
        name: trader?.name,
      }));
    }
    if (productIncreases.length) context.products = productIncreases;
    if (soldGoods.length) {
      context.soldGoods = soldGoods;
      context.saleGross = soldGoods.reduce((sum, item) => sum + Number(item?.total || 0), 0);
    }

    if (eventMessages.length) {
      reasonType = 'event_effect';
    } else if (newTraders.length && delta <= 0) {
      reasonType = 'trader_purchase';
      context.cost = Math.abs(delta);
    } else if (productIncreases.length && delta < 0) {
      reasonType = 'product_purchase';
      context.cost = Math.abs(delta);
    } else if (soldGoods.length && delta > 0) {
      reasonType = 'round_sale';
      context.revenue = delta;
    }

    entries.push({
      id: `coin:${afterState.gameId}:${playerId}:${now}:${before}:${after}:${reasonType}`,
      ts: now,
      playerId,
      playerIndex,
      playerName: afterPlayer?.name || beforePlayer?.name || `#${playerIndex + 1}`,
      before,
      after,
      delta,
      reasonType,
      context,
    });
  });

  return entries;
}

function traderById(state, traderId) {
  for (const player of asArray(state?.players)) {
    const trader = asArray(player?.traders).find(item => String(item?.traderId) === String(traderId));
    if (trader) return { trader, player };
  }
  return null;
}

function eventCardById(player, cardId) {
  return asArray(player?.eventCards).find(card => String(card?.id) === String(cardId)) || null;
}

function resolveTarget(state, actorId, target = {}) {
  const result = {};
  if (target.playerId) {
    const player = playerById(state, target.playerId);
    result.playerId = target.playerId;
    result.playerName = player?.name || null;
  }
  if (target.sector) {
    result.sector = target.sector;
    const victim = asArray(state?.players).find(
      player =>
        player?.user_id !== actorId &&
        asArray(player?.traders).some(trader => trader?.location === target.sector)
    );
    if (victim) {
      result.playerId = victim.user_id;
      result.playerName = victim.name || null;
    }
  }
  if (target.traderId) {
    const found = traderById(state, target.traderId);
    result.traderId = target.traderId;
    result.traderName = found?.trader?.name || null;
    if (found?.player) {
      result.playerId = found.player.user_id;
      result.playerName = found.player.name || null;
    }
  }
  return result;
}

export function buildEventHistoryEntries(beforeState, afterState) {
  if (!beforeState || !afterState || beforeState.gameId !== afterState.gameId) return [];
  const entries = [];
  const now = Date.now();
  const beforeChoices = beforeState.playerEventChoices || {};
  const afterChoices = afterState.playerEventChoices || {};

  Object.entries(afterChoices).forEach(([playerId, choices]) => {
    if (beforeChoices[playerId] || !choices) return;
    const player = playerById(afterState, playerId) || playerById(beforeState, playerId);
    if (!player) return;

    const cards = [];
    const positiveChoices = choices.positiveChoices || {};
    const effectTargets = choices.effectTargets || {};

    asArray(player.eventCards).forEach((card, index) => {
      const cardId = card?.id ?? String(index);
      const positiveChoice = positiveChoices[cardId];
      const target = effectTargets[cardId];
      if (!positiveChoice && !target && card?.fortune !== 'negative') return;
      if (card?.fortune === 'negative' && !target) return;

      cards.push({
        cardId,
        title: card?.title,
        description: card?.description,
        fortune: card?.fortune,
        effect: card?.effect,
        choice: positiveChoice || 'use',
        target: resolveTarget(afterState, playerId, target || {}),
      });
    });

    if (cards.length) {
      entries.push({
        id: `event-choice:${afterState.gameId}:${afterState.round}:${playerId}:${JSON.stringify(choices)}`,
        ts: now,
        kind: 'decision',
        round: afterState.round || 1,
        actorId: playerId,
        actorName: player.name || null,
        actorIsBot: player.isBot === true,
        behaviorProfile: player.botBehaviorProfile || null,
        policyVersion: player.botPolicyVersion || null,
        cards,
      });
    }
  });

  const beforeNonce = Number(beforeState.eventResultNonce || 0);
  const afterNonce = Number(afterState.eventResultNonce || 0);
  if (afterNonce > beforeNonce) {
    Object.entries(afterState.eventResultLog || {}).forEach(([playerId, messages]) => {
      const rows = asArray(messages);
      if (!rows.length) return;
      const player = playerById(afterState, playerId) || playerById(beforeState, playerId);
      entries.push({
        id: `event-result:${afterState.gameId}:${afterNonce}:${playerId}`,
        ts: now,
        kind: 'result',
        round: afterState.round || beforeState.round || 1,
        recipientId: playerId,
        recipientName: player?.name || null,
        messages: rows,
      });
    });
  }

  return entries;
}


function goodsQuantityMap(trader) {
  const result = new Map();
  asArray(trader?.goods).forEach(product => {
    result.set(String(product?.productId), Number(product?.quantity_player_card || 0));
  });
  return result;
}

export function buildPlayerActivityEntries(beforeState, afterState) {
  if (!beforeState || !afterState || beforeState.gameId !== afterState.gameId) return [];
  const entries = [];
  const now = Date.now();

  const beforeTurnId = beforeState.currentTurnUserId || null;
  const afterTurnId = afterState.currentTurnUserId || null;
  if (beforeTurnId !== afterTurnId) {
    if (beforeTurnId) {
      const previousPlayer = playerById(afterState, beforeTurnId) || playerById(beforeState, beforeTurnId);
      const previousIndex = asArray(afterState.players).findIndex(player => player?.user_id === beforeTurnId);
      entries.push({
        id: `activity:turn-ended:${afterState.gameId}:${afterState.round}:${beforeTurnId}:${afterTurnId || 'none'}`,
        ts: now,
        playerId: beforeTurnId,
        playerIndex: previousIndex,
        playerName: previousPlayer?.name || null,
        type: 'turn_ended',
        round: beforeState.round || afterState.round || 1,
        context: { nextPlayerId: afterTurnId },
      });
    }
    if (afterTurnId) {
      const nextPlayer = playerById(afterState, afterTurnId) || playerById(beforeState, afterTurnId);
      const nextIndex = asArray(afterState.players).findIndex(player => player?.user_id === afterTurnId);
      entries.push({
        id: `activity:turn-started:${afterState.gameId}:${afterState.round}:${afterTurnId}:${beforeTurnId || 'none'}`,
        ts: now,
        playerId: afterTurnId,
        playerIndex: nextIndex,
        playerName: nextPlayer?.name || null,
        type: 'turn_started',
        round: afterState.round || 1,
        context: { previousPlayerId: beforeTurnId },
      });
    }
  }

  asArray(afterState.players).forEach((afterPlayer, playerIndex) => {
    const playerId = afterPlayer?.user_id;
    const beforePlayer = playerById(beforeState, playerId);
    if (!playerId || !beforePlayer) return;

    const newTraders = getNewTraders(beforePlayer, afterPlayer);
    newTraders.forEach(trader => {
      entries.push({
        id: `activity:trader-added:${afterState.gameId}:${afterState.round}:${playerId}:${trader.traderId}`,
        ts: now,
        playerId,
        playerIndex,
        playerName: afterPlayer.name || null,
        type: 'trader_added',
        round: afterState.round || 1,
        context: { traderId: trader.traderId, traderName: trader.name },
      });
    });

    const productIncreases = getProductIncreases(beforePlayer, afterPlayer);
    productIncreases.forEach(product => {
      entries.push({
        id: `activity:product-added:${afterState.gameId}:${afterState.round}:${playerId}:${product.productId}:${Number(afterPlayer.coins || 0)}:${product.quantity}`,
        ts: now,
        playerId,
        playerIndex,
        playerName: afterPlayer.name || null,
        type: 'product_added',
        round: afterState.round || 1,
        context: { product },
      });
    });

    const beforeTraders = new Map(
      asArray(beforePlayer.traders).map(trader => [String(trader?.traderId), trader])
    );
    asArray(afterPlayer.traders).forEach(afterTrader => {
      const beforeTrader = beforeTraders.get(String(afterTrader?.traderId));
      if (!beforeTrader) return;

      const beforeLocation = beforeTrader?.location || null;
      const afterLocation = afterTrader?.location || null;
      if (beforeLocation !== afterLocation) {
        entries.push({
          id: `activity:trader-moved:${afterState.gameId}:${afterState.round}:${playerId}:${afterTrader.traderId}:${beforeLocation || 'hand'}:${afterLocation || 'hand'}`,
          ts: now,
          playerId,
          playerIndex,
          playerName: afterPlayer.name || null,
          type: 'trader_moved',
          round: afterState.round || 1,
          context: {
            traderId: afterTrader.traderId,
            traderName: afterTrader.name,
            from: beforeLocation,
            to: afterLocation,
          },
        });
      }

      const beforeGoods = goodsQuantityMap(beforeTrader);
      const afterGoods = goodsQuantityMap(afterTrader);
      const productIds = new Set([...beforeGoods.keys(), ...afterGoods.keys()]);
      const changes = [];
      productIds.forEach(productId => {
        const beforeQty = beforeGoods.get(productId) || 0;
        const afterQty = afterGoods.get(productId) || 0;
        if (beforeQty === afterQty) return;
        const sourceProduct =
          asArray(afterTrader.goods).find(product => String(product?.productId) === productId) ||
          asArray(beforeTrader.goods).find(product => String(product?.productId) === productId);
        changes.push({
          productId: sourceProduct?.productId ?? productId,
          productName: sourceProduct?.productName,
          before: beforeQty,
          after: afterQty,
          delta: afterQty - beforeQty,
        });
      });

      if (changes.length) {
        entries.push({
          id: `activity:goods:${afterState.gameId}:${afterState.round}:${playerId}:${afterTrader.traderId}:${JSON.stringify(changes)}`,
          ts: now,
          playerId,
          playerIndex,
          playerName: afterPlayer.name || null,
          type: 'trader_goods_changed',
          round: afterState.round || 1,
          context: {
            traderId: afterTrader.traderId,
            traderName: afterTrader.name,
            changes,
          },
        });
      }
    });

    const beforeEventCount = asArray(beforePlayer.eventCards).length;
    const afterEventCount = asArray(afterPlayer.eventCards).length;
    if (beforeEventCount !== afterEventCount) {
      entries.push({
        id: `activity:event-count:${afterState.gameId}:${afterState.round}:${playerId}:${beforeEventCount}:${afterEventCount}:${afterState.eventResultNonce || 0}`,
        ts: now,
        playerId,
        playerIndex,
        playerName: afterPlayer.name || null,
        type: 'event_card_count_changed',
        round: afterState.round || 1,
        context: { before: beforeEventCount, after: afterEventCount, delta: afterEventCount - beforeEventCount },
      });
    }
  });

  return entries;
}

export function mergeHistoryEntries(existing = [], additions = [], limit = 300) {
  const map = new Map();
  [...additions, ...existing].forEach(entry => {
    if (entry?.id && !map.has(entry.id)) map.set(entry.id, entry);
  });
  return [...map.values()].sort((a, b) => Number(b.ts || 0) - Number(a.ts || 0)).slice(0, limit);
}
