import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { buildPlayerObservation } from './observation/buildPlayerObservation';
import {
  decideWithPolicy,
  getDefaultBotBehaviorProfile,
  normalizeBotBehaviorProfile,
} from './decisions/PolicyDecisionProvider';
import { botDecisionToAction } from './actions/botDecisionToAction';
import { ackEventResultsAction } from '../game/actions';
import { PHASES } from '../game/phases';

const BOT_STAGES = Object.freeze({
  AWAITING_TURN: 'awaiting_turn',
  TRADER: 'trader',
  WHOLESALE: 'wholesale',
  PLACEMENT: 'placement',
  END_TURN: 'end_turn',
});

function getStorageKey(playerId, suffix) {
  return `privoz:bot:${suffix}:${playerId}`;
}

function readStorage(playerId, suffix) {
  try {
    return sessionStorage.getItem(getStorageKey(playerId, suffix));
  } catch {
    return null;
  }
}

function writeStorage(playerId, suffix, value) {
  try {
    const key = getStorageKey(playerId, suffix);

    if (value === null || value === undefined || value === '') {
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, String(value));
    }
  } catch {
    // Bot lifecycle storage is only a duplicate/navigation guard.
  }
}

function getBotStage(playerId) {
  return readStorage(playerId, 'stage') || BOT_STAGES.AWAITING_TURN;
}

function setBotStage(playerId, stage) {
  writeStorage(playerId, 'stage', stage);
}

function clearActionGuard(playerId) {
  writeStorage(playerId, 'last-decision', null);
}


function navigateBotPage(navigate, path, gameState, myUserId) {
  if (typeof window !== 'undefined') {
    window.gameState = gameState;
    window.myUserId = myUserId;
  }

  navigate(path, {
    state: {
      gameState,
      myUserId,
    },
  });
}

function buildDecisionKey(observation, stage, action) {
  const products = (observation.self?.products || [])
    .map(product => `${product.productId}:${product.quantity}`)
    .sort()
    .join(',');

  const target =
    action.type === 'PLACE_TRADER'
      ? `${action.payload?.traderId || 'none'}:${action.payload?.sector || 'none'}:${(
          action.payload?.productIds || []
        ).join(',')}`
      : action.type === 'SUBMIT_EVENT_CHOICES'
        ? JSON.stringify({
            positiveChoices: action.payload?.positiveChoices || {},
            effectTargets: action.payload?.effectTargets || {},
          })
        : action.payload?.traderId ?? action.payload?.productId ?? 'none';
  const traderLocations = (observation.self?.traders || [])
    .map(trader => `${trader.traderId}:${trader.location || 'hand'}`)
    .sort()
    .join(',');

  return [
    observation.round,
    stage,
    action.type,
    target,
    observation.self?.coins ?? 0,
    observation.self?.tradersCount ?? 0,
    products,
    traderLocations,
  ].join('|');
}

/**
 * Invisible controller for a bot client.
 *
 * Bot decision
 * -> normal gameAction message
 * -> HOST
 * -> validation / reducer
 * -> authoritative gameState
 * -> broadcast
 *
 * It never calls gameReducer() or setGameState() itself.
 *
 * END_TURN is also sent through the same host-authoritative action flow.
 */
const BotPlayerController = ({ gameState, myUserId, connection }) => {
  const decisionInFlightRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const player = gameState?.players?.find(currentPlayer => currentPlayer.user_id === myUserId);
    const isBot = player?.isBot === true;
    const myTurn = gameState?.currentTurnUserId === myUserId;

    if (!isBot || !myUserId) {
      return undefined;
    }

    const myEventLogs = gameState?.eventResultLog?.[myUserId] || [];
    const eventResultNonce = Number(gameState?.eventResultNonce || 0);
    const lastAckedEventNonce = Number(readStorage(myUserId, 'event-result-ack') || 0);

    /*
     * Event-result ACK is transport/UI housekeeping, not a strategic
     * decision. Bots acknowledge it automatically through the same
     * host-authoritative gameAction channel humans use.
     */
    if (
      myEventLogs.length > 0 &&
      eventResultNonce > lastAckedEventNonce &&
      connection?.open &&
      !decisionInFlightRef.current
    ) {
      decisionInFlightRef.current = true;

      const ackAction = ackEventResultsAction({ playerId: myUserId });
      writeStorage(myUserId, 'event-result-ack', eventResultNonce);

      console.log('[BOT] acknowledging event results:', {
        eventResultNonce,
        lines: myEventLogs.length,
      });

      connection.send({
        type: 'gameAction',
        action: ackAction,
      });

      decisionInFlightRef.current = false;
      return undefined;
    }

    /*
     * Personal event choices are simultaneous round decisions. They are
     * intentionally handled before myTurn because every player must submit
     * during PERSONAL_EVENTS regardless of currentTurnUserId.
     */
    if (gameState?.phase === PHASES.PERSONAL_EVENTS) {
      const eventChoicePending = gameState?.eventCardPhase?.[myUserId] === false;

      if (!eventChoicePending || !connection?.open || decisionInFlightRef.current) {
        return undefined;
      }

      const observation = buildPlayerObservation(gameState, myUserId);

      if (!observation) {
        return undefined;
      }

      const behaviorProfile = normalizeBotBehaviorProfile(
        player?.botBehaviorProfile || getDefaultBotBehaviorProfile()
      );
      let cancelled = false;
      decisionInFlightRef.current = true;

      const decideAndSubmitEvents = async () => {
        try {
          const decision = await decideWithPolicy(observation, {
            stage: 'personal_events',
            behaviorProfile,
          });

          if (cancelled || !decision) {
            decisionInFlightRef.current = false;
            return;
          }

          const action = botDecisionToAction(decision, myUserId);

          if (!action || !connection?.open) {
            decisionInFlightRef.current = false;
            return;
          }

          const decisionKey = buildDecisionKey(observation, 'personal_events', action);

          if (readStorage(myUserId, 'last-event-decision') === decisionKey) {
            decisionInFlightRef.current = false;
            return;
          }

          writeStorage(myUserId, 'last-event-decision', decisionKey);

          console.log('[BOT] sending event choices:', {
            behaviorProfile,
            decision,
            action,
          });

          connection.send({
            type: 'gameAction',
            action,
          });

          decisionInFlightRef.current = false;
        } catch (error) {
          decisionInFlightRef.current = false;
          writeStorage(myUserId, 'last-event-decision', null);
          console.error('[BOT] Failed to decide/send event choices:', error);
        }
      };

      decideAndSubmitEvents();

      return () => {
        cancelled = true;
      };
    }

    if (gameState?.phase === PHASES.ROUND_END) {
      return undefined;
    }

    if (!myTurn) {
      if (getBotStage(myUserId) === BOT_STAGES.END_TURN) {
        console.log('[BOT] turn complete:', {
          nextPlayerId: gameState?.currentTurnUserId || null,
        });
      }

      decisionInFlightRef.current = false;
      setBotStage(myUserId, BOT_STAGES.AWAITING_TURN);
      clearActionGuard(myUserId);
      writeStorage(myUserId, 'pending-trader', null);
      writeStorage(myUserId, 'pending-placement', null);
      if (gameState?.phase === PHASES.TRADER_SELECTION) {
        writeStorage(myUserId, 'last-event-decision', null);
      }

      return undefined;
    }

    let stage = getBotStage(myUserId);

    if (stage === BOT_STAGES.AWAITING_TURN) {
      stage = BOT_STAGES.TRADER;
      setBotStage(myUserId, stage);
      clearActionGuard(myUserId);
    }

    /*
     * A SELECT_TRADER sent on the previous state is considered complete
     * only after authoritative state confirms ownership.
     */
    const pendingTraderId = readStorage(myUserId, 'pending-trader');

    if (
      stage === BOT_STAGES.TRADER &&
      pendingTraderId &&
      player?.traders?.some(trader => trader?.traderId === pendingTraderId)
    ) {
      stage = BOT_STAGES.WHOLESALE;
      setBotStage(myUserId, stage);
      writeStorage(myUserId, 'pending-trader', null);
      clearActionGuard(myUserId);
      decisionInFlightRef.current = false;
    }

    const pendingPlacement = readStorage(myUserId, 'pending-placement');

    if (stage === BOT_STAGES.PLACEMENT && pendingPlacement) {
      const [pendingPlacementTraderId] = pendingPlacement.split('|');
      const placedTrader = player?.traders?.find(
        trader => trader?.traderId === pendingPlacementTraderId && trader?.location
      );

      if (placedTrader) {
        stage = BOT_STAGES.END_TURN;
        setBotStage(myUserId, stage);
        writeStorage(myUserId, 'pending-placement', null);
        clearActionGuard(myUserId);
        decisionInFlightRef.current = false;

        console.log('[BOT] placement complete:', {
          traderId: placedTrader.traderId,
          sector: placedTrader.location,
          goodsCount: Array.isArray(placedTrader.goods) ? placedTrader.goods.length : 0,
        });
      }
    }

    if (stage === BOT_STAGES.TRADER && !location.pathname.startsWith('/traders')) {
      navigateBotPage(navigate, `/traders/${myUserId}`, gameState, myUserId);
      return undefined;
    }

    if (stage === BOT_STAGES.WHOLESALE && !location.pathname.startsWith('/wholesale')) {
      navigateBotPage(navigate, `/wholesale/${myUserId}`, gameState, myUserId);
      return undefined;
    }

    if (stage === BOT_STAGES.PLACEMENT && !location.pathname.startsWith('/game')) {
      navigateBotPage(navigate, `/game/${myUserId}`, gameState, myUserId);
      return undefined;
    }

    if (!connection?.open || decisionInFlightRef.current) {
      return undefined;
    }

    const observation = buildPlayerObservation(gameState, myUserId);

    if (!observation) {
      return undefined;
    }

    const behaviorProfile = normalizeBotBehaviorProfile(
      player?.botBehaviorProfile || getDefaultBotBehaviorProfile()
    );

    let cancelled = false;
    decisionInFlightRef.current = true;

    const decideAndSend = async () => {
      try {
        let decision = await decideWithPolicy(observation, {
          stage,
          behaviorProfile,
        });

        if (cancelled) {
          return;
        }

        /*
         * No trader may mean the bot cannot afford another trader in a
         * later turn. If it already owns one, continue to wholesale.
         */
        if (!decision && stage === BOT_STAGES.TRADER) {
          if ((player?.traders || []).length > 0) {
            decisionInFlightRef.current = false;
            setBotStage(myUserId, BOT_STAGES.WHOLESALE);
            clearActionGuard(myUserId);
            navigateBotPage(navigate, `/wholesale/${myUserId}`, gameState, myUserId);
            return;
          }

          stage = BOT_STAGES.END_TURN;
          setBotStage(myUserId, stage);
          clearActionGuard(myUserId);
          decision = await decideWithPolicy(observation, {
            stage,
            behaviorProfile,
          });
        }

        /*
         * Wholesale policy returning null means the bot intentionally
         * stops shopping because its reserve/legality strategy has no
         * further acceptable purchase.
         */
        if (!decision && stage === BOT_STAGES.WHOLESALE) {
          decisionInFlightRef.current = false;
          setBotStage(myUserId, BOT_STAGES.PLACEMENT);
          clearActionGuard(myUserId);

          console.log('[BOT] wholesale complete:', {
            behaviorProfile,
            coinsLeft: observation.self?.coins,
          });

          navigateBotPage(navigate, `/game/${myUserId}`, gameState, myUserId);
          return;
        }

        if (!decision && stage === BOT_STAGES.PLACEMENT) {
          stage = BOT_STAGES.END_TURN;
          setBotStage(myUserId, stage);
          clearActionGuard(myUserId);

          console.log('[BOT] placement skipped: no legal placement decision');

          decision = await decideWithPolicy(observation, {
            stage,
            behaviorProfile,
          });
        }

        if (!decision) {
          decisionInFlightRef.current = false;
          return;
        }

        const action = botDecisionToAction(decision, myUserId);

        if (!action || !connection?.open) {
          decisionInFlightRef.current = false;
          return;
        }

        const decisionKey = buildDecisionKey(observation, stage, action);

        if (readStorage(myUserId, 'last-decision') === decisionKey) {
          decisionInFlightRef.current = false;
          return;
        }

        writeStorage(myUserId, 'last-decision', decisionKey);

        if (stage === BOT_STAGES.TRADER && action.payload?.traderId) {
          writeStorage(myUserId, 'pending-trader', action.payload.traderId);
        }

        if (stage === BOT_STAGES.PLACEMENT && action.payload?.traderId && action.payload?.sector) {
          writeStorage(
            myUserId,
            'pending-placement',
            `${action.payload.traderId}|${action.payload.sector}`
          );
        }

        console.log('[BOT] sending decision:', {
          behaviorProfile,
          stage,
          decision,
          action,
        });

        connection.send({
          type: 'gameAction',
          action,
        });

        /*
         * Wait for authoritative gameState before another decision.
         * The effect will re-run when HOST broadcasts the changed state.
         */
        decisionInFlightRef.current = false;
      } catch (error) {
        decisionInFlightRef.current = false;
        clearActionGuard(myUserId);

        console.error('[BOT] Failed to decide/send action:', error);
      }
    };

    decideAndSend();

    return () => {
      cancelled = true;
    };
  }, [gameState, myUserId, connection, location.pathname, navigate]);

  return null;
};

export default BotPlayerController;
