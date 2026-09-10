import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslation } from 'react-i18next';
import Peer from 'peerjs';
import { useLocation, useNavigate } from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';

import Menu from '../components/Menu';
import {
  getActiveBotPolicyVersion,
  normalizeBotBehaviorProfile,
} from '../bot/decisions/PolicyDecisionProvider';

const JoinGamePage = () => {
  const [userName, setUserName] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [hostPeerId, setHostPeerId] = useState('');

  const [connected, setConnected] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const [connection, setConnection] = useState(null);

  const [gameState, setGameState] = useState(null);

  const [myUserId, setMyUserId] = useState(null);

  const [logs, setLogs] = useState([]);

  /*
   * PeerJS instances are kept in refs because changing them should not
   * cause rendering.
   *
   * They must survive navigation from JoinGamePage to TraderList.
   */
  const peerRef = useRef(null);
  const connectionRef = useRef(null);

  /*
   * Prevent React development mode / repeated effects from starting
   * the auto-join flow more than once.
   */
  const autoJoinStartedRef = useRef(false);

  /*
   * Prevent multiple connection attempts while PeerJS is still opening.
   */
  const connectingRef = useRef(false);

  /*
   * Exact PeerJS listeners used only by this lobby page.
   *
   * We retain their references so they can be removed when JoinGamePage
   * unmounts without closing the actual game connection.
   */
  const lobbyHandlersRef = useRef({
    peer: null,
    peerOpen: null,
    peerError: null,

    connection: null,
    connectionOpen: null,
    connectionError: null,
    connectionClose: null,
    connectionData: null,
  });

  const navigate = useNavigate();
  const location = useLocation();

  const { t } = useTranslation();

  const addLog = useCallback(message => {
    setLogs(prevLogs => [...prevLogs, message]);

    console.log(message);
  }, []);

  /*
   * Remove listeners that belong specifically to JoinGamePage.
   *
   * IMPORTANT:
   * This function intentionally does NOT call:
   *
   * connection.close()
   * peer.destroy()
   *
   * because the PeerJS connection has to survive navigation into
   * TraderList / Wholesale / GamePage.
   */
  const detachLobbyListeners = useCallback(() => {
    const handlers = lobbyHandlersRef.current;

    if (handlers.peer) {
      if (handlers.peerOpen) {
        handlers.peer.off('open', handlers.peerOpen);
      }

      if (handlers.peerError) {
        handlers.peer.off('error', handlers.peerError);
      }
    }

    if (handlers.connection) {
      if (handlers.connectionOpen) {
        handlers.connection.off('open', handlers.connectionOpen);
      }

      if (handlers.connectionError) {
        handlers.connection.off('error', handlers.connectionError);
      }

      if (handlers.connectionClose) {
        handlers.connection.off('close', handlers.connectionClose);
      }

      if (handlers.connectionData) {
        handlers.connection.off('data', handlers.connectionData);
      }
    }

    lobbyHandlersRef.current = {
      peer: null,
      peerOpen: null,
      peerError: null,

      connection: null,
      connectionOpen: null,
      connectionError: null,
      connectionClose: null,
      connectionData: null,
    };
  }, []);

  /*
   * Remove JoinGamePage listeners on navigation/unmount.
   *
   * The Peer and DataConnection themselves stay alive.
   */
  useEffect(() => {
    return () => {
      detachLobbyListeners();
    };
  }, [detachLobbyListeners]);

  /*
   * One shared PeerJS connection flow for:
   *
   * - manual join
   * - auto join from URL
   *
   * Previously those two flows duplicated almost the same PeerJS code.
   */
  const connectToHost = useCallback(
    ({ peerId, name, color, auto = false, isBot = false, botBehaviorProfile = null }) => {
      if (!peerId || !name || !color) {
        return;
      }

      /*
       * Don't start another connection while one is already being
       * established or is open.
       */
      if (connectingRef.current || connectionRef.current?.open) {
        return;
      }

      setErrorMessage('');
      connectingRef.current = true;

      /*
       * Clean up a previous failed lobby attempt if one exists.
       */
      detachLobbyListeners();

      if (peerRef.current && !peerRef.current.destroyed) {
        try {
          peerRef.current.destroy();
        } catch (error) {
          console.error('[JoinGamePage] Failed to destroy previous peer:', error);
        }
      }

      const newPeer = new Peer();

      peerRef.current = newPeer;

      /*
       * Temporary global compatibility.
       *
       * Keeps the Peer alive after JoinGamePage unmounts.
       */
      window.currentPrivozPeer = newPeer;

      const handlePeerOpen = id => {
        /*
         * This is the client's own PeerJS ID.
         */
        setMyUserId(id);
        window.myUserId = id;

        const conn = newPeer.connect(peerId);

        connectionRef.current = conn;
        setConnection(conn);

        const handleConnectionOpen = () => {
          connectingRef.current = false;

          setConnected(true);

          window.currentPrivozConnection = conn;

          addLog(
            auto
              ? `[AUTO] Connected to host with ID: ${peerId}`
              : `Connected to host with ID: ${peerId}`
          );

          conn.send({
            type: 'join',
            playerName: name,
            color,
            isBot,
            botPolicyVersion: isBot ? getActiveBotPolicyVersion() : null,
            botBehaviorProfile: isBot ? normalizeBotBehaviorProfile(botBehaviorProfile) : null,
          });
        };

        const handleConnectionError = error => {
          connectingRef.current = false;

          setErrorMessage(
            `Connection error: ${
              error.message || 'An error occurred while connecting to the host.'
            }`
          );

          addLog('Connection error: ' + error.message);
        };

        const handleConnectionClose = () => {
          connectingRef.current = false;

          connectionRef.current = null;

          setConnected(false);
          setConnection(null);

          setErrorMessage(t('join_error_disconnected'));

          addLog('[CLIENT] Disconnected from host.');

          /*
           * We are still on the lobby page if this handler is active,
           * so a dead Peer can safely be destroyed and recreated later.
           *
           * Once we navigate to the game this listener is detached.
           */
          if (peerRef.current && !peerRef.current.destroyed) {
            try {
              peerRef.current.destroy();
            } catch (error) {
              console.error('[JoinGamePage] Failed to destroy disconnected peer:', error);
            }
          }

          peerRef.current = null;
        };

        const handleConnectionData = data => {
          addLog('Received data: ' + JSON.stringify(data));

          if (data.type === 'gameState' && data.gameState) {
            setGameState(data.gameState);

            return;
          }

          if (data.type === 'colorTaken') {
            if (data.gameState) {
              setGameState(data.gameState);
            }

            setErrorMessage(t('join_error_color_taken'));

            return;
          }

          if (data.type === 'nameTaken') {
            if (data.gameState) {
              setGameState(data.gameState);
            }

            setErrorMessage(t('join_error_name_taken'));

            return;
          }

          if (data.type === 'joinAccepted') {
            if (data.gameState) {
              setGameState(data.gameState);
            }

            if (data.myUserId) {
              setMyUserId(data.myUserId);
              window.myUserId = data.myUserId;
            }

            setErrorMessage('');
            addLog('[CLIENT] Lobby join accepted by host.');

            return;
          }

          if (data.type === 'connectionDenied') {
            setErrorMessage(t('join_error_connection_denied'));

            return;
          }

          if (data.type === 'alreadyJoined') {
            setErrorMessage(t('join_error_already_joined'));

            return;
          }

          if (data.type === 'startGame') {
            /*
             * Preserve the active PeerJS connection for all subsequent
             * pages.
             */
            window.currentPrivozPeer = newPeer;

            window.currentPrivozConnection = conn;

            window.gameState = data.gameState;

            window.myUserId = data.myUserId;

            /*
             * peerId here is the HOST peer ID.
             *
             * We preserve the current legacy behavior until routing and
             * GameSession are refactored.
             */
            window.peerId = peerId;

            navigate(`/traders/${data.myUserId}`, {
              state: {
                gameState: data.gameState,

                myUserId: data.myUserId,
              },
            });
          }
        };

        lobbyHandlersRef.current = {
          ...lobbyHandlersRef.current,

          connection: conn,

          connectionOpen: handleConnectionOpen,

          connectionError: handleConnectionError,

          connectionClose: handleConnectionClose,

          connectionData: handleConnectionData,
        };

        conn.on('open', handleConnectionOpen);

        conn.on('error', handleConnectionError);

        conn.on('close', handleConnectionClose);

        conn.on('data', handleConnectionData);
      };

      const handlePeerError = error => {
        connectingRef.current = false;

        setErrorMessage(
          `Peer error: ${
            error.message || 'An error occurred while initializing the peer connection.'
          }`
        );

        addLog('Peer error: ' + error.message);
      };

      lobbyHandlersRef.current = {
        ...lobbyHandlersRef.current,

        peer: newPeer,
        peerOpen: handlePeerOpen,
        peerError: handlePeerError,
      };

      newPeer.on('open', handlePeerOpen);

      newPeer.on('error', handlePeerError);
    },
    [addLog, detachLobbyListeners, navigate, t]
  );

  /*
   * Auto connection from invitation URL.
   *
   * Example:
   *
   * /JoinGamePage
   *   ?peer_id=...
   *   &name=...
   *   &color=green
   *   &bot=1
   */
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const peerIdFromUrl = params.get('peer_id');

    const nameFromUrl = params.get('name');

    const colorFromUrl = params.get('color');

    const isBotFromUrl = params.get('bot') === '1';

    const botBehaviorProfileFromUrl = params.get('bot_profile');

    if (peerIdFromUrl) {
      setHostPeerId(peerIdFromUrl);
    }

    if (nameFromUrl) {
      setUserName(nameFromUrl);
    }

    if (colorFromUrl) {
      setSelectedColor(colorFromUrl);
    }

    if (peerIdFromUrl && nameFromUrl && colorFromUrl && !autoJoinStartedRef.current) {
      autoJoinStartedRef.current = true;

      connectToHost({
        peerId: peerIdFromUrl,
        name: nameFromUrl,
        color: colorFromUrl,
        auto: true,
        isBot: isBotFromUrl,
        botBehaviorProfile: botBehaviorProfileFromUrl,
      });
    }
  }, [location.search, connectToHost]);

  /*
   * Validate form before manual connection.
   */
  const validateJoin = ({ userName: name, selectedColor: color, gameState: state }) => {
    if (!name || name.length < 2 || name.length > 16) {
      return t('join_error_name_length');
    }

    if (
      state &&
      Array.isArray(state.players) &&
      state.players.some(player => player.name?.toLowerCase() === name.toLowerCase())
    ) {
      return t('join_error_name_taken');
    }

    if (!color) {
      return t('join_error_select_color');
    }

    return null;
  };

  /*
   * Manual join button.
   */
  const handleJoinGame = () => {
    if (!hostPeerId || !userName || !selectedColor) {
      setErrorMessage(t('join_error_fill_fields'));

      return;
    }

    const validationError = validateJoin({
      userName,
      selectedColor,
      gameState,
    });

    if (validationError) {
      setErrorMessage(validationError);

      return;
    }

    setErrorMessage('');

    /*
     * A rejected lobby join (for example nameTaken/colorTaken) does not
     * mean the PeerJS transport is broken. Reuse the already-open
     * DataConnection and submit the corrected lobby data again.
     *
     * This avoids creating ghost Peer/DataConnection instances and keeps
     * the retry path identical for invitation URLs and manual joins.
     */
    if (connectionRef.current?.open) {
      connectionRef.current.send({
        type: 'join',
        playerName: userName,
        color: selectedColor,
      });

      addLog(`[CLIENT] Retrying lobby join as "${userName}" with color "${selectedColor}".`);

      return;
    }

    connectToHost({
      peerId: hostPeerId,
      name: userName,
      color: selectedColor,
      auto: false,
    });
  };

  const joinedCurrentLobby = Boolean(
    myUserId && gameState?.players?.some(player => player.user_id === myUserId)
  );

  return (
    <div className="container-fluid">
      <div className="row flex-column flex-sm-row">
        <div className="col-12 col-sm-9 order-2 order-sm-1 d-flex flex-column  align-items-center text-center">
          <h1>{t('join_title')}</h1>

          <div className="mb-3">
            <label htmlFor="userName" className="form-label">
              {t('join_enter_name')}
            </label>

            <input
              type="text"
              className="form-control"
              id="userName"
              value={userName}
              onChange={event => {
                setUserName(event.target.value);
                setErrorMessage('');
              }}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="colorSelect" className="form-label">
              {t('join_select_color')}
            </label>

            <select
              className="form-select"
              id="colorSelect"
              value={selectedColor}
              onChange={event => {
                setSelectedColor(event.target.value);
                setErrorMessage('');
              }}
              required
            >
              <option value="" disabled>
                {t('join_select_color_placeholder')}
              </option>

              {['red', 'green', 'blue', 'orange', 'purple', 'brown']
                .filter(color => !(gameState?.players || []).some(player => player.color === color))
                .map(color => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
            </select>
          </div>

          <div className="mb-3">
            <label htmlFor="hostPeerId" className="form-label">
              {t('join_host_peer_id')}
            </label>

            <input
              type="text"
              className="form-control"
              id="hostPeerId"
              value={hostPeerId}
              onChange={event => {
                setHostPeerId(event.target.value);
                setErrorMessage('');
              }}
              required
            />
          </div>

          {!joinedCurrentLobby && (
            <button
              className="btn btn-success"
              onClick={handleJoinGame}
              disabled={connectingRef.current}
            >
              {connected ? t('join_retry_button') : t('join_game_button')}
            </button>
          )}

          {connected && !joinedCurrentLobby && !errorMessage && (
            <div className="mt-3 alert alert-info">{t('join_connected_waiting')}</div>
          )}

          {connected && joinedCurrentLobby && (
            <div className="mt-3 alert alert-success">
              <p className="mb-1">{t('join_accepted_waiting_start')}</p>
              <p className="mb-0">
                <strong>{t('join_connected_host')}:</strong> {hostPeerId}
              </p>
            </div>
          )}

          {logs.length > 0 && (
            <div className="mt-3">
              <h5>Logs:</h5>

              {/* <ul className="list-unstyled">
                {logs.map((log, index) => (
                  <li key={index}>{log}</li>
                ))}
              </ul> */}
            </div>
          )}

          {errorMessage && (
            <div className="mt-3 alert alert-danger">
              <p>{errorMessage}</p>
            </div>
          )}
        </div>

        <div className="col-12 col-sm-3 order-1 order-sm-2 border-start">
          <Menu
            currentUserData={
              gameState?.players ? gameState.players.find(player => player.isHost) : null
            }
            otherUsers={
              gameState?.players ? gameState.players.filter(player => !player.isHost) : []
            }
            gameState={gameState}
            connection={connection}
          />
        </div>
      </div>
    </div>
  );
};

export default JoinGamePage;
