import { buyProductAction } from '../../game/actions';
import { gameReducer } from '../../game/reducer';
import { buildLearningDecision } from '../../learning/buildLearningDecision';
import { buildPlayerObservation } from '../observation/buildPlayerObservation';
import { decideWithPolicy } from '../decisions/PolicyDecisionProvider';

function makeProducts() {
  return {
    products: [
      {
        productId: 1,
        wholesalePrice: 2,
        sellingPrice: 4,
        profit: 2,
        product_sector: 'fruits',
        legality: 'legal',
        quantity_free_card: 10,
      },
      {
        productId: 2,
        wholesalePrice: 3,
        sellingPrice: 6,
        profit: 3,
        product_sector: 'vegetables',
        legality: 'legal',
        quantity_free_card: 10,
      },
      {
        productId: 19,
        wholesalePrice: 4,
        sellingPrice: 9,
        profit: 5,
        product_sector: 'illegal',
        legality: 'illegal',
        quantity_free_card: 10,
      },
      {
        productId: 20,
        wholesalePrice: 5,
        sellingPrice: 12,
        profit: 7,
        product_sector: 'illegal',
        legality: 'illegal',
        quantity_free_card: 10,
      },
    ],
  };
}

function makeState({ coins = 10, products = [], behaviorProfile = 'balanced' } = {}) {
  return {
    gameId: 'GAME-20260910-WHOLESALE01',
    phase: 'trader_selection',
    round: 1,
    currentTurnUserId: 'peer-bot',
    players: [
      {
        user_id: 'peer-human',
        name: 'Human Name',
        coins: 10,
        traders: [],
        products: [],
        isBot: false,
      },
      {
        user_id: 'peer-bot',
        name: 'Bot Name',
        coins,
        traders: [{ traderId: 't1' }],
        products,
        isBot: true,
        botPolicyVersion: 'policy-v007',
        botBehaviorProfile: behaviorProfile,
      },
    ],
    traderList: [{ traderId: 't1', taken: true }],
    products: makeProducts(),
  };
}

async function decideProduct(state, profile) {
  const observation = buildPlayerObservation(state, 'peer-bot');

  return decideWithPolicy(observation, {
    stage: 'wholesale',
    behaviorProfile: profile,
  });
}

test('BUY_PRODUCT reducer applies the same authoritative purchase for a player', () => {
  const state = makeState();
  const action = buyProductAction({ playerId: 'peer-bot', productId: 2 });
  const nextState = gameReducer(state, action);

  expect(nextState).not.toBe(state);
  expect(nextState.players[1].coins).toBe(7);
  expect(nextState.players[1].products).toHaveLength(1);
  expect(nextState.players[1].products[0].productId).toBe(2);
  expect(nextState.players[1].products[0].quantity_player_card).toBe(1);
  expect(nextState.products.products[1].quantity_free_card).toBe(9);
});

test('all_in prefers spending and can continue until no money remains', async () => {
  let state = makeState({ behaviorProfile: 'all_in' });

  const first = await decideProduct(state, 'all_in');
  expect(first.productId).toBe(20);

  state = gameReducer(
    state,
    buyProductAction({ playerId: 'peer-bot', productId: first.productId })
  );

  const second = await decideProduct(state, 'all_in');
  expect(second.productId).toBe(20);

  state = gameReducer(
    state,
    buyProductAction({ playerId: 'peer-bot', productId: second.productId })
  );

  expect(state.players[1].coins).toBe(0);
  expect(await decideProduct(state, 'all_in')).toBeNull();
});

test('saver keeps a five-coin reserve and buys only legal products', async () => {
  let state = makeState({ behaviorProfile: 'saver' });

  const first = await decideProduct(state, 'saver');
  expect(first.productId).toBe(2);

  state = gameReducer(
    state,
    buyProductAction({ playerId: 'peer-bot', productId: first.productId })
  );

  const second = await decideProduct(state, 'saver');
  expect(second.productId).toBe(1);

  state = gameReducer(
    state,
    buyProductAction({ playerId: 'peer-bot', productId: second.productId })
  );

  expect(state.players[1].coins).toBe(5);
  expect(await decideProduct(state, 'saver')).toBeNull();
});

test('specialist prefers a sector already present in its inventory', async () => {
  const state = makeState({
    behaviorProfile: 'specialist',
    products: [
      {
        productId: 1,
        product_sector: 'fruits',
        legality: 'legal',
        quantity_player_card: 1,
      },
    ],
  });

  const decision = await decideProduct(state, 'specialist');

  expect(decision.productId).toBe(1);
});

test('diversifier prefers a sector not already present in its inventory', async () => {
  const state = makeState({
    behaviorProfile: 'diversifier',
    products: [
      {
        productId: 1,
        product_sector: 'fruits',
        legality: 'legal',
        quantity_player_card: 1,
      },
    ],
  });

  const decision = await decideProduct(state, 'diversifier');

  expect(decision.productId).toBe(2);
});

test('smuggler buys only illegal products and keeps its configured reserve', async () => {
  let state = makeState({ behaviorProfile: 'smuggler' });

  const first = await decideProduct(state, 'smuggler');
  expect(first.productId).toBe(20);

  state = gameReducer(
    state,
    buyProductAction({ playerId: 'peer-bot', productId: first.productId })
  );

  const second = await decideProduct(state, 'smuggler');
  expect(second.productId).toBe(19);

  state = gameReducer(
    state,
    buyProductAction({ playerId: 'peer-bot', productId: second.productId })
  );

  expect(state.players[1].coins).toBe(1);
  expect(await decideProduct(state, 'smuggler')).toBeNull();
});

test('BUY_PRODUCT learning sample is compact, attributed to profile and identity-free', () => {
  const state = makeState({ behaviorProfile: 'smuggler' });
  const action = buyProductAction({ playerId: 'peer-bot', productId: 20 });
  const nextState = gameReducer(state, action);
  const sample = buildLearningDecision({
    beforeState: state,
    afterState: nextState,
    action,
    actorId: 'peer-bot',
    appVersion: { version: 'test', gitCommit: 'abc123' },
  });

  expect(sample.actorType).toBe('bot');
  expect(sample.policyVersion).toBe('policy-v007');
  expect(sample.behaviorProfile).toBe('smuggler');
  expect(sample.selectedAction).toEqual({ type: 'BUY_PRODUCT', productId: 20 });
  expect(sample.legalActions).toHaveLength(4);

  const serialized = JSON.stringify(sample);

  expect(serialized).not.toContain('Human Name');
  expect(serialized).not.toContain('Bot Name');
  expect(serialized).not.toContain('peer-human');
  expect(serialized).not.toContain('peer-bot');
});

test('wholesale policy does not reserve coins for free trader placement', async () => {
  let state = makeState({ coins: 25, behaviorProfile: 'all_in' });
  state = {
    ...state,
    players: state.players.map(player =>
      player.user_id === 'peer-bot'
        ? {
            ...player,
            traders: [
              { traderId: 't1', location: null },
              { traderId: 't2', location: null },
            ],
            tradersCount: 2,
          }
        : player
    ),
  };

  const first = await decideProduct(state, 'all_in');
  expect(first.productId).toBe(20);

  state = gameReducer(
    state,
    buyProductAction({ playerId: 'peer-bot', productId: first.productId })
  );

  // Placement is free, so all_in may continue spending the remaining coins.
  expect(state.players[1].coins).toBe(20);
  expect((await decideProduct(state, 'all_in')).productId).toBe(20);
});
