import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import PrivozSector from '../components/PrivozSector';
import Menu from '../components/Menu';

import { connectionsRef } from '../globals';
import { handleHostEndTurn } from '../logic/logic';

const GamePage = () => {
  const location = useLocation();
  const params = useParams();

  /*
   * Legacy initialization.
   *
   * location.state is preferred, window.* remains as a temporary fallback
   * while the current application still navigates between pages this way.
   *
   * Later this will be replaced by the shared GameSession/game engine.
   */
  const initialGameState = location.state?.gameState || window.gameState || null;

  const initialMyUserId = location.state?.myUserId || window.myUserId || params.peerId || null;

  const initialConnection = location.state?.connection || window.currentPrivozConnection || null;

  const [gameState, setGameState] = useState(initialGameState);

  /*
   * These don't change while GamePage is mounted.
   *
   * Previously they were state values with unused setters.
   */
  const connection = initialConnection;
  const myUserId = initialMyUserId;

  /*
   * Make sure the current user really exists in the game.
   */
  const isAuthorized =
    !!myUserId &&
    !!gameState &&
    Array.isArray(gameState.players) &&
    gameState.players.some(player => player.user_id === myUserId);

  /*
   * Host has no PeerJS DataConnection to himself.
   */
  const isHost = !connection;

  /*
   * Keep temporary global navigation state synchronized.
   *
   * connectionsRef is NOT reconstructed here.
   * It remains the single shared object imported from globals.js.
   */
  useEffect(() => {
    if (gameState) {
      window.gameState = gameState;
    }

    if (myUserId) {
      window.myUserId = myUserId;
    }

    window.currentPrivozConnection = connection || null;
  }, [gameState, myUserId, connection]);

  /*
   * Host broadcasts the authoritative state to active clients.
   */
  const broadcastGameState = state => {
    const stateToSend = state || gameState;

    if (!stateToSend) {
      return;
    }

    connectionsRef.current.forEach(conn => {
      if (!conn?.open) {
        return;
      }

      try {
        conn.send({
          type: 'gameState',
          gameState: stateToSend,
        });
      } catch (error) {
        console.error(`[GamePage] Failed to send gameState to ${conn.peer}:`, error);
      }
    });
  };

  /*
   * CLIENT DATA LISTENER
   *
   * Client receives state updates from the host.
   *
   * This listener is explicitly removed when GamePage unmounts.
   */
  useEffect(() => {
    if (!connection) {
      return undefined;
    }

    const onData = data => {
      console.log('[GamePage] Received data:', data);

      if (data.type === 'gameState' && data.gameState) {
        setGameState(data.gameState);
      }
    };

    connection.on('data', onData);

    return () => {
      connection.off('data', onData);
    };
  }, [connection]);

  /*
   * HOST DATA LISTENERS
   *
   * Before this stabilization pass GamePage added a new anonymous
   * `data` listener every time the page was mounted:
   *
   * conn.on('data', data => handler(data, conn))
   *
   * and never removed it.
   *
   * After several rounds one PeerJS connection could therefore execute
   * the same host action several times.
   *
   * Now we retain the exact listener function and remove it on unmount.
   */
  useEffect(() => {
    if (!isHost) {
      return undefined;
    }

    const handler = handleHostEndTurn({
      connectionsRef,
      setGameState,
    });

    const subscriptions = connectionsRef.current.map(conn => {
      const onData = data => {
        handler(data, conn);
      };

      conn.on('data', onData);

      return {
        conn,
        onData,
      };
    });

    return () => {
      subscriptions.forEach(({ conn, onData }) => {
        conn.off('data', onData);
      });
    };
  }, [isHost]);

  /*
   * Current turn.
   */
  const myTurn = isAuthorized && gameState?.currentTurnUserId === myUserId;

  /*
   * Other players are currently used to determine sector capacity.
   * Existing gameplay is intentionally preserved.
   */
  const otherUsers = gameState?.players?.filter(player => player.user_id !== myUserId) || [];

  /*
   * Existing sector fallback.
   */
  const fallbackSectors = ['Fruits', 'Vegetables', 'Dairy', 'Meat', 'Fish', 'Household goods'];

  const sectors = gameState?.sectors || fallbackSectors;

  return (
    <div className="container-fluid">
      <div className="row">
        <h2>Privoz Bazar Game Session</h2>

        <div className="row flex-column flex-sm-row">
          {/* Game sectors */}
          <div className="col-12 col-sm-9 order-2 order-sm-1 d-flex flex-column align-items-center text-center">
            <div className="row yarr1">
              {sectors.map(sector => (
                <div className="col-6 yarr1" key={sector}>
                  <PrivozSector
                    category={sector}
                    maxTraders={otherUsers.length + 1}
                    gameState={gameState}
                    myUserId={myUserId}
                    connection={connection}
                    myTurn={myTurn}
                    setGameState={setGameState}
                    broadcastGameState={isHost ? broadcastGameState : undefined}
                    clickable={isAuthorized && myTurn}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right menu */}
          <div className="col-12 col-sm-3 order-1 order-sm-2 border-start">
            <Menu
              gameState={gameState}
              myUserId={myUserId}
              connection={connection}
              setGameState={isHost ? setGameState : undefined}
              broadcastGameState={isHost ? broadcastGameState : undefined}
              connectionsRef={connectionsRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage;
