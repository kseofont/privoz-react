import React, { useState, useEffect, useRef } from 'react';

import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';
import { connectionsRef } from '../globals';

import { Modal, Button } from 'react-bootstrap';

import Menu from '../components/Menu';
import { handleHostEndTurn, endTurn } from '../logic/logic';

const TraderList = () => {
  const [all_traders, setAllTraders] = useState([]);
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const location = useLocation();
  // --- Универсальная инициализация ---
  const params = useParams();
  const initialGameState = location.state?.gameState || window.gameState || null;

  const initialMyUserId = location.state?.myUserId || window.myUserId || params.peerId || null;

  const initialConnection = location.state?.connection || window.currentPrivozConnection || null;
  const initialConnections =
    location.state?.connections || window.connectionsRefPrivozConnection?.current || [];

  const [gameState, setGameState] = useState(initialGameState);
  const [connection, setConnection] = useState(initialConnection);
  const [myUserId, setMyUserId] = useState(initialMyUserId);

  useEffect(() => {
    if (gameState) window.gameState = gameState;
    if (myUserId) window.myUserId = myUserId;
    if (connection) window.currentPrivozConnection = connection;
    // Здесь перепишем защиту:
    if (Array.isArray(initialConnections) && initialConnections.length > 0) {
      connectionsRef.current = initialConnections;
    } else if (Array.isArray(window.connectionsRefPrivozConnection?.current)) {
      connectionsRef.current = window.connectionsRefPrivozConnection.current;
    } else {
      console.warn('[TraderList] connectionsRef.current не инициализирован!');
    }
  }, [gameState, myUserId, connection]);

  const [selectedTrader, setSelectedTrader] = useState(null);
  const [showModal, setShowModal] = useState(false);
  useEffect(() => {
    if (gameState && gameState.traderList) {
      setAllTraders(gameState.traderList);
    } else {
      // fallback — если traderList не передан
      fetch('/data/TradersList.json')
        .then(response => {
          if (!response.ok) {
            throw new Error('Ошибка при загрузке TradersList.json');
          }
          return response.json();
        })
        .then(data => setAllTraders(data))
        .catch(error => console.error('Ошибка при fetch TradersList.json:', error));
    }
  }, [gameState]);

  // Вынесем функцию безопасного доступа к переводимым полям
  const getField = (obj, field) => {
    const value = obj[field];
    if (!value) return '';
    if (typeof value === 'string') return value; // fallback для старых данных
    return value[lang] || value.en || Object.values(value)[0] || '';
  };
  useEffect(() => {
    console.log('[CLIENT] GameState обновился:', gameState);
    console.log('[CLIENT] Мой userId:', myUserId);
    if (gameState) {
      const curr = gameState.players.find(p => p.user_id === myUserId);
      console.log('[CLIENT] Текущий игрок:', curr);
      console.log('[CLIENT] Все игроки:', gameState.players);
      console.log('[CLIENT] Сейчас ходит:', gameState.currentTurnUserId);
    }
  }, [gameState, myUserId]);
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
  // end turn from gamepage
  useEffect(() => {
    const isHost = !connection;
    if (!isHost) return;

    // Навешиваем обработчик на все новые подключения (или на имеющиеся)
    connectionsRef.current.forEach(conn => {
      const handler = handleHostEndTurn({ connectionsRef, setGameState });
      conn.on('data', data => handler(data, conn));
    });
    console.log('[TraderList] myUserId, connection, isHost:', { myUserId, connection, isHost });
    // Чистка при размонтировании, если потребуется
    // return () => { ... }
  }, [connection, setGameState]);

  // Select Trader

  function handleSelectTrader(trader) {
    if (!gameState || !myUserId) return;

    setGameState(prev => {
      if (!prev) return prev;
      const players = prev.players.map(player => {
        if (player.user_id !== myUserId) return player;
        // Уже есть этот трейдер — выходим
        if (player.traders?.some(t => t.traderId === trader.traderId)) return player;

        // Если не хватает монет, не даём купить
        const tradersLen = player.traders?.length || 0;
        const currPrice = tradersLen * 15;
        if ((player.coins || 0) < currPrice) return player;

        const traderToAdd = {
          ...trader,
          card_in_game: `${myUserId}_hand`,
          taken: true,
        };
        return {
          ...player,
          traders: [...(player.traders || []), traderToAdd],
          tradersCount: (player.tradersCount || 0) + 1,
          coins: player.coins - currPrice,
        };
      });

      const traderList = prev.traderList
        ? prev.traderList.map(t => (t.traderId === trader.traderId ? { ...t, taken: true } : t))
        : prev.traderList;

      setShowModal(false);

      return { ...prev, players, traderList };
    });
  }

  useEffect(() => {
    if (!connection) return;

    const onData = data => {
      console.log('[TraderList] Received data:', data);
      if (data.type === 'gameState' && data.gameState) {
        setGameState(data.gameState);
      }
    };

    connection.on('data', onData);

    return () => {
      connection.off('data', onData);
    };
  }, [connection]);

  const player = gameState.players.find(p => p.user_id === myUserId) || {};
  const price = (player.traders?.length || 0) * 15;
  const enoughCoins = (player.coins || 0) >= price;

  useEffect(() => {
    if (isHost) {
      console.log('[TraderList][HOST] connectionsRef.current:', connectionsRef.current);
    }
  }, [isHost, gameState]);

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-9">
          <h2>All available traders</h2>
          <div className="row">
            {all_traders.map(trader => {
              const isTaken = !!trader.taken;
              return (
                <div
                  key={trader.traderId}
                  className={`col-md-4 mb-4 ${isTaken ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={
                    isTaken
                      ? undefined
                      : () => {
                          setSelectedTrader(trader);
                          setShowModal(true);
                        }
                  }
                  style={{
                    cursor: isTaken ? 'not-allowed' : 'pointer',
                    position: 'relative',
                  }}
                >
                  <div className="card h-100 custom-card">
                    {trader.img && (
                      <img
                        src={trader.img}
                        className="card-img-top"
                        alt={getField(trader, 'name')}
                        style={{ maxHeight: '200px', objectFit: 'cover' }}
                      />
                    )}
                    <div className="card-body">
                      <h5 className="card-title">{getField(trader, 'name')}</h5>
                      {/* остальные поля */}
                      <p className="card-text">
                        <strong>Bio:</strong> {getField(trader, 'bio')}
                      </p>
                      <h5 className="card-title">{getField(trader, 'name')}</h5>
                      <p className="card-text">
                        <strong>Bio:</strong> {getField(trader, 'bio')}
                      </p>
                      <p className="card-text">
                        <strong>Special:</strong> {getField(trader, 'special')}
                      </p>
                      <p className="card-text">
                        <strong>Trader Benefit:</strong> {getField(trader, 'trader_benefit')}
                      </p>
                      <p className="card-text">
                        <strong>Special Power:</strong> {getField(trader, 'special_power')}
                      </p>
                      <p className="card-text">
                        <strong>Sector Favorite:</strong> {getField(trader, 'sector_favorite')}
                      </p>
                      <p className="card-text">
                        <strong>Best Sector:</strong> {getField(trader, 'best_sector')}
                      </p>
                      <p className="card-text">
                        <strong>Extra Abilities:</strong> {getField(trader, 'extra_abilities')}
                      </p>
                      <p className="card-text">
                        <strong>Event Card Favorite ID:</strong> {trader.eventcards_favorite_id}
                      </p>
                      <p className="card-text">
                        <strong>Taken:</strong> {trader.taken ? 'Да' : 'Нет'}
                      </p>
                      <p className="card-text">
                        <strong>Goods:</strong>{' '}
                        {trader.goods && trader.goods.length > 0
                          ? trader.goods.join(', ')
                          : 'Нет товаров'}
                      </p>
                      {/* ... */}
                      {isTaken && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            right: '0',
                            bottom: '0',
                            background: 'rgba(128,128,128,0.6)',
                            color: 'white',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem',
                            borderRadius: '0.5rem',
                            zIndex: 5,
                          }}
                        >
                          Занят
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="col-3">
          {/* <Menu
            gameState={gameState}
            myUserId={myUserId}
            connection={connection}
            setGameState

            // передавай остальные пропсы по необходимости
          /> */}
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
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{selectedTrader ? getField(selectedTrader, 'name') : ''}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {enoughCoins ? (
            <>
              <div>Вы уверены, что хотите выбрать этого торговца?</div>
              <div>
                Цена: <b>{price} монет</b> <br />
                Ваши монеты: {player.coins || 0}
              </div>
              <div>
                <b>Биография:</b> {selectedTrader ? getField(selectedTrader, 'bio') : ''}
              </div>
            </>
          ) : (
            <div className="text-danger">
              Недостаточно монет для покупки! Не хватает {price - (player.coins || 0)} монет.
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Отмена
          </Button>
          <Button
            variant="primary"
            disabled={!enoughCoins}
            onClick={() => selectedTrader && handleSelectTrader(selectedTrader, price)}
          >
            {enoughCoins ? 'Выбрать торговца' : 'Не хватает монет'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TraderList;
