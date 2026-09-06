import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import PrivozSector from '../components/PrivozSector';
import Menu from '../components/Menu';
import { connectionsRef } from '../globals';
import { handleHostEndTurn } from '../logic/logic';

// ! Если ты ХОСТ — connectionsRef нужен!
//const connectionsRef = window.connectionsRef || { current: [] }; // для примера, можно прокинуть иначе

const GamePage = () => {
  const location = useLocation();
  const params = useParams();

  // --- Универсальная инициализация ---
  const initialGameState = location.state?.gameState || window.gameState || null;

  const initialMyUserId = location.state?.myUserId || window.myUserId || params.peerId || null;

  const initialConnection = location.state?.connection || window.currentPrivozConnection || null;

  const [gameState, setGameState] = useState(initialGameState);
  const [connection, setConnection] = useState(initialConnection);
  const [myUserId, setMyUserId] = useState(initialMyUserId);

  const isAuthorized = !!myUserId && !!gameState && Array.isArray(gameState.players);

  useEffect(() => {
    if (gameState) window.gameState = gameState;
    if (myUserId) window.myUserId = myUserId;
    if (connection) window.currentPrivozConnection = connection;
  }, [gameState, myUserId, connection]);

  // --- isHost логика (нет connection)
  const isHost = !connection;

  // --- Хост: объяви broadcastGameState (можно скопировать из CreateServerPage)
  function broadcastGameState(state = gameState) {
    // connectionsRef должен содержать все conn для PeerJS!
    // connectionsRef.current = [conn1, conn2, ...]
    if (!connectionsRef.current) return;
    connectionsRef.current.forEach(conn => {
      try {
        conn.send({ type: 'gameState', gameState: state });
      } catch (e) {
        // Отлов ошибок — чтобы не падало при недоступном клиенте
        // Можно залогировать
        console.log('[CLIENT] Получено сообщение gameState:', conn.state);
      }
    });
  }
  useEffect(() => {
    console.log('GameState изменился!', gameState);
  }, [gameState]);
  // --- Клиент: подписка на data
  useEffect(() => {
    if (!connection) {
      console.warn('[CLIENT] Нет connection — подписка не работает');
      return;
    }
    //   console.log('[CLIENT] Подписка на события DATA');
    const handleData = data => {
      // console.log('[CLIENT] Получено сообщение:', data);
      if (data.type === 'gameState') {
        setGameState(data.gameState);
        //  console.log('GameState изменился2!', data.gameState);
      }
    };
    connection.on('data', handleData);
    return () => {
      connection.off('data', handleData);
    };
  }, [connection]);

  useEffect(() => {
    console.log('[CLIENT] GameState обновился:', gameState);
    console.log('[CLIENT] Мой userId:', myUserId);
    if (gameState) {
      const curr = (gameState?.players || []).find(p => p.user_id === myUserId);
      console.log('[CLIENT] Текущий игрок:', curr);
      console.log('[CLIENT] Все игроки:', gameState.players);
      console.log('[CLIENT] Сейчас ходит:', gameState.currentTurnUserId);
    }
  }, [gameState, myUserId]);

  useEffect(() => {
    // console.log('[CLIENT] window.currentPrivozConnection:', window.currentPrivozConnection);
    // console.log('[CLIENT] connection:', connection);
  }, []);

  useEffect(() => {
    if (!isHost) return; // только для хоста

    // Навешиваем обработчик на все новые подключения (или на имеющиеся)
    connectionsRef.current.forEach(conn => {
      // обязательно сделать removeListener, если переустанавливаешь обработчик
      const handler = handleHostEndTurn({ connectionsRef, setGameState });
      conn.on('data', data => handler(data, conn));
    });

    // Чистка при размонтировании, если потребуется
    // return () => { ... }
  }, [isHost, setGameState]);

  // --- Вычисляем пользователей

  const currentUserData = gameState?.players?.find(p => p.user_id === myUserId) || null;
  const otherUsers = gameState?.players?.filter(p => p.user_id !== myUserId) || [];
  const myTurn = gameState?.currentTurnUserId === myUserId;

  const fallbackSectors = ['Fruits', 'Vegetables', 'Dairy', 'Meat', 'Fish', 'Household goods'];
  const sectors = gameState?.sectors || fallbackSectors;

  return (
    <div className="container-fluid">
      <div className="row">
        <h2>Privoz Bazar Game Session</h2>

        {/* Текущий игрок
        {currentUserData && (
          <div className="user-info mt-3">
            <h4>Current User Data:</h4>
            <p>
              <strong>Name:</strong> {currentUserData.name}
            </p>
            <p>
              <strong>Color:</strong>{' '}
              <span style={{ color: currentUserData.color }}>{currentUserData.color}</span>
            </p>
            <p>
              <strong>Coins:</strong> {currentUserData.coins}
            </p>
            <p>
              <strong>Traders Count:</strong> {currentUserData.tradersCount}
            </p>
            <p>
              <strong>Event Cards Count:</strong> {currentUserData.eventCards?.length || 0}
            </p>
          </div>
        )} */}

        {/* Остальные игроки */}
        {/* {otherUsers?.length > 0 && (
          <div className="other-users-info mt-3">
            <h4>Other Users in Game:</h4>
            <ul className="list-unstyled">
              {otherUsers.map((user, index) => (
                <li key={index}>
                  <p>
                    <strong>Name:</strong> {user.name}
                  </p>
                  <p>
                    <strong>Color:</strong> <span style={{ color: user.color }}>{user.color}</span>
                  </p>
                  <p>
                    <strong>Coins:</strong> {user.coins}
                  </p>
                  <p>
                    <strong>Traders Count:</strong> {user.traders?.length || 0}
                  </p>
                  <hr />
                </li>
              ))}
            </ul>
          </div>
        )} */}
        <div className="row flex-column flex-sm-row">
          {/* Игровые сектора */}
          <div className="col-12 col-sm-9 order-2 order-sm-1 d-flex flex-column align-items-center text-center">
            <div className="row yarr1">
              {sectors.map((sector, index) => (
                <div className="col-6 yarr1" key={index}>
                  <PrivozSector
                    category={sector}
                    maxTraders={otherUsers.length + 1}
                    gameState={gameState}
                    myUserId={myUserId}
                    connection={connection}
                    myTurn={myTurn}
                    setGameState={setGameState}
                    clickable={isAuthorized && myTurn}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Меню справа */}
          <div className="col-12 col-sm-3 order-1 order-sm-2 border-start">
            <Menu
              gameState={gameState}
              myUserId={myUserId}
              connection={connection}
              setGameState={isHost ? setGameState : undefined}
              broadcastGameState={isHost ? broadcastGameState : undefined}
              connectionsRef
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage;
