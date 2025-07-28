import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Peer from 'peerjs';
import { useNavigate, useLocation } from 'react-router-dom';
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

  // auto connection
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const peerIdFromUrl = params.get('peer_id');
    const nameFromUrl = params.get('name');
    const colorFromUrl = params.get('color');

    if (peerIdFromUrl) setHostPeerId(peerIdFromUrl);
    if (nameFromUrl) setUserName(nameFromUrl);
    if (colorFromUrl) setSelectedColor(colorFromUrl);

    // Если peer_id (и желательно имя+цвет) есть — сразу инициируй подключение
    if (peerIdFromUrl && nameFromUrl && colorFromUrl) {
      handleJoinGameAuto(peerIdFromUrl, nameFromUrl, colorFromUrl);
    }
  }, [location.search]);
  const handleJoinGameAuto = (peerId, name, color) => {
    setHostPeerId(peerId);
    setUserName(name);
    setSelectedColor(color);
    // Не вызывай alert'ы и не проверяй через форму — сразу пытайся подключиться
    // Но можно сделать небольшую проверку, если хочешь
    const newPeer = new Peer();
    setPeer(newPeer);

    newPeer.on('open', id => {
      setMyUserId(id);
      const conn = newPeer.connect(peerId);
      setConnection(conn);

      conn.on('open', () => {
        setConnected(true);
        window.currentPrivozConnection = conn;
        addLog(`[AUTO] Connected to host with ID: ${peerId}`);
        conn.send({
          type: 'join',
          playerName: name,
          color: color,
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

  // end auto location

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
          window.gameState = data.gameState;
          window.myUserId = data.myUserId; // получено от хоста
          window.peerId = hostPeerId; // ты к нему коннектился

          navigate(`/traders/${data.myUserId}`, {
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
    <div className="container-fluid">
      <div className="row flex-column flex-sm-row">
        <div className="col-12 col-sm-9 order-2 order-sm-1 d-flex flex-column justify-content-center align-items-center text-center">
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
        <div className="col-12 col-sm-3 order-1 order-sm-2 border-start">
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
