import {
  buildCoinChangeEntries,
  buildEventHistoryEntries,
} from '../gameDebugHistory';

function baseState() {
  return {
    gameId: 'GAME-TEST-12345678',
    round: 2,
    phase: 'trader_selection',
    eventResultNonce: 0,
    players: [
      {
        user_id: 'p1',
        name: 'One',
        coins: 20,
        products: [],
        traders: [],
        eventCards: [],
      },
      {
        user_id: 'p2',
        name: 'Two',
        coins: 10,
        products: [],
        traders: [
          {
            traderId: 't2',
            name: { en: 'Trader Two', ru: 'Продавец Два' },
            location: 'Dairy',
            goods: [],
          },
        ],
        eventCards: [],
      },
    ],
  };
}

test('detects trader acquisition coin change', () => {
  const before = baseState();
  const after = JSON.parse(JSON.stringify(before));
  after.players[0].coins = 5;
  after.players[0].traders.push({ traderId: 't1', name: { en: 'Trader One' } });

  const [entry] = buildCoinChangeEntries(before, after);
  expect(entry.reasonType).toBe('trader_purchase');
  expect(entry.delta).toBe(-15);
  expect(entry.context.traders[0].traderId).toBe('t1');
});

test('detects wholesale purchase and product details', () => {
  const before = baseState();
  const after = JSON.parse(JSON.stringify(before));
  after.players[0].coins = 17;
  after.players[0].products = [
    {
      productId: 2,
      productName: { en: 'Zucchini' },
      quantity_player_card: 1,
      wholesalePrice: 3,
      sellingPrice: 6,
      legality: 'legal',
      sector: 'vegetables',
    },
  ];

  const [entry] = buildCoinChangeEntries(before, after);
  expect(entry.reasonType).toBe('product_purchase');
  expect(entry.context.products[0]).toMatchObject({ productId: 2, quantity: 1 });
});

test('detects round sale and sold goods', () => {
  const before = baseState();
  before.players[0].traders = [
    {
      traderId: 't1',
      name: { en: 'Trader One' },
      location: 'Vegetables',
      goods: [
        {
          productId: 3,
          productName: { en: 'Tomato' },
          quantity_player_card: 2,
          sellingPrice: 9,
        },
      ],
    },
  ];
  const after = JSON.parse(JSON.stringify(before));
  after.round = 3;
  after.players[0].coins = 38;
  after.players[0].traders[0].location = null;
  after.players[0].traders[0].goods = [];

  const [entry] = buildCoinChangeEntries(before, after);
  expect(entry.reasonType).toBe('round_sale');
  expect(entry.delta).toBe(18);
  expect(entry.context.soldGoods[0].total).toBe(18);
});

test('event result has priority when coins change from a card', () => {
  const before = baseState();
  const after = JSON.parse(JSON.stringify(before));
  after.players[1].coins = 5;
  after.eventResultNonce = 1;
  after.eventResultLog = {
    p2: ['Против вас применили «Федеральная полиция». Штраф: 5 монет.'],
  };

  const [entry] = buildCoinChangeEntries(before, after);
  expect(entry.reasonType).toBe('event_effect');
  expect(entry.context.eventMessages).toHaveLength(1);
});

test('captures played event card, target player/sector and exact result log', () => {
  const before = baseState();
  before.phase = 'personal_events';
  before.players[0].eventCards = [
    {
      id: 'ev_card_fntr',
      title: { en: 'Federal Police', ru: 'Федеральная полиция' },
      description: { en: 'Confiscate illegal goods plus a fine.' },
      fortune: 'negative',
      goal_action: 'sector',
      goal_item: 'trader',
      effect: [{ confiscation: true }, { fine: [5] }],
    },
  ];
  before.playerEventChoices = {};

  const afterChoice = JSON.parse(JSON.stringify(before));
  afterChoice.playerEventChoices = {
    p1: {
      positiveChoices: {},
      effectTargets: {
        ev_card_fntr: { sector: 'Dairy' },
      },
    },
  };

  const [choiceEntry] = buildEventHistoryEntries(before, afterChoice);
  expect(choiceEntry.kind).toBe('decision');
  expect(choiceEntry.cards[0].cardId).toBe('ev_card_fntr');
  expect(choiceEntry.cards[0].target).toMatchObject({
    sector: 'Dairy',
    playerId: 'p2',
    playerName: 'Two',
  });

  const afterResult = JSON.parse(JSON.stringify(afterChoice));
  afterResult.playerEventChoices = undefined;
  afterResult.eventResultNonce = 1;
  afterResult.eventResultLog = { p2: ['Exact result'] };
  const resultEntries = buildEventHistoryEntries(afterChoice, afterResult);
  expect(resultEntries.some(entry => entry.kind === 'result' && entry.recipientId === 'p2')).toBe(true);
});

test('captures turn handoff in player activity history', () => {
  const before = baseState();
  before.currentTurnUserId = 'p1';
  const after = JSON.parse(JSON.stringify(before));
  after.currentTurnUserId = 'p2';

  const { buildPlayerActivityEntries } = require('../gameDebugHistory');
  const entries = buildPlayerActivityEntries(before, after);

  expect(entries).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ playerId: 'p1', type: 'turn_ended' }),
      expect.objectContaining({ playerId: 'p2', type: 'turn_started' }),
    ])
  );
});

test('coin diagnostics retain event messages and observed sales together', () => {
  const before = baseState();
  before.players[0].traders = [
    {
      traderId: 't1',
      name: { en: 'Trader One' },
      location: 'Vegetables',
      goods: [
        {
          productId: 3,
          productName: { en: 'Tomato' },
          quantity_player_card: 1,
          sellingPrice: 9,
        },
      ],
    },
  ];
  const after = JSON.parse(JSON.stringify(before));
  after.players[0].coins = 24;
  after.players[0].traders[0].goods = [];
  after.eventResultNonce = 1;
  after.eventResultLog = { p1: ['Event effect also changed this transition.'] };

  const [entry] = buildCoinChangeEntries(before, after);
  expect(entry.reasonType).toBe('event_effect');
  expect(entry.context.eventMessages).toHaveLength(1);
  expect(entry.context.soldGoods).toHaveLength(1);
  expect(entry.context.saleGross).toBe(9);
});
