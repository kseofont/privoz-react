import { persistDebugTransition, readDebugHistories } from '../debugHistoryStorage';

beforeEach(() => {
  window.sessionStorage.clear();
});

test('persists an accepted wholesale purchase synchronously', () => {
  const before = {
    gameId: 'GAME-TEST-12345678',
    round: 2,
    phase: 'trader_selection',
    currentTurnUserId: 'p1',
    players: [
      { user_id: 'p1', name: 'One', coins: 8, products: [], traders: [], eventCards: [] },
    ],
  };
  const after = JSON.parse(JSON.stringify(before));
  after.players[0].coins = 1;
  after.players[0].products = [
    {
      productId: 16,
      productName: { en: 'Gloves', ru: 'Перчатки' },
      quantity_player_card: 1,
      wholesalePrice: 7,
      sellingPrice: 12,
      sector: 'household',
    },
  ];

  persistDebugTransition({ beforeState: before, afterState: after });

  const stored = readDebugHistories(before.gameId);
  expect(stored.coins.p1).toHaveLength(1);
  expect(stored.coins.p1[0]).toMatchObject({ before: 8, after: 1, delta: -7, reasonType: 'product_purchase' });
  expect(stored.coins.p1[0].context.products[0]).toMatchObject({ productId: 16, quantity: 1, wholesalePrice: 7 });
});

test('does not duplicate a transition when it is observed twice', () => {
  const before = {
    gameId: 'GAME-TEST-12345678',
    round: 2,
    phase: 'trader_selection',
    currentTurnUserId: 'p1',
    players: [
      { user_id: 'p1', name: 'One', coins: 8, products: [], traders: [], eventCards: [] },
    ],
  };
  const after = JSON.parse(JSON.stringify(before));
  after.players[0].coins = 1;
  after.players[0].products = [
    { productId: 16, productName: { en: 'Gloves' }, quantity_player_card: 1, wholesalePrice: 7 },
  ];

  persistDebugTransition({ beforeState: before, afterState: after });
  persistDebugTransition({ beforeState: before, afterState: after });

  expect(readDebugHistories(before.gameId).coins.p1).toHaveLength(1);
});
