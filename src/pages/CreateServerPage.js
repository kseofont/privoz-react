import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Menu from '../components/Menu';
import { connectionsRef } from '../globals';
import { endTurn } from '../logic/logic'; // путь исправь если надо

import traderList from '../data/TradersList.json';
import products from '../data/products.json';
import eventcards from '../data/eventcards.json';

const CreateServerPage = () => {
  const [userName, setUserName] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [numberOfPlayers, setNumberOfPlayers] = useState(3);
  const [serverStarted, setServerStarted] = useState(false);
  const [peerId, setPeerId] = useState('');
  const [peer, setPeer] = useState(null);
  const [connections, setConnections] = useState([]);
  const [logs, setLogs] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);

  const { t, i18n } = useTranslation();

  const [hostId, setHostId] = useState('');
  const [initialGameState, setInitialGameState] = useState(null);

  //const connectionsRef = useRef([]);
  const navigate = useNavigate();

  const addLog = message => {
    setLogs(prevLogs => [...prevLogs, message]);
    console.log(message);
  };

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  const broadcastGameState = (state = gameState) => {
    connectionsRef.current.forEach(conn => {
      conn.send({ type: 'gameState', gameState: state });
    });
  };
  // Рассылка актуального gameState всем клиентам (и хосту!)
  useEffect(() => {
    if (serverStarted && gameState && gameState.players && gameState.players.length > 0) {
      connectionsRef.current.forEach(conn => {
        conn.send({ type: 'gameState', gameState });
      });
    }
  }, [gameState, serverStarted]);
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
        newPeer.on('open', id => {
          setPeerId(id);
          setHostId(id);
          setPeer(newPeer);
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
            players: [hostPlayer],
            currentTurnUserId: id,
            round: 1,
            traderList: traderList,
            products: products,
            eventcards: eventcards,
          };
          setGameState(initialGameState);
          window.gameState = initialGameState;
          window.myUserId = id;
          window.peerId = id;
          window.currentPrivozConnection = null; // у хоста нет connection
        });

        newPeer.on('connection', conn => {
          addLog('New player connected: ' + conn.peer);

          // Вот тут!
          connectionsRef.current.push(conn); // ← добавить новое соединение в глобальный массив
          setConnections([...connectionsRef.current]); // ← обновить локальный стейт (для реактивности)

          // Проверка на gameState и лимит игроков
          if (gameState && gameState.players && gameState.players.length >= numberOfPlayers) {
            addLog('Player connection denied: maximum number of players reached.');
            conn.send({ type: 'connectionDenied', message: 'Maximum number of players reached.' });
            conn.close();
            return;
          }

          setConnections(prev => [...prev, conn]);
          connectionsRef.current = [...connectionsRef.current, conn];

          conn.on('data', data => {
            addLog('Received data from ' + conn.peer + ': ' + JSON.stringify(data));
            console.log('HOST RECEIVED:', data);

            if (data.type === 'join') {
              // Проверки на лимит, уникальность цвета, уникальность игрока
              setGameState(prev => {
                if (!prev) return prev;
                // Лимит игроков
                if (prev.players.length >= numberOfPlayers) {
                  conn.send({
                    type: 'connectionDenied',
                    message: 'Maximum number of players reached.',
                  });
                  conn.close();
                  return prev;
                }
                // Уникальность id
                if (prev.players.some(player => player.user_id === conn.peer)) {
                  conn.send({ type: 'alreadyJoined', message: 'You are already in the game.' });
                  return prev;
                }
                // Имя уже занято
                if (prev.players.some(player => player.name === data.playerName)) {
                  conn.send({ type: 'nameTaken', message: 'This name is already taken.' });
                  return prev;
                }
                // Цвет уже занят
                if (prev.players.some(player => player.color === data.color)) {
                  conn.send({ type: 'colorTaken', message: 'This color is already taken.' });
                  return prev;
                }

                // Новый игрок
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
                };
                return {
                  ...prev,
                  players: [...prev.players, newPlayer],
                };
              });
            }
          });

          conn.on('close', () => {
            addLog(`Player ${conn.peer} disconnected`);
            setGameState(prev => ({
              ...prev,
              players: prev?.players
                ? prev.players.map(player =>
                    player.user_id === conn.peer ? { ...player, disconnected: true } : player
                  )
                : [],
            }));
            // broadcastGameState(gameState);
          });
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

  // Старт игры (рассылка gameState и переход на GamePage)
  const handleStopAddingPlayers = () => {
    setGameStarted(true);
    addLog('Game started with players: ' + (gameState?.players?.map(p => p.name).join(', ') || ''));

    window.gameState = gameState;
    window.myUserId = peerId;
    window.peerId = peerId;
    window.currentPrivozConnection = null;

    connectionsRef.current.forEach(conn => {
      conn.send({
        type: 'startGame',
        gameState,
        myUserId: conn.peer,
        redirect: '/traders',
      });
    });

    const currentUserData = gameState?.players?.find(p => p.user_id === hostId) || null;
    const otherUsers = gameState?.players?.filter(p => p.user_id !== hostId) || [];
    window.connectionsRefPrivozConnection = connectionsRef;

    navigate(`/traders/${peerId}`, {
      state: {
        gameState,
        myUserId: peerId,
        currentUserData,
        otherUsers,
        connection: null,
      },
    });
  };

  return (
    <div className="container mt-5">
      <div className="row">
        <div className="col-9">
          <h1> {t('create_game_as_host')}</h1>
          <div className="mb-3">
            <label htmlFor="userName" className="form-label">
              {t('enter_your_name')}
            </label>
            <input
              type="text"
              className="form-control"
              id="userName"
              value={userName}
              onChange={e => setUserName(e.target.value)}
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
              onChange={e => setSelectedColor(e.target.value)}
              required
            >
              <option value="" disabled>
                {t('select_color_placeholder')}
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
            <label htmlFor="numberOfPlayers" className="form-label">
              {t('number_of_players')}
            </label>
            <select
              className="form-select"
              id="numberOfPlayers"
              defaultValue={numberOfPlayers}
              onChange={e => setNumberOfPlayers(parseInt(e.target.value))}
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
            <div className="mt-3">
              <p>Server started! Share this Peer ID with other players to join the game:</p>
              <input type="text" readOnly className="form-control" value={peerId} />
            </div>
          )}

          {gameState?.players?.length > 0 && (
            <div className="mt-3">
              <h5>Connected Players:</h5>
              <ul className="list-group">
                {gameState.players.map((player, index) => (
                  <li key={index} className="list-group-item">
                    {player.isHost
                      ? `${player.name} (Host - Game for ${numberOfPlayers} players)`
                      : player.name}{' '}
                    - <span style={{ color: player.color }}>{player.color}</span>{' '}
                    {player.disconnected ? '(Temporarily Disconnected)' : ''}
                  </li>
                ))}
              </ul>
              {gameState?.currentTurnUserId && (
                <div className="alert alert-info mt-3">
                  Сейчас ходит:{' '}
                  {gameState.players.find(p => p.user_id === gameState.currentTurnUserId)?.name}
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
        <div className="col-3">
          <Menu
            // currentUserData={gameState?.players ? gameState.players.find(p => p.myUserId) : null}
            // otherUsers={gameState?.players ? gameState.players.filter(p => !p.myUserId) : []}
            gameState={gameState}
            connection={null} // ← вот так!
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
