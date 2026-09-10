import { gameReducer } from './reducer';
import { ACTION_TYPES } from './actions';

/**
 * Handle gameplay actions received by the host.
 *
 * Client sends an intent.
 * Host decides whether that intent is valid,
 * applies the reducer and broadcasts authoritative state.
 */
export function handleHostGameAction({ connectionsRef, setGameState, onAcceptedAction = null }) {
  return function onHostGameAction(data, conn) {
    if (data?.type !== 'gameAction' || !data.action) {
      return;
    }

    const incomingAction = data.action;

    /*
     * Keep the network surface explicit. Only actions already migrated
     * to host-authoritative reducers are accepted here.
     */
    if (
      incomingAction.type !== ACTION_TYPES.SELECT_TRADER &&
      incomingAction.type !== ACTION_TYPES.BUY_PRODUCT
    ) {
      return;
    }

    /*
     * SECURITY / AUTHORITY:
     *
     * Never trust playerId supplied by the client.
     * PeerJS conn.peer tells the host who actually
     * sent the action.
     */
    const authoritativeAction = {
      ...incomingAction,

      payload: {
        ...(incomingAction.payload || {}),
        playerId: conn.peer,
      },
    };

    console.log('[HOST] gameAction:', authoritativeAction);

    setGameState(prev => {
      const nextState = gameReducer(prev, authoritativeAction);

      /*
       * Reducer rejected the action.
       */
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
            actorId: conn.peer,
          });
        } catch (error) {
          console.warn('[HOST] Accepted-action observer failed:', error);
        }
      }

      /*
       * Host is the authority.
       * Broadcast only the state produced by host reducer.
       */
      if (connectionsRef && Array.isArray(connectionsRef.current)) {
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

      return nextState;
    });
  };
}
