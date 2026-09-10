import { buildPlayerObservation } from '../observation/buildPlayerObservation';
import { decideWithPolicy } from '../decisions/PolicyDecisionProvider';
import { botDecisionToAction } from '../actions/botDecisionToAction';
import { gameReducer } from '../../game/reducer';
import { buildLearningDecision } from '../../learning/buildLearningDecision';

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

function makeState(overrides = {}) {
  return {
    gameId: 'GAME-20260910-ABCDEFGHIJKL',
    phase: 'trader_selection',
    round: 1,
    currentTurnUserId: 'peer-bot',
    players: [
      {
        user_id: 'peer-human',
        name: 'Alice',
        coins: 10,
        traders: [],
        products: [],
        isBot: false,
      },
      {
        user_id: 'peer-bot',
        name: 'Secret Bot Name',
        coins: 10,
        traders: [],
        products: [],
        isBot: true,
        botPolicyVersion: 'policy-v004',
        botBehaviorProfile: 'balanced',
      },
    ],
    traderList: [
      { traderId: 't1', taken: false },
      { traderId: 't2', taken: false },
    ],
    products: makeProducts(),
    ...overrides,
  };
}

test('bot uses normal SELECT_TRADER action and reducer flow', async () => {
  const state = makeState();
  const observation = buildPlayerObservation(state, 'peer-bot');
  const decision = await decideWithPolicy(observation, { stage: 'trader' });
  const action = botDecisionToAction(decision, 'peer-bot');
  const nextState = gameReducer(state, action);

  expect(decision).toEqual({
    type: 'select_trader',
    traderId: 't1',
    policyVersion: 'policy-v004',
  });
  expect(action.type).toBe('SELECT_TRADER');
  expect(nextState).not.toBe(state);
  expect(nextState.players[1].traders[0].traderId).toBe('t1');
});

test('learning sample contains gameplay data but no player identity', () => {
  const state = makeState();
  const action = {
    type: 'SELECT_TRADER',
    payload: {
      playerId: 'peer-bot',
      traderId: 't1',
    },
  };
  const nextState = gameReducer(state, action);
  const sample = buildLearningDecision({
    beforeState: state,
    afterState: nextState,
    action,
    actorId: 'peer-bot',
    appVersion: {
      version: 'test',
      gitCommit: 'abc123',
    },
  });

  expect(sample.eventId).toBe('LE-TRADER-1-1-0-t1');
  expect(sample.actorType).toBe('bot');
  expect(sample.policyVersion).toBe('policy-v004');
  expect(sample.behaviorProfile).toBe('balanced');
  expect(sample.legalActions).toHaveLength(2);

  const serialized = JSON.stringify(sample);

  expect(serialized).not.toContain('Alice');
  expect(serialized).not.toContain('Secret Bot Name');
  expect(serialized).not.toContain('peer-human');
  expect(serialized).not.toContain('peer-bot');
});
