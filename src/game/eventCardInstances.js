/**
 * Event Card identity helpers.
 *
 * card.id identifies the card TYPE from eventcards.json.
 * card.instanceId identifies one physical copy owned by one player.
 *
 * Old states may still contain aggregated cards with quantity_active > 1.
 * They are expanded here so old/in-flight game states remain usable after
 * Stage 10C without changing the canonical card type id.
 */

export function getEventCardInstanceKey(card, index = 0) {
  return card?.instanceId || card?.id || String(index);
}

export function expandEventCardInstances(cards = []) {
  if (!Array.isArray(cards)) {
    return [];
  }

  /*
   * quantity_active belongs to the CARD TYPE / deck stock.
   *
   * A hand entry without instanceId is one legacy logical card, regardless of
   * quantity_active. Treating quantity_active as a hand-copy count would turn
   * one Regular Customer / Transport / Porters card into many repeated effects.
   *
   * New Stage 10C draws always carry instanceId, so true duplicate physical
   * copies are already represented as separate array entries.
   *
   * If a legacy/manual state contains two separate entries of the same type
   * without instanceId, give only those separate entries deterministic
   * temporary ids so they can still be addressed independently.
   */
  const typeCounts = new Map();

  cards.forEach(card => {
    if (!card || card.instanceId || !card.id) {
      return;
    }

    typeCounts.set(card.id, (typeCounts.get(card.id) || 0) + 1);
  });

  const seenByType = new Map();

  return cards.flatMap((card, sourceIndex) => {
    if (!card) {
      return [];
    }

    if (card.instanceId) {
      return [{ ...card, quantity_active: 1 }];
    }

    if (card.id && (typeCounts.get(card.id) || 0) > 1) {
      const occurrence = (seenByType.get(card.id) || 0) + 1;
      seenByType.set(card.id, occurrence);

      return [{
        ...card,
        instanceId: `${card.id}__legacy_${occurrence}`,
        quantity_active: 1,
      }];
    }

    return [{
      ...card,
      quantity_active: 1,
    }];
  });
}

export function getNextEventCardInstanceSequence(gameState) {
  const stored = Math.max(0, Math.floor(Number(gameState?.eventCardInstanceSequence || 0)));
  let observed = 0;

  (gameState?.players || []).forEach(player => {
    (player?.eventCards || []).forEach(card => {
      if (typeof card?.instanceId !== 'string') {
        return;
      }

      const match = card.instanceId.match(/__(\d+)$/);
      if (match) {
        observed = Math.max(observed, Number(match[1]) || 0);
      }
    });
  });

  return Math.max(stored, observed) + 1;
}

export function createEventCardInstanceId(cardId, sequence) {
  return `${cardId || 'event_card'}__${sequence}`;
}
