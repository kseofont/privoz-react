import { gameReducer } from './reducer';
import { ACTION_TYPES } from './actions';

/**
 * Handle gameplay actions received by the host.
 *
 * Client sends an intent.
 * Host decides whether that intent is valid,
 * applies the reducer and broadcasts authoritative state.
 */
export function handleHostGameAction({ connectionsRef, setGameState }) {
  return function onHostGameAction(data, conn) {
    if (data?.type !== 'gameAction' || !data.action) {
      return;
    }

    const incomingAction = data.action;

    /*
     * For now SELECT_TRADER is the only network action.
     */
    if (incomingAction.type !== ACTION_TYPES.SELECT_TRADER) {
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
