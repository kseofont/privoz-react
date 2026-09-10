import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

import Menu from '../components/Menu';
import { connectionsRef } from '../globals';

import traderList from '../data/TradersList.json';
import products from '../data/products.json';
import eventcards from '../data/eventcards.json';
import { PHASES } from '../game/phases';
import { createGameId } from '../game/gameId';
import {
  BOT_BEHAVIOR_PROFILES,
  normalizeBotBehaviorProfile,
} from '../bot/decisions/PolicyDecisionProvider';

/**
 * Add a PeerJS connection only once.
 *
 * For now this helper lives here so CreateServerPage can be stabilized
 * independently. Later connection management will move into the shared
 * game/network layer.
 */
const addConnection = conn => {
  if (!conn) return false;

  const alreadyExists = connectionsRef.current.some(
    existing => existing === conn || existing?.peer === conn.peer
  );

  if (alreadyExists) {
    return false;
  }

  connectionsRef.current = [...connectionsRef.current, conn];

  return true;
};

/**
 * Remove a specific PeerJS connection from the global list.
 */
const removeConnection = conn => {
  if (!conn) return;

  connectionsRef.current = connectionsRef.current.filter(
    existing => existing !== conn && existing?.peer !== conn.peer
  );
};

/**
 * Send data only through currently open connections.
 */
const sendToConnection = (conn, data) => {
  if (!conn?.open) return;

  try {
    conn.send(data);
  } catch (error) {
    console.error(`Failed to send data to ${conn.peer}:`, error);
  }
};

const CreateServerPage = () => {
  const [userName, setUserName] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [numberOfPlayers, setNumberOfPlayers] = useState(3);
  const [botBehaviorProfile, setBotBehaviorProfile] = useState('balanced');

  const [serverStarted, setServerStarted] = useState(false);
  const [peerId, setPeerId] = useState('');

  const [logs, setLogs] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);

  const [hostId, setHostId] = useState('');

  const peerRef = useRef(null);

  /**
   * Lobby-only data handlers.
   *
   * We keep references to them so they can be removed when this page
   * unmounts. The actual PeerJS connections stay alive.
   */
  const lobbyDataHandlersRef = useRef(new Map());

  const { t } = useTranslation();
  const navigate = useNavigate();

  // Используем текущий origin:
  // localhost -> localhost
  // production -> production
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // Обычное приглашение для реального игрока.
  // Имя и цвет игрок выбирает самостоятельно.
  const joinGameUrl =
    peerId && appOrigin ? `${appOrigin}/JoinGamePage?peer_id=${encodeURIComponent(peerId)}` : '';

  // Для виртуального игрока автоматически выбираем первый свободный цвет
  // и уникальное тестовое имя.
  const usedColors = new Set(
    (gameState?.players || []).map(player => player.color).filter(Boolean)
  );

  const nextVirtualColor =
    ['red', 'green', 'blue', 'orange', 'purple', 'brown'].find(color => !usedColors.has(color)) ||
    '';

  const nextVirtualPlayerNumber = (gameState?.players?.length || 0) + 1;

  const virtualPlayerUrl =
    peerId && appOrigin && nextVirtualColor
      ? `${appOrigin}/JoinGamePage?peer_id=${encodeURIComponent(peerId)}&name=${encodeURIComponent(
          `virtual-${nextVirtualPlayerNumber}`
        )}&color=${encodeURIComponent(nextVirtualColor)}`
      : '';

  const botPlayerUrl =
    peerId && appOrigin && nextVirtualColor
      ? `${appOrigin}/JoinGamePage?peer_id=${encodeURIComponent(
          peerId
        )}&name=${encodeURIComponent(`bot-${nextVirtualPlayerNumber}`)}&color=${encodeURIComponent(
          nextVirtualColor
        )}&bot=1&bot_profile=${encodeURIComponent(botBehaviorProfile)}`
      : '';

  const addLog = message => {
    setLogs(prevLogs => [...prevLogs, message]);
    console.log(message);
  };

  const broadcastGameState = (state = gameState) => {
    if (!state) return;

    connectionsRef.current.forEach(conn => {
      sendToConnection(conn, {
        type: 'gameState',
        gameState: state,
      });
    });
  };

  /**
   * Keep clients synchronized with the host game state while the lobby
   * is active.
   */
  useEffect(() => {
    if (
      !serverStarted ||
      !gameState ||
      !Array.isArray(gameState.players) ||
      gameState.players.length === 0
    ) {
      return;
    }

    broadcastGameState(gameState);
  }, [gameState, serverStarted]);

  /**
   * Remove only lobby-specific "data" listeners when CreateServerPage
   * unmounts.
   *
   * IMPORTANT:
   * We intentionally DO NOT close PeerJS connections here because they
   * must survive navigation to TraderList / Wholesale / GamePage.
   */
  useEffect(() => {
    return () => {
      lobbyDataHandlersRef.current.forEach((handler, conn) => {
        conn.off('data', handler);
      });

      lobbyDataHandlersRef.current.clear();
    };
  }, []);

  const handleStartGame = () => {
    if (!userName || !selectedColor) {
      alert('Please fill in your name and select a color.');
      return;
    }

    if (numberOfPlayers < 2 || numberOfPlayers > 6) {
      alert('Please enter a number of players between 2 and 6.');
      return;
    }

    const startServer = () => {
      try {
        const newPeer = new Peer();

        peerRef.current = newPeer;

        /**
         * Temporary global compatibility.
         *
         * Existing pages currently rely on global state while we migrate
         * toward a proper game/network layer.
         */
        window.currentPrivozPeer = newPeer;

        newPeer.on('open', id => {
          setPeerId(id);
          setHostId(id);

          addLog('PeerJS server started with ID: ' + id);

          const hostPlayer = {
            user_id: id,
            name: userName,
            className: 'host',
            color: selectedColor,
            traders: [],
            coins: 10,
            tradersCount: 0,
            sectorsWithTraders: [],
            position_in_game: 'hand',
            eventCards: [],
            isHost: true,
            playerCount: numberOfPlayers,
          };

          const initialGameState = {
            gameId: createGameId(),
            players: [hostPlayer],
            currentTurnUserId: id,
            round: 1,
            phase: PHASES.LOBBY,
            traderList,
            products,
            eventcards,
          };

          setGameState(initialGameState);

          window.gameState = initialGameState;
          window.myUserId = id;
          window.peerId = id;
          window.currentPrivozConnection = null;
        });

        newPeer.on('connection', conn => {
          addLog('New player connected: ' + conn.peer);

          /**
           * Add the connection exactly once.
           *
           * The old implementation added the same connection several
           * times using push(), setConnections() and array spreading.
           */
          const wasAdded = addConnection(conn);

          if (!wasAdded) {
            addLog(`Duplicate connection ignored: ${conn.peer}`);
            return;
          }

          const handleConnectionData = data => {
            addLog('Received data from ' + conn.peer + ': ' + JSON.stringify(data));

            console.log('HOST RECEIVED:', data);

            if (data.type !== 'join') {
              return;
            }

            /**
             * Always use functional setState here.
             *
             * That guarantees validation happens against the latest host
             * state instead of a stale gameState captured when the
             * connection listener was created.
             */
            setGameState(prev => {
              if (!prev) {
                return prev;
              }

              // Maximum number of players reached.
              if (prev.players.length >= numberOfPlayers) {
                sendToConnection(conn, {
                  type: 'connectionDenied',
                  message: 'Maximum number of players reached.',
                });

                conn.close();

                return prev;
              }

              // Peer already joined.
              if (prev.players.some(player => player.user_id === conn.peer)) {
                sendToConnection(conn, {
                  type: 'alreadyJoined',
                  message: 'You are already in the game.',
                });

                return prev;
              }

              // Player name already exists.
              if (prev.players.some(player => player.name === data.playerName)) {
                sendToConnection(conn, {
                  type: 'nameTaken',
                  message: 'This name is already taken.',
                });

                return prev;
              }

              // Player color already exists.
              if (prev.players.some(player => player.color === data.color)) {
                sendToConnection(conn, {
                  type: 'colorTaken',
                  message: 'This color is already taken.',
                });

                return prev;
              }

              const newPlayer = {
                user_id: conn.peer,
                name: data.playerName,
                className: 'player',
                color: data.color,
                traders: [],
                coins: 10,
                tradersCount: 0,
                sectorsWithTraders: [],
                position_in_game: 'hand',
                eventCards: [],
                isBot: data.isBot === true,
                botPolicyVersion:
                  data.isBot === true && typeof data.botPolicyVersion === 'string'
                    ? data.botPolicyVersion
                    : null,
                botBehaviorProfile:
                  data.isBot === true ? normalizeBotBehaviorProfile(data.botBehaviorProfile) : null,
              };

              return {
                ...prev,
                players: [...prev.players, newPlayer],
              };
            });
          };

          /**
           * Store the exact function passed to conn.on().
           *
           * Without keeping this reference, conn.off('data', ...) cannot
           * remove the listener later.
           */
          lobbyDataHandlersRef.current.set(conn, handleConnectionData);

          conn.on('data', handleConnectionData);

          conn.on('close', () => {
            addLog(`Player ${conn.peer} disconnected`);

            removeConnection(conn);
            lobbyDataHandlersRef.current.delete(conn);

            setGameState(prev => {
              if (!prev) {
                return prev;
              }

              return {
                ...prev,
                players: prev.players.map(player =>
                  player.user_id === conn.peer
                    ? {
                        ...player,
                        disconnected: true,
                      }
                    : player
                ),
              };
            });
          });

          conn.on('error', error => {
            console.error(`PeerJS connection error for ${conn.peer}:`, error);

            addLog(`Connection error for ${conn.peer}: ${error.message}`);
          });
        });

        newPeer.on('error', error => {
          addLog('PeerJS error: ' + error.message);
          console.error('PeerJS error:', error);
        });
      } catch (error) {
        addLog('Error starting PeerJS server: ' + error.message);

        console.error('Error starting PeerJS server:', error);
      }
    };

    setServerStarted(true);
    addLog('Server started for signaling...');

    startServer();
  };

  /**
   * Start the actual game and redirect everybody from the lobby.
   */
  const handleStopAddingPlayers = () => {
    if (!gameState || !peerId) {
      alert('The game server is still starting. Please try again.');
      return;
    }
    const startedGameState = {
      ...gameState,
      phase: PHASES.TRADER_SELECTION,
    };

    setGameStarted(true);
    setGameState(startedGameState);

    addLog(
      'Game started with players: ' +
        (startedGameState.players?.map(player => player.name).join(', ') || '')
    );

    window.gameState = startedGameState;
    window.myUserId = peerId;
    window.peerId = peerId;
    window.currentPrivozConnection = null;

    connectionsRef.current.forEach(conn => {
      sendToConnection(conn, {
        type: 'startGame',
        gameState: startedGameState,
        myUserId: conn.peer,
        redirect: '/traders',
      });
    });

    const currentUserData =
      startedGameState.players?.find(player => player.user_id === hostId) || null;

    const otherUsers = startedGameState.players?.filter(player => player.user_id !== hostId) || [];
    /**
     * TEMPORARY COMPATIBILITY.
     *
     * TraderList / Wholesale still read this global.
     * Do not remove it until those pages are migrated.
     */
    window.connectionsRefPrivozConnection = connectionsRef;

    navigate(`/traders/${peerId}`, {
      state: {
        gameState: startedGameState,
        myUserId: peerId,
        currentUserData,
        otherUsers,
        connection: null,
      },
    });
  };

  return (
    <div className="container-fluid">
      <div className="row flex-column flex-sm-row">
        <div className="col-12 col-sm-9 order-2 order-sm-1 d-flex flex-column align-items-center text-center">
          <h1>{t('create_game_as_host')}</h1>

          <div className="mb-3">
            <label htmlFor="userName" className="form-label">
              {t('enter_your_name')}
            </label>

            <input
              type="text"
              className="form-control"
              id="userName"
              value={userName}
              onChange={event => setUserName(event.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="colorSelect" className="form-label">
              {t('select_your_color')}
            </label>

            <select
              className="form-select"
              id="colorSelect"
              value={selectedColor}
              onChange={event => setSelectedColor(event.target.value)}
              required
            >
              <option value="" disabled>
                {t('select_color_placeholder')}
              </option>

              {['red', 'green', 'blue', 'orange', 'purple', 'brown']
                .filter(color => !(gameState?.players || []).some(player => player.color === color))
                .map(color => (
                  <option key={color} value={color}>
                    {t(`color_${color}`)}
                  </option>
                ))}
            </select>
          </div>

          <div className="mb-3">
            <label htmlFor="numberOfPlayers" className="form-label">
              {t('number_of_players')}
            </label>

            <select
              className="form-select"
              id="numberOfPlayers"
              value={numberOfPlayers}
              onChange={event => setNumberOfPlayers(parseInt(event.target.value, 10))}
            >
              {[2, 3, 4, 5, 6].map(number => (
                <option key={number} value={number}>
                  {number}
                </option>
              ))}
            </select>
          </div>

          {!serverStarted && (
            <button className="btn btn-primary" onClick={handleStartGame}>
              {t('start_game')}
            </button>
          )}

          {serverStarted && (
            <button
              className="btn btn-danger ms-3"
              onClick={handleStopAddingPlayers}
              disabled={gameStarted}
            >
              {t('host_start_game')}
            </button>
          )}

          {serverStarted && peerId && (
            <div className="connectlink d-flex flex-column align-items-center mt-3">
              <button
                type="button"
                className="btn btn-outline-primary mb-3"
                disabled={!virtualPlayerUrl || (gameState?.players?.length || 0) >= numberOfPlayers}
                onClick={() => window.open(virtualPlayerUrl, '_blank', 'noopener,noreferrer')}
              >
                {t('add_virtual_player')}
              </button>

              <div className="mb-2" style={{ minWidth: 240 }}>
                <label htmlFor="bot-behavior-profile" className="form-label mb-1">
                  {t('bot_behavior_profile')}
                </label>
                <select
                  id="bot-behavior-profile"
                  className="form-select"
                  value={botBehaviorProfile}
                  onChange={event => setBotBehaviorProfile(event.target.value)}
                >
                  {BOT_BEHAVIOR_PROFILES.map(profile => (
                    <option key={profile} value={profile}>
                      {t(`bot_profile_${profile}`)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="btn btn-outline-success mb-3"
                disabled={!botPlayerUrl || (gameState?.players?.length || 0) >= numberOfPlayers}
                onClick={() => window.open(botPlayerUrl, '_blank', 'noopener,noreferrer')}
              >
                {t('add_bot_player')}
              </button>

              <p className="mb-1">
                <strong>{t('join_game')}:</strong>
              </p>

              <a href={joinGameUrl} target="_blank" rel="noreferrer" className="mb-4 text-break">
                {joinGameUrl}
              </a>

              <div className="telegram-invite">
                <p>Скопируй это приглашение и отправь в Telegram:</p>

                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    background: '#f4f4f4',
                    padding: 8,
                    borderRadius: 8,
                  }}
                >
                  {`🎲 Присоединяйся к игре «Привоз»!

Твой код: \`${peerId}\`

[🔗 Подключиться к игре](${joinGameUrl})
`}
                </pre>
              </div>
            </div>
          )}

          {serverStarted && peerId && (
            <div className="mt-3">
              <p>Server started! Share this Peer ID with other players to join the game:</p>

              <input type="text" readOnly className="form-control" value={peerId} />
            </div>
          )}

          {gameState?.players?.length > 0 && (
            <div className="mt-3">
              <h5>Connected Players:</h5>

              <ul className="list-group">
                {gameState.players.map(player => (
                  <li key={player.user_id} className="list-group-item">
                    {player.isHost
                      ? `${player.name} (Host - Game for ${numberOfPlayers} players)`
                      : `${player.name}${
                          player.isBot ? ` (Bot: ${player.botBehaviorProfile || 'balanced'})` : ''
                        }`}{' '}
                    - <span style={{ color: player.color }}>{player.color}</span>{' '}
                    {player.disconnected ? '(Temporarily Disconnected)' : ''}
                  </li>
                ))}
              </ul>

              {gameState.currentTurnUserId && (
                <div className="alert alert-info mt-3">
                  Сейчас ходит:{' '}
                  {
                    gameState.players.find(player => player.user_id === gameState.currentTurnUserId)
                      ?.name
                  }
                </div>
              )}
            </div>
          )}

          {logs.length > 0 && (
            <div className="mt-3">
              <h5>Logs:</h5>

              <ul className="list-unstyled">
                {logs.map((log, index) => (
                  <li key={index}>{log}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="col-12 col-sm-3 order-1 order-sm-2 border-start">
          <Menu
            gameState={gameState}
            connection={null}
            setGameState={setGameState}
            broadcastGameState={broadcastGameState}
            myUserId={peerId}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateServerPage;
