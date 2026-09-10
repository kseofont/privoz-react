import { buildPlayerObservation } from '../observation/buildPlayerObservation';
import { decideWithPolicy } from '../decisions/PolicyDecisionProvider';
import { botDecisionToAction } from '../actions/botDecisionToAction';
import { gameReducer } from '../../game/reducer';
import { buildLearningDecision } from '../../learning/buildLearningDecision';

function makeState() {
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
        isBot: false,
      },
      {
        user_id: 'peer-bot',
        name: 'Secret Bot Name',
        coins: 10,
        traders: [],
        isBot: true,
        botPolicyVersion: 'policy-v001',
      },
    ],
    traderList: [
      { traderId: 't1', taken: false },
      { traderId: 't2', taken: false },
    ],
  };
}

test('bot uses normal SELECT_TRADER action and reducer flow', async () => {
  const state = makeState();
  const observation = buildPlayerObservation(state, 'peer-bot');
  const decision = await decideWithPolicy(observation);
  const action = botDecisionToAction(decision, 'peer-bot');
  const nextState = gameReducer(state, action);

  expect(decision).toEqual({
    type: 'select_trader',
    traderId: 't1',
    policyVersion: 'policy-v001',
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

  expect(sample.eventId).toBe('LE-1-1-0-t1');
  expect(sample.actorType).toBe('bot');
  expect(sample.policyVersion).toBe('policy-v001');
  expect(sample.legalActions).toHaveLength(2);

  const serialized = JSON.stringify(sample);

  expect(serialized).not.toContain('Alice');
  expect(serialized).not.toContain('Secret Bot Name');
  expect(serialized).not.toContain('peer-human');
  expect(serialized).not.toContain('peer-bot');
});
