import React, { useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';

import { connectionsRef } from '../globals';

import localTradersData from '../data/TradersList.json';

import Menu from '../components/Menu';

import {
  handleHostEndTurn,
  handleSelectTrader as logicHandleSelectTrader,
  getField,
} from '../logic/logic';

const TraderList = () => {
  const [allTraders, setAllTraders] = useState([]);
  const [selectedTrader, setSelectedTrader] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedTraderIdForRedirect, setSelectedTraderIdForRedirect] = useState(null);

  const { t } = useTranslation();

  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  /*
   * Current legacy initialization.
   *
   * We keep window.* fallback for now because the rest of the game still
   * relies on it while navigating between pages.
   *
   * What we intentionally DO NOT restore here anymore is connectionsRef.
   * connectionsRef is already a shared object imported from globals.js.
   */
  const initialGameState = location.state?.gameState || window.gameState || null;

  const initialMyUserId = location.state?.myUserId || window.myUserId || params.peerId || null;

  const initialConnection = location.state?.connection || window.currentPrivozConnection || null;

  const [gameState, setGameState] = useState(initialGameState);

  /*
   * connection and myUserId don't change on this page.
   *
   * Previously they were useState values with unused setters.
   */
  const connection = initialConnection;
  const myUserId = initialMyUserId;

  const defaultTraders = Array.isArray(localTradersData)
    ? localTradersData
    : Array.isArray(localTradersData.traders)
      ? localTradersData.traders
      : [];

  const isAuthorized =
    !!myUserId &&
    !!gameState &&
    Array.isArray(gameState.players) &&
    gameState.players.some(player => player.user_id === myUserId);

  const safeTraders = isAuthorized
    ? Array.isArray(gameState?.traderList)
      ? gameState.traderList
      : []
    : allTraders.length
      ? allTraders
      : defaultTraders;

  /*
   * Host has no DataConnection to himself.
   */
  const isHost = !connection;

  const myTurn = isAuthorized && gameState?.currentTurnUserId === myUserId;

  /*
   * Keep the legacy global navigation state synchronized.
   *
   * IMPORTANT:
   * connectionsRef is NOT rewritten here anymore.
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
   * Fallback trader list for users who opened this page without joining
   * a game.
   */
  useEffect(() => {
    if (isAuthorized) {
      return;
    }

    fetch('/data/TradersList.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Ошибка при загрузке TradersList.json');
        }

        return response.json();
      })
      .then(data => {
        setAllTraders(data);
      })
      .catch(error => {
        console.error('Ошибка при fetch TradersList.json:', error);
      });
  }, [isAuthorized]);

  /*
   * Host broadcasts the current state to all connected clients.
   *
   * Closed connections are ignored instead of throwing.
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
        console.error(`[TraderList] Failed to send gameState to ${conn.peer}:`, error);
      }
    });
  };

  /*
   * HOST DATA LISTENERS
   *
   * Before:
   *
   * conn.on('data', data => handler(data, conn))
   *
   * was added every time TraderList mounted but was never removed.
   *
   * After several rounds the same connection could therefore have several
   * TraderList handlers.
   *
   * Now every exact listener is remembered and removed on unmount.
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
   * CLIENT DATA LISTENER
   *
   * This part was already conceptually correct. We keep the cleanup.
   */
  useEffect(() => {
    if (!connection) {
      return undefined;
    }

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

  /*
   * Select trader.
   *
   * Gameplay behavior intentionally remains unchanged during this
   * stabilization pass.
   */
  const handleSelectTrader = trader => {
    if (!gameState || !myUserId) {
      return;
    }

    setGameState(prev => {
      const nextState = logicHandleSelectTrader({
        gameState: prev,
        myUserId,
        trader,
      });

      setShowModal(false);

      setSelectedTraderIdForRedirect(trader.traderId);

      return nextState;
    });
  };

  /*
   * Redirect after the selected trader is present in the player's state.
   */
  useEffect(() => {
    if (!selectedTraderIdForRedirect) {
      return;
    }

    const currentPlayer = gameState?.players?.find(player => player.user_id === myUserId);

    const hasTrader = currentPlayer?.traders?.some(
      trader => trader.traderId === selectedTraderIdForRedirect
    );

    if (hasTrader) {
      navigate(`/wholesale/${params.peerId}`);
    }
  }, [gameState, myUserId, selectedTraderIdForRedirect, params.peerId, navigate]);

  const player =
    gameState && Array.isArray(gameState.players)
      ? gameState.players.find(currentPlayer => currentPlayer.user_id === myUserId) || {}
      : {};

  /*
   * Keep the existing game economy unchanged.
   */
  const price = (player.traders?.length || 0) * 15;

  const enoughCoins = (player.coins || 0) >= price;

  return (
    <div className="container-fluid">
      <div className="row flex-column flex-sm-row">
        <div className="col-12 col-sm-9 order-2 order-sm-1 d-flex flex-column justify-content-center align-items-center text-center">
          {!isAuthorized && (
            <div className="alert alert-warning mb-3">
              Вы не подключены к игре. Ниже - список всех доступных продавцов, но их нельзя выбрать.
              Для участия войдите в игру.
            </div>
          )}

          <h2>{t('chooseYourTrader')}</h2>

          <div className="row">
            {safeTraders.map(trader => {
              const isTaken = !!trader.taken;

              return (
                <div
                  key={trader.traderId}
                  className={`col-md-3 mb-4 ${isTaken ? 'opacity-50 pointer-events-none' : ''}`}
                  onClick={
                    isTaken || !myTurn
                      ? undefined
                      : () => {
                          setSelectedTrader(trader);
                          setShowModal(true);
                        }
                  }
                  style={{
                    cursor: isTaken || !myTurn ? 'not-allowed' : 'pointer',
                    position: 'relative',
                  }}
                >
                  <div className="card h-100 custom-card">
                    {trader.img && (
                      <img
                        src={trader.img}
                        className="card-img-top"
                        alt={getField(trader, 'name')}
                        style={{
                          maxHeight: '200px',
                          objectFit: 'cover',
                        }}
                      />
                    )}

                    <div className="card-body">
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

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{selectedTrader ? getField(selectedTrader, 'name') : ''}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {isAuthorized && !myTurn ? (
            <div className="text-danger">Сейчас не ваш ход. Выбор торговца невозможен.</div>
          ) : isAuthorized ? (
            enoughCoins ? (
              <>
                <div>Вы уверены, что хотите выбрать этого торговца?</div>

                <div>
                  Цена: <b>{price} монет</b>
                  <br />
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
            )
          ) : (
            <div className="text-warning">Для выбора продавца нужно быть подключённым к игре!</div>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Отмена
          </Button>

          <Button
            variant="primary"
            disabled={!enoughCoins || !isAuthorized || !myTurn}
            onClick={() => selectedTrader && handleSelectTrader(selectedTrader)}
          >
            {isAuthorized ? (enoughCoins ? 'Выбрать торговца' : 'Не хватает монет') : 'Недоступно'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TraderList;
