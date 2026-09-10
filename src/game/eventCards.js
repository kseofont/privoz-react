export function chooseRandomEventCardId(gameState, randomFn = Math.random) {
  const eventCards = Array.isArray(gameState?.eventcards) ? gameState.eventcards : [];
  const weightedIds = [];

  eventCards.forEach(card => {
    if (card?.position_in_game !== 'deck') {
      return;
    }

    const quantity = Math.max(0, Number(card.quantity_active || 0));

    for (let index = 0; index < quantity; index += 1) {
      weightedIds.push(card.id);
    }
  });

  if (!weightedIds.length) {
    return null;
  }

  const rawIndex = Math.floor(Number(randomFn()) * weightedIds.length);
  const safeIndex = Math.max(0, Math.min(weightedIds.length - 1, rawIndex));

  return weightedIds[safeIndex] || null;
}

export function awardEventCardById(gameState, playerId, eventCardId) {
  if (!gameState || !playerId || !eventCardId) {
    return gameState;
  }

  const eventCards = Array.isArray(gameState.eventcards) ? gameState.eventcards : [];
  const players = Array.isArray(gameState.players) ? gameState.players : [];
  const playerIndex = players.findIndex(player => player.user_id === playerId);
  const eventCardIndex = eventCards.findIndex(card => card.id === eventCardId);

  if (playerIndex === -1 || eventCardIndex === -1) {
    return gameState;
  }

  const eventCard = eventCards[eventCardIndex];
  const availableQuantity = Math.max(0, Number(eventCard.quantity_active || 0));

  if (eventCard.position_in_game !== 'deck' || availableQuantity <= 0) {
    return gameState;
  }

  const updatedEventCards = [...eventCards];
  updatedEventCards[eventCardIndex] = {
    ...eventCard,
    quantity_active: availableQuantity - 1,
  };

  const player = players[playerIndex];
  const playerEventCards = Array.isArray(player.eventCards) ? [...player.eventCards] : [];
  const existingCardIndex = playerEventCards.findIndex(card => card.id === eventCard.id);

  if (existingCardIndex !== -1) {
    playerEventCards[existingCardIndex] = {
      ...playerEventCards[existingCardIndex],
      quantity_active: Number(playerEventCards[existingCardIndex].quantity_active || 0) + 1,
    };
  } else {
    playerEventCards.push({
      ...eventCard,
      position_in_game: `hand_${playerId}`,
      quantity_active: 1,
    });
  }

  const updatedPlayers = [...players];
  updatedPlayers[playerIndex] = {
    ...player,
    eventCards: playerEventCards,
  };

  return {
    ...gameState,
    eventcards: updatedEventCards,
    players: updatedPlayers,
  };
}
