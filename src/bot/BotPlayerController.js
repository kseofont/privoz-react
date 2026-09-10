import { useEffect, useRef } from 'react';

import { buildPlayerObservation } from './observation/buildPlayerObservation';
import { decideWithPolicy } from './decisions/PolicyDecisionProvider';
import { botDecisionToAction } from './actions/botDecisionToAction';

function getTurnLockKey(playerId) {
  return `privoz:bot:turn-lock:${playerId}`;
}

function readTurnLock(playerId) {
  try {
    return sessionStorage.getItem(getTurnLockKey(playerId)) === '1';
  } catch {
    return false;
  }
}

function writeTurnLock(playerId, locked) {
  try {
    const key = getTurnLockKey(playerId);

    if (locked) {
      sessionStorage.setItem(key, '1');
    } else {
      sessionStorage.removeItem(key);
    }
  } catch {
    // sessionStorage is only a duplicate-action guard, not game authority.
  }
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
 */
const BotPlayerController = ({ gameState, myUserId, connection }) => {
  const decisionInFlightRef = useRef(false);

  useEffect(() => {
    const player = gameState?.players?.find(currentPlayer => currentPlayer.user_id === myUserId);
    const isBot = player?.isBot === true;
    const myTurn = gameState?.currentTurnUserId === myUserId;

    if (!isBot || !myUserId) {
      return undefined;
    }

    /*
     * Re-arm only after the authoritative turn moves away from this bot.
     * sessionStorage makes the lock survive page/Menu remounts during the
     * same turn.
     */
    if (!myTurn) {
      decisionInFlightRef.current = false;
      writeTurnLock(myUserId, false);

      return undefined;
    }

    if (!connection?.open || decisionInFlightRef.current || readTurnLock(myUserId)) {
      return undefined;
    }

    const observation = buildPlayerObservation(gameState, myUserId);

    if (!observation) {
      return undefined;
    }

    let cancelled = false;

    decisionInFlightRef.current = true;

    const decideAndSend = async () => {
      try {
        const decision = await decideWithPolicy(observation);

        if (cancelled || !decision) {
          decisionInFlightRef.current = false;
          return;
        }

        const action = botDecisionToAction(decision, myUserId);

        if (!action || !connection?.open) {
          decisionInFlightRef.current = false;
          return;
        }

        /*
         * Lock before send so an immediate re-render cannot duplicate the
         * action. The lock is cleared only when HOST moves the turn away.
         */
        writeTurnLock(myUserId, true);

        console.log('[BOT] sending decision:', {
          decision,
          action,
        });

        connection.send({
          type: 'gameAction',
          action,
        });
      } catch (error) {
        decisionInFlightRef.current = false;
        writeTurnLock(myUserId, false);

        console.error('[BOT] Failed to decide/send action:', error);
      }
    };

    decideAndSend();

    return () => {
      cancelled = true;
    };
  }, [gameState, myUserId, connection]);

  return null;
};

export default BotPlayerController;
