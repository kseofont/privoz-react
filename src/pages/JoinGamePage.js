import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Peer from 'peerjs';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Menu from '../components/Menu';

const JoinGamePage = () => {
  const [userName, setUserName] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [hostPeerId, setHostPeerId] = useState('');
  const [connected, setConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [peer, setPeer] = useState(null);
  const [connection, setConnection] = useState(null);
  const [gameState, setGameState] = useState(null); // только он теперь главный!
  const [logs, setLogs] = useState([]);

  const navigate = useNavigate();

  // Чтобы не терять свой user_id после входа:
  const [myUserId, setMyUserId] = useState(null);
  const { t, i18n } = useTranslation();

  const addLog = message => {
    setLogs(prevLogs => [...prevLogs, message]);
    console.log(message);
  };

  useEffect(() => {
    if (connected && connection) {
      connection.on('data', data => {
        addLog('Received data: ' + JSON.stringify(data));
        if (data.type === 'gameState') {
          setGameState(data.gameState);
        }
        if (data.type === 'colorTaken') {
          setErrorMessage('This color is already taken. Please choose a different color.');
        }
        if (data.type === 'nameTaken') {
          setErrorMessage('This name is already taken. Please choose a different name.');
        }
        if (data.type === 'startGame') {
          // В этот момент клиент получает финальный gameState и свой myUserId
          window.currentPrivozConnection = connection;
          navigate(`/game/${data.myUserId}`, {
            state: {
              gameState: data.gameState,
              myUserId: data.myUserId,
              //  connection: conn,
              //  connection: connection,
            },
          });
        }
      });
    }
  }, [connected, connection]);

  // Твой user_id сохраняем при открытии peer
  const handleJoinGame = () => {
    if (!hostPeerId || !userName || !selectedColor) {
      alert('Please fill in all the fields to join the game.');
      return;
    }
    const validationError = validateJoin({ userName, selectedColor, gameState });
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const newPeer = new Peer();
    setPeer(newPeer);

    newPeer.on('open', id => {
      setMyUserId(id); // Сохраняем свой user_id!
      const conn = newPeer.connect(hostPeerId);
      setConnection(conn);

      conn.on('open', () => {
        setConnected(true);
        window.currentPrivozConnection = conn;
        addLog(`Connected to host with ID: ${hostPeerId}`);
        // Отправляем данные о текущем пользователе хосту
        conn.send({
          type: 'join',
          playerName: userName,
          color: selectedColor,
        });
      });

      conn.on('error', error => {
        setErrorMessage(
          `Connection error: ${error.message || 'An error occurred while connecting to the host.'}`
        );
        addLog('Connection error: ' + error.message);
      });

      conn.on('close', () => {
        setConnected(false);
        setConnection(null);
        setErrorMessage('Disconnected unexpectedly from the host. Please try reconnecting.');
        addLog('[CLIENT] Disconnected from host.');
      });
    });

    newPeer.on('error', error => {
      setErrorMessage(
        `Peer error: ${
          error.message || 'An error occurred while initializing the peer connection.'
        }`
      );
      addLog('Peer error: ' + error.message);
    });
  };

  // "Вытаскиваем" currentUserData и otherUsers из gameState для совместимости
  const currentUserData = gameState?.players.find(p => p.user_id === myUserId) || null;
  const otherUsers = gameState?.players.filter(p => p.user_id !== myUserId) || [];

  // myTurn — сейчас твой ход?
  const myTurn = gameState?.currentTurnUserId === myUserId;

  function validateJoin({ userName, selectedColor, gameState }) {
    // Минимальная и максимальная длина имени
    if (!userName || userName.length < 2 || userName.length > 16) {
      return 'Name must be between 2 and 16 characters.';
    }
    // (Необязательно) Только буквы и цифры
    // if (!/^[a-zA-Zа-яА-Я0-9 _-]+$/.test(userName)) {
    //   return 'Name can only contain letters, numbers, spaces, - and _.';
    // }
    // Уникальность среди игроков, если уже кто-то подключился
    if (
      gameState &&
      gameState.players &&
      gameState.players.some(p => p.name?.toLowerCase() === userName.toLowerCase())
    ) {
      return 'This name is already taken. Please choose another.';
    }
    if (!selectedColor) {
      return 'Please select a color.';
    }
    return null;
  }

  return (
    <div className="container mt-5">
      <div className="row">
        <div className="col-9">
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
              onChange={e => setUserName(e.target.value)}
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
              onChange={e => setSelectedColor(e.target.value)}
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
              onChange={e => setHostPeerId(e.target.value)}
              required
            />
          </div>

          {!connected && (
            <button className="btn btn-success" onClick={handleJoinGame}>
              {t('join_game_button')}
            </button>
          )}

          {connected && (
            <div className="mt-3">
              <p>Successfully connected to the game! Please wait for the game to start...</p>
              <p>
                <strong>Connected to Host Peer ID:</strong> {hostPeerId}
              </p>
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

          {errorMessage && (
            <div className="mt-3 alert alert-danger">
              <p>{errorMessage}</p>
            </div>
          )}
        </div>
        {/* Передаем currentUserData и otherUsers в Menu — для совместимости */}
        <div className="col-3">
          <Menu
            currentUserData={gameState?.players ? gameState.players.find(p => p.isHost) : null}
            otherUsers={gameState?.players ? gameState.players.filter(p => !p.isHost) : []}
            gameState={gameState}
            connection={connection}
          />{' '}
        </div>
      </div>
    </div>
  );
};

export default JoinGamePage;
