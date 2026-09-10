import { PHASES } from '../phases';
import { settleRound } from '../roundEnd';
import { buildGameOutcome } from '../gameOutcome';
import { buildLearningOutcome } from '../../learning/buildLearningOutcome';

function makeState(round = 7, overrides = {}) {
  return {
    gameId: 'GAME-20260910-OUTCOME01',
    phase: PHASES.ROUND_END,
    round,
    currentTurnUserId: 'peer-human-secret',
    players: [
      {
        user_id: 'peer-human-secret',
        name: 'Private Human',
        coins: 10,
        isBot: false,
        sectorsWithTraders: ['Vegetables'],
        traders: [
          {
            traderId: 't-human',
            location: 'Vegetables',
            card_in_game: 'sector_Vegetables_user_peer-human-secret',
            goods: [
              {
                productId: 1,
                quantity_player_card: 1,
                sellingPrice: 5,
              },
            ],
          },
        ],
      },
      {
        user_id: 'peer-bot-secret',
        name: 'Private Bot',
        coins: 12,
        isBot: true,
        botPolicyVersion: 'policy-v005',
        botBehaviorProfile: 'balanced',
        sectorsWithTraders: ['Meat'],
        traders: [
          {
            traderId: 't-bot',
            location: 'Meat',
            card_in_game: 'sector_Meat_user_peer-bot-secret',
            goods: [
              {
                productId: 13,
                quantity_player_card: 1,
                sellingPrice: 2,
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

test('round 6 settlement advances to round 7 instead of ending the game', () => {
  const nextState = settleRound(makeState(6));

  expect(nextState.round).toBe(7);
  expect(nextState.phase).toBe(PHASES.TRADER_SELECTION);
  expect(nextState.gameOutcome).toBeUndefined();
});

test('round 7 settlement sells goods first and then ends with highest-coins winner', () => {
  const nextState = settleRound(makeState(7));

  expect(nextState.round).toBe(7);
  expect(nextState.phase).toBe(PHASES.GAME_END);
  expect(nextState.currentTurnUserId).toBeNull();
  expect(nextState.players[0].coins).toBe(15);
  expect(nextState.players[1].coins).toBe(14);
  expect(nextState.players.every(player => player.sectorsWithTraders.length === 0)).toBe(true);
  expect(nextState.gameOutcome.maxCoins).toBe(15);
  expect(nextState.gameOutcome.winnerActorIndexes).toEqual([0]);
  expect(nextState.gameOutcome.ranking[0]).toMatchObject({
    actorIndex: 0,
    actorType: 'human',
    coins: 15,
    place: 1,
    isWinner: true,
  });
});

test('equal highest balances produce co-winners without inventing a tie-break rule', () => {
  const state = makeState(14, {
    players: [
      { user_id: 'a', name: 'A', coins: 20, isBot: false, traders: [] },
      {
        user_id: 'b',
        name: 'B',
        coins: 20,
        isBot: true,
        botPolicyVersion: 'policy-v005',
        botBehaviorProfile: 'smuggler',
        traders: [],
      },
      { user_id: 'c', name: 'C', coins: 10, isBot: false, traders: [] },
    ],
  });

  const outcome = buildGameOutcome(state);

  expect(outcome.winnerActorIndexes).toEqual([0, 1]);
  expect(outcome.ranking.map(entry => entry.place)).toEqual([1, 1, 3]);
});

test('learning outcome contains final strategy metadata but no player identity', () => {
  const finalState = settleRound(makeState(7));
  const record = buildLearningOutcome(finalState, {
    version: 'test',
    gitCommit: 'abc123',
  });
  const serialized = JSON.stringify(record);

  expect(record.recordType).toBe('outcome');
  expect(record.eventId).toBe('LE-OUTCOME-7');
  expect(record.outcome.completedRound).toBe(7);
  expect(record.outcome.ranking[1]).toMatchObject({
    actorIndex: 1,
    actorType: 'bot',
    policyVersion: 'policy-v005',
    behaviorProfile: 'balanced',
  });
  expect(serialized).not.toContain('Private Human');
  expect(serialized).not.toContain('Private Bot');
  expect(serialized).not.toContain('peer-human-secret');
  expect(serialized).not.toContain('peer-bot-secret');
});
