import { gameReducer } from './reducer';
import { ACTION_TYPES } from './actions';
import { prepareAuthoritativeGameAction } from './hostActionPreparation';

function isSupportedHostAction(action) {
  return (
    action?.type === ACTION_TYPES.SELECT_TRADER ||
    action?.type === ACTION_TYPES.BUY_PRODUCT ||
    action?.type === ACTION_TYPES.PLACE_TRADER ||
    action?.type === ACTION_TYPES.END_TURN
  );
}

function broadcastAuthoritativeState(connectionsRef, nextState) {
  if (!connectionsRef || !Array.isArray(connectionsRef.current)) {
    return;
  }

  connectionsRef.current.forEach(connection => {
    if (!connection?.open) {
      return;
    }

    try {
      connection.send({
        type: 'gameState',
        gameState: nextState,
      });
    } catch (error) {
      console.error(`[HOST] Failed to broadcast gameState to ${connection.peer}:`, error);
    }
  });
}

/**
 * Apply one gameplay intent through the authoritative host reducer.
 *
 * Used by both:
 * - remote PeerJS clients;
 * - the host's own UI actions.
 */
export function applyHostGameAction({
  connectionsRef,
  setGameState,
  action,
  actorId,
  onAcceptedAction = null,
}) {
  if (
    typeof setGameState !== 'function' ||
    !isSupportedHostAction(action) ||
    !actorId
  ) {
    return;
  }

  setGameState(prev => {
    const authoritativeAction = prepareAuthoritativeGameAction(prev, action, actorId);

    console.log('[HOST] gameAction:', authoritativeAction);

    const nextState = gameReducer(prev, authoritativeAction);

    if (nextState === prev) {
      console.warn('[HOST] gameAction rejected:', authoritativeAction);
      return prev;
    }

    if (typeof onAcceptedAction === 'function') {
      try {
        onAcceptedAction({
          beforeState: prev,
          afterState: nextState,
          action: authoritativeAction,
          actorId,
        });
      } catch (error) {
        console.warn('[HOST] Accepted-action observer failed:', error);
      }
    }

    broadcastAuthoritativeState(connectionsRef, nextState);

    return nextState;
  });
}

/**
 * Handle gameplay actions received by the host from a PeerJS client.
 */
export function handleHostGameAction({ connectionsRef, setGameState, onAcceptedAction = null }) {
  return function onHostGameAction(data, conn) {
    if (data?.type !== 'gameAction' || !data.action || !conn?.peer) {
      return;
    }

    applyHostGameAction({
      connectionsRef,
      setGameState,
      action: data.action,
      actorId: conn.peer,
      onAcceptedAction,
    });
  };
}
