import { botDecisionToAction } from '../actions/botDecisionToAction';
import { buildPlayerObservation } from '../observation/buildPlayerObservation';
import { decideWithPolicy } from '../decisions/PolicyDecisionProvider';
import { endTurnAction } from '../../game/actions';
import { applyHostGameAction } from '../../game/hostActionHandler';
import { prepareAuthoritativeGameAction } from '../../game/hostActionPreparation';
import { deriveSectorsWithTraders, syncPlayerSectorsWithTraders } from '../../game/playerDerivedState';
import { gameReducer } from '../../game/reducer';

function makeState(overrides = {}) {
  return {
    gameId: 'GAME-20260910-ENDTURN01',
    phase: 'trader_selection',
    round: 1,
    currentTurnUserId: 'peer-bot',
    players: [
      {
        user_id: 'peer-human',
        name: 'Human',
        coins: 10,
        traders: [],
        products: [],
        isBot: false,
      },
      {
        user_id: 'peer-bot',
        name: 'Bot',
        coins: 2,
        traders: [
          {
            traderId: 't1',
            location: 'Meat',
            goods: [],
          },
        ],
        products: [],
        isBot: true,
        botPolicyVersion: 'policy-v008',
        botBehaviorProfile: 'balanced',
      },
      {
        user_id: 'peer-next',
        name: 'Next',
        coins: 10,
        traders: [],
        products: [],
        isBot: true,
        botPolicyVersion: 'policy-v008',
        botBehaviorProfile: 'smuggler',
      },
    ],
    traderList: [],
    products: { products: [] },
    ...overrides,
  };
}

test('END_TURN reducer advances only the authoritative current player', () => {
  const state = makeState();
  const rejected = gameReducer(state, endTurnAction({ playerId: 'peer-human' }));
  const nextState = gameReducer(state, endTurnAction({ playerId: 'peer-bot' }));

  expect(rejected).toBe(state);
  expect(nextState).not.toBe(state);
  expect(nextState.currentTurnUserId).toBe('peer-next');
  expect(nextState.round).toBe(1);
  expect(nextState.phase).toBe('trader_selection');
  expect(nextState.waitingForHost).toBe(false);
});

test('host preparation overwrites spoofed END_TURN player identity', () => {
  const state = makeState();
  const prepared = prepareAuthoritativeGameAction(
    state,
    endTurnAction({ playerId: 'spoofed-player' }),
    'peer-bot'
  );

  expect(prepared.payload.playerId).toBe('peer-bot');
});

test('host local END_TURN uses the same authoritative apply/broadcast path', () => {
  let state = makeState();
  const sent = [];
  const connectionsRef = {
    current: [
      {
        open: true,
        peer: 'peer-bot',
        send: message => sent.push(message),
      },
      {
        open: true,
        peer: 'peer-next',
        send: message => sent.push(message),
      },
    ],
  };
  const setGameState = updater => {
    state = updater(state);
  };

  applyHostGameAction({
    connectionsRef,
    setGameState,
    action: endTurnAction({ playerId: 'spoofed-host-id' }),
    actorId: 'peer-bot',
  });

  expect(state.currentTurnUserId).toBe('peer-next');
  expect(sent).toHaveLength(2);
  expect(sent.every(message => message.type === 'gameState')).toBe(true);
  expect(sent.every(message => message.gameState.currentTurnUserId === 'peer-next')).toBe(true);
});

test('policy-v008 produces a normal END_TURN action after bot turn work is complete', async () => {
  const state = makeState();
  const observation = buildPlayerObservation(state, 'peer-bot');
  const decision = await decideWithPolicy(observation, {
    stage: 'end_turn',
    behaviorProfile: 'balanced',
  });
  const action = botDecisionToAction(decision, 'peer-bot');

  expect(decision).toEqual({
    type: 'end_turn',
    policyVersion: 'policy-v008',
  });
  expect(action).toEqual(endTurnAction({ playerId: 'peer-bot' }));
});

test('derived sectors are cleared when the last placed trader returns to hand', () => {
  const player = {
    user_id: 'peer-bot',
    sectorsWithTraders: ['Dairy'],
    traders: [
      { traderId: 't1', location: 'Dairy' },
      { traderId: 't2', location: null },
    ],
  };
  const returnedTraders = player.traders.map(trader =>
    trader.traderId === 't1' ? { ...trader, location: null, card_in_game: 'peer-bot_hand' } : trader
  );
  const synced = syncPlayerSectorsWithTraders(player, returnedTraders);

  expect(deriveSectorsWithTraders(returnedTraders)).toEqual([]);
  expect(synced.sectorsWithTraders).toEqual([]);
});
