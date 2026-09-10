import { awardEventCardById } from '../eventCards';
import {
  expandEventCardInstances,
  getEventCardInstanceKey,
} from '../eventCardInstances';
import { validateAndNormalizeEventChoice } from '../eventChoiceRules';
import { applyEventChoicesToGameState } from '../../logic/logic';

function positiveCard(quantity = 2) {
  return {
    id: 'ev_card_duplicate_test',
    title: { en: 'Duplicate test' },
    description: { en: 'Duplicate test card' },
    fortune: 'positive',
    position_in_game: 'deck',
    quantity_active: quantity,
    goal_action: null,
    goal_item: null,
    effect: [],
  };
}

function makeBaseState() {
  return {
    gameId: 'GAME-DUPLICATE-EVENT-CARDS',
    phase: 'trader_selection',
    round: 3,
    eventCardInstanceSequence: 0,
    eventcards: [positiveCard(2)],
    players: [
      {
        user_id: 'player-1',
        name: 'Player 1',
        coins: 5,
        traders: [],
        products: [],
        eventCards: [],
      },
    ],
  };
}

test('drawing the same Event Card type twice creates two physical instances', () => {
  const first = awardEventCardById(makeBaseState(), 'player-1', 'ev_card_duplicate_test');
  const second = awardEventCardById(first, 'player-1', 'ev_card_duplicate_test');
  const cards = second.players[0].eventCards;

  expect(cards).toHaveLength(2);
  expect(cards[0].id).toBe('ev_card_duplicate_test');
  expect(cards[1].id).toBe('ev_card_duplicate_test');
  expect(cards[0].instanceId).toBe('ev_card_duplicate_test__1');
  expect(cards[1].instanceId).toBe('ev_card_duplicate_test__2');
  expect(cards[0].instanceId).not.toBe(cards[1].instanceId);
  expect(cards.every(card => card.quantity_active === 1)).toBe(true);
  expect(second.eventcards[0].quantity_active).toBe(0);
  expect(second.eventCardInstanceSequence).toBe(2);
});

test('quantity_active metadata never multiplies one legacy hand entry into repeated effects', () => {
  const cards = expandEventCardInstances([
    {
      ...positiveCard(14),
      position_in_game: 'hand_player-1',
      quantity_active: 14,
    },
  ]);

  expect(cards).toHaveLength(1);
  expect(getEventCardInstanceKey(cards[0], 0)).toBe('ev_card_duplicate_test');
  expect(cards[0].quantity_active).toBe(1);
});

test('two separate legacy entries of the same card type receive independent temporary keys', () => {
  const cards = expandEventCardInstances([
    {
      ...positiveCard(14),
      position_in_game: 'hand_player-1',
    },
    {
      ...positiveCard(14),
      position_in_game: 'hand_player-1',
    },
  ]);

  expect(cards).toHaveLength(2);
  expect(cards.map((card, index) => getEventCardInstanceKey(card, index))).toEqual([
    'ev_card_duplicate_test__legacy_1',
    'ev_card_duplicate_test__legacy_2',
  ]);
  expect(cards.every(card => card.quantity_active === 1)).toBe(true);
});

test('one duplicate copy can be used while the other is kept and only the kept copy remains', () => {
  let state = awardEventCardById(makeBaseState(), 'player-1', 'ev_card_duplicate_test');
  state = awardEventCardById(state, 'player-1', 'ev_card_duplicate_test');

  const [useCard, keepCard] = state.players[0].eventCards;
  state = {
    ...state,
    phase: 'personal_events',
    eventCardPhase: { 'player-1': false },
    playerEventChoices: {},
  };

  const normalized = validateAndNormalizeEventChoice(state, {
    playerId: 'player-1',
    positiveChoices: {
      [useCard.instanceId]: 'use',
      [keepCard.instanceId]: 'keep',
    },
    effectTargets: {},
  });

  expect(normalized.ok).toBe(true);
  expect(normalized.positiveChoices).toEqual({
    [useCard.instanceId]: 'use',
    [keepCard.instanceId]: 'keep',
  });

  const after = applyEventChoicesToGameState({
    ...state,
    eventCardPhase: { 'player-1': true },
    playerEventChoices: {
      'player-1': {
        positiveChoices: normalized.positiveChoices,
        effectTargets: normalized.effectTargets,
      },
    },
  });

  expect(after.players[0].coins).toBe(0);
  expect(after.players[0].eventCards).toHaveLength(1);
  expect(after.players[0].eventCards[0].instanceId).toBe(keepCard.instanceId);
  expect(after.players[0].eventCards[0].id).toBe('ev_card_duplicate_test');
});
