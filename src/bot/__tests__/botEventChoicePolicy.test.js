import { botDecisionToAction } from '../actions/botDecisionToAction';
import { buildPlayerObservation } from '../observation/buildPlayerObservation';
import { decideWithPolicy } from '../decisions/PolicyDecisionProvider';
import {
  ackEventResultsAction,
  submitEventChoicesAction,
} from '../../game/actions';
import { prepareAuthoritativeGameAction } from '../../game/hostActionPreparation';
import { gameReducer } from '../../game/reducer';
import { buildLearningDecision } from '../../learning/buildLearningDecision';
import { applyEventChoicesToGameState } from '../../logic/logic';

function makeState(overrides = {}) {
  return {
    gameId: 'GAME-20260910-EVENTS01',
    phase: 'personal_events',
    round: 2,
    currentTurnUserId: 'peer-human',
    eventCardPhase: {
      'peer-human': true,
      'peer-bot': false,
      'peer-other': false,
    },
    playerEventChoices: {
      'peer-human': {
        positiveChoices: {},
        effectTargets: {},
      },
    },
    eventResultNonce: 0,
    eventResultLog: {},
    players: [
      {
        user_id: 'peer-human',
        name: 'Private Human',
        coins: 12,
        traders: [
          {
            traderId: 't-human',
            location: 'Vegetables',
            goods: [
              {
                productId: 2,
                sector: 'vegetables',
                legality: 'legal',
                sellingPrice: 6,
                quantity_player_card: 1,
              },
            ],
          },
        ],
        products: [],
        eventCards: [],
        isBot: false,
      },
      {
        user_id: 'peer-bot',
        name: 'Private Bot',
        coins: 10,
        traders: [
          {
            traderId: 't-bot',
            location: 'Meat',
            goods: [
              {
                productId: 13,
                sector: 'meat',
                legality: 'legal',
                sellingPrice: 9,
                quantity_player_card: 1,
              },
            ],
          },
        ],
        products: [],
        eventCards: [
          {
            id: 'ev_card_fntr',
            fortune: 'negative',
            goal_action: 'sector',
            goal_item: 'trader',
            effect: [
              { confiscation: true },
              { fine: [5] },
              { trader_action: 'hold' },
            ],
          },
          {
            id: 'ev_card_prtrs',
            fortune: 'positive',
            goal_action: 'trader',
            goal_item: 'product',
            effect: [{ extra_product: [1] }],
          },
        ],
        isBot: true,
        botPolicyVersion: 'policy-v007',
        botBehaviorProfile: 'balanced',
      },
      {
        user_id: 'peer-other',
        name: 'Private Other',
        coins: 20,
        traders: [
          {
            traderId: 't-vodka',
            location: 'Dairy',
            goods: [
              {
                productId: 22,
                sector: 'other',
                legality: 'illegal',
                sellingPrice: 19,
                quantity_player_card: 1,
              },
            ],
          },
          {
            traderId: 't-fish',
            location: 'Fish',
            goods: [
              {
                productId: 11,
                sector: 'fish',
                legality: 'legal',
                sellingPrice: 9,
                quantity_player_card: 1,
              },
            ],
          },
        ],
        products: [],
        eventCards: [],
        isBot: true,
        botPolicyVersion: 'policy-v007',
        botBehaviorProfile: 'smuggler',
      },
    ],
    traderList: [],
    products: { products: [] },
    eventcards: [],
    ...overrides,
  };
}

test('balanced bot uses Porters now and targets illegal vodka in Dairy with Federal Police', async () => {
  const state = makeState();
  const observation = buildPlayerObservation(state, 'peer-bot');
  const decision = await decideWithPolicy(observation, {
    stage: 'personal_events',
    behaviorProfile: 'balanced',
  });
  const action = botDecisionToAction(decision, 'peer-bot');

  expect(decision).toEqual({
    type: 'submit_event_choices',
    positiveChoices: {
      ev_card_prtrs: 'use',
    },
    effectTargets: {
      ev_card_fntr: { sector: 'Dairy' },
      ev_card_prtrs: { traderId: 't-bot' },
    },
    behaviorProfile: 'balanced',
    policyVersion: 'policy-v007',
  });
  expect(action).toEqual(
    submitEventChoicesAction({
      playerId: 'peer-bot',
      positiveChoices: { ev_card_prtrs: 'use' },
      effectTargets: {
        ev_card_fntr: { sector: 'Dairy' },
        ev_card_prtrs: { traderId: 't-bot' },
      },
    })
  );
});

test('host preparation overwrites event-choice identity and removes invalid targets', () => {
  const state = makeState();
  const incoming = submitEventChoicesAction({
    playerId: 'spoofed-player',
    positiveChoices: { ev_card_prtrs: 'use' },
    effectTargets: {
      ev_card_fntr: { sector: 'Meat' },
      ev_card_prtrs: { traderId: 't-vodka' },
    },
  });

  const prepared = prepareAuthoritativeGameAction(state, incoming, 'peer-bot');

  expect(prepared.payload.playerId).toBe('peer-bot');
  expect(prepared.payload.effectTargets).toEqual({});
});

test('SUBMIT_EVENT_CHOICES marks only the authoritative player complete', () => {
  const state = makeState();
  const incoming = submitEventChoicesAction({
    playerId: 'peer-bot',
    positiveChoices: { ev_card_prtrs: 'use' },
    effectTargets: {
      ev_card_fntr: { sector: 'Dairy' },
      ev_card_prtrs: { traderId: 't-bot' },
    },
  });
  const prepared = prepareAuthoritativeGameAction(state, incoming, 'peer-bot');
  const nextState = gameReducer(state, prepared);

  expect(nextState).not.toBe(state);
  expect(nextState.eventCardPhase['peer-bot']).toBe(true);
  expect(nextState.eventCardPhase['peer-other']).toBe(false);
  expect(nextState.playerEventChoices['peer-bot']).toEqual({
    positiveChoices: { ev_card_prtrs: 'use' },
    effectTargets: {
      ev_card_fntr: { sector: 'Dairy' },
      ev_card_prtrs: { traderId: 't-bot' },
    },
  });
});

test('event-choice learning sample is compact, strategic and identity-free', () => {
  const state = makeState();
  const action = prepareAuthoritativeGameAction(
    state,
    submitEventChoicesAction({
      playerId: 'spoofed-player',
      positiveChoices: { ev_card_prtrs: 'use' },
      effectTargets: {
        ev_card_fntr: { sector: 'Dairy' },
        ev_card_prtrs: { traderId: 't-bot' },
      },
    }),
    'peer-bot'
  );
  const nextState = gameReducer(state, action);
  const sample = buildLearningDecision({
    beforeState: state,
    afterState: nextState,
    action,
    actorId: 'peer-bot',
    appVersion: { version: 'test', gitCommit: 'abc123' },
  });

  expect(sample.schemaVersion).toBe(4);
  expect(sample.policyVersion).toBe('policy-v007');
  expect(sample.behaviorProfile).toBe('balanced');
  expect(sample.selectedAction).toEqual({
    type: 'SUBMIT_EVENT_CHOICES',
    positiveChoices: { ev_card_prtrs: 'use' },
    effectTargets: {
      ev_card_fntr: { sector: 'Dairy' },
      ev_card_prtrs: { traderId: 't-bot' },
    },
  });

  const serialized = JSON.stringify(sample);
  expect(serialized).not.toContain('Private Human');
  expect(serialized).not.toContain('Private Bot');
  expect(serialized).not.toContain('Private Other');
  expect(serialized).not.toContain('peer-human');
  expect(serialized).not.toContain('peer-bot');
  expect(serialized).not.toContain('peer-other');
});


test('event effects use the submitted target: Porters buffs own trader and Federal Police hits Dairy vodka', () => {
  const state = makeState({
    playerEventChoices: {
      'peer-human': { positiveChoices: {}, effectTargets: {} },
      'peer-bot': {
        positiveChoices: { ev_card_prtrs: 'use' },
        effectTargets: {
          ev_card_fntr: { sector: 'Dairy' },
          ev_card_prtrs: { traderId: 't-bot' },
        },
      },
      'peer-other': { positiveChoices: {}, effectTargets: {} },
    },
  });

  const nextState = applyEventChoicesToGameState(state);
  const bot = nextState.players.find(player => player.user_id === 'peer-bot');
  const other = nextState.players.find(player => player.user_id === 'peer-other');
  const botTrader = bot.traders.find(trader => trader.traderId === 't-bot');
  const vodkaTrader = other.traders.find(trader => trader.traderId === 't-vodka');

  expect(botTrader.goods).toHaveLength(2);
  expect(botTrader.goods.every(good => good.productId === 13)).toBe(true);
  expect(bot.eventCards).toEqual([]);

  expect(vodkaTrader.location).toBeNull();
  expect(vodkaTrader.goods).toEqual([]);
  expect(vodkaTrader.trader_action).toBe('hold');
  expect(other.coins).toBe(15);
  expect(other.sectorsWithTraders).toEqual(['Fish']);
  expect(nextState.eventResultLog['peer-bot'].length).toBeGreaterThan(0);
  expect(nextState.eventResultLog['peer-other'].length).toBeGreaterThan(0);
});

test('ACK_EVENT_RESULTS clears only the acting bot result log', () => {
  const state = makeState({
    eventResultLog: {
      'peer-human': ['human result'],
      'peer-bot': ['bot result'],
    },
    eventResultNonce: 3,
  });
  const action = prepareAuthoritativeGameAction(
    state,
    ackEventResultsAction({ playerId: 'spoofed-player' }),
    'peer-bot'
  );
  const nextState = gameReducer(state, action);

  expect(nextState.eventResultLog['peer-bot']).toEqual([]);
  expect(nextState.eventResultLog['peer-human']).toEqual(['human result']);
});
