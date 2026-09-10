import fullEventDeck from '../../data/eventcards.json';
import { applyEventChoicesToGameState } from '../../logic/logic';

const EXPECTED_CARD_IDS = [
  'ev_card_fntr',
  'ev_card_mkt',
  'ev_card_pstr',
  'ev_card_ses',
  'ev_card_ff',
  'ev_card_lpo',
  'ev_card_bgg',
  'ev_card_add',
  'ev_card_pst',
  'ev_card_up',
  'ev_card_rc',
  'ev_card_tabp',
  'ev_card_prtrs',
];

function getCard(cardId) {
  const card = fullEventDeck.find(item => item.id === cardId);
  if (!card) {
    throw new Error(`Missing event card ${cardId}`);
  }
  return JSON.parse(JSON.stringify(card));
}

function makeTrader(traderId, location, sellingPrice = 10, overrides = {}) {
  return {
    traderId,
    name: { en: traderId, ru: traderId },
    location,
    card_in_game: `sector_${location}_user_owner`,
    goods: [
      {
        productId: `${traderId}-good`,
        productName: { en: 'Test good', ru: 'Тестовый товар' },
        sector: String(location || '').toLowerCase(),
        legality: 'legal',
        sellingPrice,
        wholesalePrice: 2,
        quantity_player_card: 1,
      },
    ],
    ...overrides,
  };
}

function makeState({ actorCard, actorChoice = null, target = {}, actorTraders, victimTraders }) {
  const actor = {
    user_id: 'actor',
    name: 'Actor',
    coins: 20,
    traders:
      actorTraders || [makeTrader('actor-trader', 'Vegetables', 10)],
    products: [],
    eventCards: [actorCard],
    sectorsWithTraders: ['Vegetables'],
  };
  const victim = {
    user_id: 'victim',
    name: 'Victim',
    coins: 20,
    traders:
      victimTraders || [makeTrader('victim-trader', 'Meat', 10)],
    products: [],
    eventCards: [],
    sectorsWithTraders: ['Meat'],
  };

  return {
    gameId: 'GAME-FULL-EVENT-DECK-TEST',
    round: 2,
    players: [actor, victim],
    playerEventChoices: {
      actor: {
        positiveChoices:
          actorChoice === null ? {} : { [actorCard.id]: actorChoice },
        effectTargets: { [actorCard.id]: target },
      },
      victim: { positiveChoices: {}, effectTargets: {} },
    },
    eventResultLog: {},
  };
}

test('full test deck exposes all 13 planned event-card types', () => {
  expect(fullEventDeck).toHaveLength(13);
  expect(fullEventDeck.map(card => card.id)).toEqual(EXPECTED_CARD_IDS);
  expect(fullEventDeck.filter(card => card.fortune === 'negative')).toHaveLength(9);
  expect(fullEventDeck.filter(card => card.fortune === 'positive')).toHaveLength(4);
  expect(fullEventDeck.every(card => Number(card.quantity_active) > 0)).toBe(true);
});

test.each(['ev_card_mkt', 'ev_card_ses', 'ev_card_ff'])(
  '%s charges the configured fine per unprotected trader without confiscation',
  cardId => {
    const card = getCard(cardId);
    const state = makeState({
      actorCard: card,
      target: { sector: 'Meat' },
    });
    const next = applyEventChoicesToGameState(state);
    const victim = next.players.find(player => player.user_id === 'victim');

    expect(victim.coins).toBe(18);
    expect(victim.traders[0].location).toBe('Meat');
    expect(victim.traders[0].goods).toHaveLength(1);
  }
);

test.each(['ev_card_fntr', 'ev_card_pstr', 'ev_card_lpo'])(
  '%s confiscates an unprotected trader goods, returns trader to hand and applies its fine',
  cardId => {
    const card = getCard(cardId);
    const configuredFine = Number(card.effect.find(effect => effect.fine)?.fine?.[0] || 0);
    const state = makeState({
      actorCard: card,
      target: { sector: 'Meat' },
    });
    const next = applyEventChoicesToGameState(state);
    const victim = next.players.find(player => player.user_id === 'victim');

    expect(victim.coins).toBe(20 - configuredFine);
    expect(victim.traders[0].location).toBeNull();
    expect(victim.traders[0].goods).toEqual([]);
    expect(victim.traders[0].trader_action).toBe('hold');
  }
);

test.each([
  ['ev_card_bgg', 1],
  ['ev_card_add', 1],
  ['ev_card_pst', 2],
])('%s reduces selling prices in the targeted sector by %i', (cardId, delta) => {
  const card = getCard(cardId);
  const state = makeState({
    actorCard: card,
    target: { sector: 'Meat' },
  });
  const next = applyEventChoicesToGameState(state);
  const victim = next.players.find(player => player.user_id === 'victim');

  expect(victim.traders[0].goods[0].sellingPrice).toBe(10 - delta);
  expect(victim.coins).toBe(20);
});

test('Underworld Protection protects the selected own trader', () => {
  const card = getCard('ev_card_up');
  const state = makeState({
    actorCard: card,
    actorChoice: 'use',
    target: { traderId: 'actor-trader' },
  });
  const next = applyEventChoicesToGameState(state);
  const actor = next.players.find(player => player.user_id === 'actor');

  expect(actor.traders[0].Illigal_protection).toBe(true);
  expect(actor.traders[0].illegal_protection).toBe(true);
  expect(actor.traders[0].trader_action).toBe('free');
  expect(actor.eventCards).toEqual([]);
});

test('Regular Customer adds +2 selling price to goods of the selected trader', () => {
  const card = getCard('ev_card_rc');
  const state = makeState({
    actorCard: card,
    actorChoice: 'use',
    target: { traderId: 'actor-trader' },
  });
  const next = applyEventChoicesToGameState(state);
  const actor = next.players.find(player => player.user_id === 'actor');

  expect(actor.traders[0].goods[0].sellingPrice).toBe(12);
  expect(actor.eventCards).toEqual([]);
});

test('Transport adds +1 selling price to goods of every own trader', () => {
  const card = getCard('ev_card_tabp');
  const actorTraders = [
    makeTrader('actor-a', 'Vegetables', 10),
    makeTrader('actor-b', 'Meat', 7),
  ];
  const state = makeState({
    actorCard: card,
    actorChoice: 'use',
    target: { traderId: 'actor-a' },
    actorTraders,
  });
  const next = applyEventChoicesToGameState(state);
  const actor = next.players.find(player => player.user_id === 'actor');

  expect(actor.traders[0].goods[0].sellingPrice).toBe(11);
  expect(actor.traders[1].goods[0].sellingPrice).toBe(8);
  expect(actor.eventCards).toEqual([]);
});

test('Porters adds one cloned good to an own placed trader with goods', () => {
  const card = getCard('ev_card_prtrs');
  const state = makeState({
    actorCard: card,
    actorChoice: 'use',
    target: { traderId: 'actor-trader' },
  });
  const next = applyEventChoicesToGameState(state);
  const actor = next.players.find(player => player.user_id === 'actor');

  expect(actor.traders[0].goods).toHaveLength(2);
  expect(actor.traders[0].goods[1].productId).toBe('actor-trader-good');
  expect(actor.eventCards).toEqual([]);
});

test('Underworld Protection prevents inspection cards from confiscating or fining protected traders', () => {
  const police = getCard('ev_card_fntr');
  const protectedTrader = makeTrader('victim-protected', 'Meat', 10, {
    Illigal_protection: true,
    illegal_protection: true,
  });
  const state = makeState({
    actorCard: police,
    target: { sector: 'Meat' },
    victimTraders: [protectedTrader],
  });
  const next = applyEventChoicesToGameState(state);
  const victim = next.players.find(player => player.user_id === 'victim');

  expect(victim.coins).toBe(20);
  expect(victim.traders[0].location).toBe('Meat');
  expect(victim.traders[0].goods).toHaveLength(1);
});
