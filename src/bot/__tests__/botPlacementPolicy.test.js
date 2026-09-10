import { placeTraderAction } from '../../game/actions';
import { gameReducer } from '../../game/reducer';
import { prepareAuthoritativeGameAction } from '../../game/hostActionPreparation';
import { validatePlaceTrader } from '../../game/placeTraderRules';
import { buildLearningDecision } from '../../learning/buildLearningDecision';
import { buildPlayerObservation } from '../observation/buildPlayerObservation';
import { decideWithPolicy } from '../decisions/PolicyDecisionProvider';

function makeEventCards() {
  return [
    {
      id: 'event-a',
      title: { en: 'Event A' },
      position_in_game: 'deck',
      quantity_active: 2,
      fortune: 'positive',
    },
  ];
}

function makeTrader(overrides = {}) {
  return {
    traderId: 't1',
    sector_favorite: { en: 'Fruits' },
    location: null,
    ...overrides,
  };
}

function makeProducts() {
  return [
    {
      productId: 1,
      productName: { en: 'Apples' },
      product_sector: 'fruits',
      sector: 'fruits',
      legality: 'legal',
      sellingPrice: 4,
      profit: 2,
      quantity_player_card: 2,
    },
    {
      productId: 2,
      productName: { en: 'Zucchini' },
      product_sector: 'vegetables',
      sector: 'vegetables',
      legality: 'legal',
      sellingPrice: 6,
      profit: 3,
      quantity_player_card: 1,
    },
    {
      productId: 19,
      productName: { en: 'Contraband' },
      product_sector: 'other',
      sector: 'other',
      legality: 'illegal',
      sellingPrice: 9,
      profit: 5,
      quantity_player_card: 2,
    },
  ];
}

function makeState({ profile = 'balanced', products = makeProducts(), extraPlayers = [] } = {}) {
  return {
    gameId: 'GAME-20260910-PLACEMENT01',
    phase: 'trader_selection',
    round: 1,
    currentTurnUserId: 'peer-bot',
    sectors: ['Fruits', 'Vegetables', 'Dairy', 'Meat', 'Fish', 'Household goods'],
    players: [
      {
        user_id: 'peer-human',
        name: 'Private Human',
        coins: 10,
        traders: [],
        products: [],
        eventCards: [],
        isBot: false,
      },
      {
        user_id: 'peer-bot',
        name: 'Private Bot',
        coins: 10,
        traders: [makeTrader()],
        tradersCount: 1,
        products,
        eventCards: [],
        isBot: true,
        botPolicyVersion: 'policy-v008',
        botBehaviorProfile: profile,
      },
      ...extraPlayers,
    ],
    traderList: [{ traderId: 't1', taken: true }],
    products: { products: [] },
    eventcards: makeEventCards(),
  };
}

async function decidePlacement(state, profile) {
  return decideWithPolicy(buildPlayerObservation(state, 'peer-bot'), {
    stage: 'placement',
    behaviorProfile: profile,
  });
}

test('PLACE_TRADER reducer moves owned goods, places trader and awards host-selected event', () => {
  const state = makeState();
  const action = placeTraderAction({
    playerId: 'peer-bot',
    traderId: 't1',
    sector: 'Fruits',
    productIds: [1, 1, 19],
  });
  const authoritativeAction = {
    ...action,
    payload: {
      ...action.payload,
      eventCardId: 'event-a',
    },
  };
  const nextState = gameReducer(state, authoritativeAction);
  const player = nextState.players[1];
  const trader = player.traders[0];

  expect(nextState).not.toBe(state);
  expect(trader.location).toBe('Fruits');
  expect(trader.goods.map(product => product.productId)).toEqual([1, 1, 19]);
  expect(player.products.map(product => product.productId)).toEqual([2, 19]);
  expect(player.products.find(product => product.productId === 19).quantity_player_card).toBe(1);
  expect(player.sectorsWithTraders).toEqual(['Fruits']);
  expect(player.eventCards).toHaveLength(1);
  expect(player.eventCards[0].id).toBe('event-a');
  expect(nextState.eventcards[0].quantity_active).toBe(1);
});

test('PLACE_TRADER is free even when the player owns multiple traders and has zero coins', () => {
  const state = makeState();
  const zeroCoinState = {
    ...state,
    players: state.players.map(player =>
      player.user_id === 'peer-bot'
        ? {
            ...player,
            coins: 0,
            traders: [makeTrader(), makeTrader({ traderId: 't2' })],
            tradersCount: 2,
          }
        : player
    ),
  };
  const action = placeTraderAction({
    playerId: 'peer-bot',
    traderId: 't1',
    sector: 'Fruits',
    productIds: [1],
  });

  expect(validatePlaceTrader(zeroCoinState, action.payload).ok).toBe(true);

  const nextState = gameReducer(zeroCoinState, action);

  expect(nextState).not.toBe(zeroCoinState);
  expect(nextState.players[1].coins).toBe(0);
  expect(nextState.players[1].traders[0].location).toBe('Fruits');
});

test('PLACE_TRADER rejects more than three goods and legal goods from a wrong sector', () => {
  const state = makeState();
  const tooMany = placeTraderAction({
    playerId: 'peer-bot',
    traderId: 't1',
    sector: 'Fruits',
    productIds: [1, 1, 19, 19],
  });
  const wrongSector = placeTraderAction({
    playerId: 'peer-bot',
    traderId: 't1',
    sector: 'Fruits',
    productIds: [2],
  });

  expect(validatePlaceTrader(state, tooMany.payload).reason).toBe('too_many_products');
  expect(gameReducer(state, tooMany)).toBe(state);
  expect(validatePlaceTrader(state, wrongSector.payload).reason).toBe('product_sector_mismatch');
  expect(gameReducer(state, wrongSector)).toBe(state);
});

test('Household goods sector accepts household product normalization', () => {
  const state = makeState({
    products: [
      {
        productId: 16,
        product_sector: 'household',
        sector: 'household',
        legality: 'legal',
        quantity_player_card: 1,
      },
    ],
  });
  const action = placeTraderAction({
    playerId: 'peer-bot',
    traderId: 't1',
    sector: 'Household goods',
    productIds: [16],
  });

  expect(validatePlaceTrader(state, action.payload).ok).toBe(true);
});

test('host preparation overwrites spoofed identity and chooses the event card itself', () => {
  const state = makeState();
  const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
  const incoming = {
    type: 'PLACE_TRADER',
    payload: {
      playerId: 'spoofed-player',
      traderId: 't1',
      sector: 'Fruits',
      productIds: [1],
      eventCardId: 'spoofed-event',
    },
  };

  const prepared = prepareAuthoritativeGameAction(state, incoming, 'peer-bot');

  expect(prepared.payload.playerId).toBe('peer-bot');
  expect(prepared.payload.eventCardId).toBe('event-a');

  randomSpy.mockRestore();
});

test('placement profiles make distinct deterministic goods choices', async () => {
  const balanced = await decidePlacement(makeState({ profile: 'balanced' }), 'balanced');
  const saver = await decidePlacement(makeState({ profile: 'saver' }), 'saver');
  const specialist = await decidePlacement(makeState({ profile: 'specialist' }), 'specialist');
  const smuggler = await decidePlacement(makeState({ profile: 'smuggler' }), 'smuggler');

  expect(balanced.type).toBe('place_trader');
  expect(balanced.productIds.length).toBeLessThanOrEqual(2);
  expect(saver.productIds).toHaveLength(1);
  expect(saver.productIds[0]).not.toBe(19);
  expect(specialist.productIds.every(productId => productId === 1)).toBe(true);
  expect(smuggler.productIds.length).toBeGreaterThan(0);
  expect(smuggler.productIds.every(productId => productId === 19)).toBe(true);
});

test('PLACE_TRADER learning sample is compact and identity-free', () => {
  const state = makeState({ profile: 'smuggler' });
  const action = {
    ...placeTraderAction({
      playerId: 'peer-bot',
      traderId: 't1',
      sector: 'Fruits',
      productIds: [19],
    }),
    payload: {
      ...placeTraderAction({
        playerId: 'peer-bot',
        traderId: 't1',
        sector: 'Fruits',
        productIds: [19],
      }).payload,
      eventCardId: 'event-a',
    },
  };
  const nextState = gameReducer(state, action);
  const sample = buildLearningDecision({
    beforeState: state,
    afterState: nextState,
    action,
    actorId: 'peer-bot',
    appVersion: { version: 'test', gitCommit: 'abc123' },
  });

  expect(sample.schemaVersion).toBe(4);
  expect(sample.policyVersion).toBe('policy-v008');
  expect(sample.behaviorProfile).toBe('smuggler');
  expect(sample.selectedAction).toEqual({
    type: 'PLACE_TRADER',
    traderId: 't1',
    sector: 'Fruits',
    productIds: [19],
  });
  expect(sample.legalActions[0]).toHaveProperty('eligibleProducts');

  const serialized = JSON.stringify(sample);

  expect(serialized).not.toContain('Private Human');
  expect(serialized).not.toContain('Private Bot');
  expect(serialized).not.toContain('peer-human');
  expect(serialized).not.toContain('peer-bot');
});

test('placement policy can place every owned trader before ending the turn', async () => {
  let state = makeState({ products: [] });
  state = {
    ...state,
    players: state.players.map(player =>
      player.user_id === 'peer-bot'
        ? {
            ...player,
            coins: 20,
            tradersCount: 2,
            traders: [
              makeTrader({ traderId: 't1', sector_favorite: { en: 'Fruits' } }),
              makeTrader({ traderId: 't2', sector_favorite: { en: 'Meat' } }),
            ],
          }
        : player
    ),
  };

  const first = await decidePlacement(state, 'balanced');
  expect(first?.type).toBe('place_trader');

  state = gameReducer(
    state,
    placeTraderAction({
      playerId: 'peer-bot',
      traderId: first.traderId,
      sector: first.sector,
      productIds: first.productIds,
    })
  );
  expect(state.players[1].coins).toBe(20);

  const second = await decidePlacement(state, 'balanced');
  expect(second?.type).toBe('place_trader');
  expect(second.traderId).not.toBe(first.traderId);

  state = gameReducer(
    state,
    placeTraderAction({
      playerId: 'peer-bot',
      traderId: second.traderId,
      sector: second.sector,
      productIds: second.productIds,
    })
  );

  expect(state.players[1].coins).toBe(20);
  expect(state.players[1].traders.every(trader => !!trader.location)).toBe(true);
  expect(await decidePlacement(state, 'balanced')).toBeNull();
});
