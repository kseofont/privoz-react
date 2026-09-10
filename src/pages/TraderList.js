import React, { useEffect, useState } from 'react';

import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Modal, Button } from 'react-bootstrap';

import Menu from '../components/Menu';

import localTradersData from '../data/TradersList.json';

import { connectionsRef } from '../globals';

import { handleHostEndTurn, getField } from '../logic/logic';

import { selectTraderAction } from '../game/actions';

import { gameReducer } from '../game/reducer';

import { recordAcceptedLearningDecision } from '../learning/recordAcceptedLearningDecision';


const TraderList = () => {
  const { t, i18n } = useTranslation();

  const lang = i18n.language || 'en';

  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const initialGameState = location.state?.gameState || window.gameState || null;

  const initialMyUserId = location.state?.myUserId || window.myUserId || params.peerId || null;

  const initialConnection = location.state?.connection || window.currentPrivozConnection || null;

  const [gameState, setGameState] = useState(initialGameState);

  const connection = initialConnection;
  const myUserId = initialMyUserId;

  const [allTraders, setAllTraders] = useState([]);

  const [selectedTrader, setSelectedTrader] = useState(null);

  const [showModal, setShowModal] = useState(false);

  /*
   * When a client sends SELECT_TRADER, it does not navigate immediately.
   *
   * We remember which trader it requested and wait until the
   * authoritative gameState from the host confirms ownership.
   */
  const [selectedTraderIdForRedirect, setSelectedTraderIdForRedirect] = useState(null);

  const isAuthorized =
    !!myUserId &&
    !!gameState &&
    Array.isArray(gameState.players) &&
    gameState.players.some(player => player.user_id === myUserId);

  /*
   * Host has no DataConnection to himself.
   */
  const isHost = !connection;

  const myTurn = isAuthorized && gameState?.currentTurnUserId === myUserId;

  /*
   * Local fallback data.
   */
  const defaultTraders = Array.isArray(localTradersData)
    ? localTradersData
    : Array.isArray(localTradersData.traders)
      ? localTradersData.traders
      : [];

  /*
   * Players inside an active game always use the synchronized
   * traderList from gameState.
   */
  const safeTraders = isAuthorized
    ? Array.isArray(gameState?.traderList)
      ? gameState.traderList
      : []
    : allTraders.length
      ? allTraders
      : defaultTraders;

  /*
   * Temporary navigation compatibility.
   *
   * This will disappear later when game session state is centralized.
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
   * Fallback trader list for non-connected visitors.
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
   * HOST BROADCAST
   *
   * Host sends only authoritative gameState to clients.
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
   * HOST LEGACY endTurn LISTENER
   *
   * gameAction is intentionally NOT handled here anymore.
   * It is handled by Menu, which remains mounted on all game pages.
   *
   * This page keeps only the legacy endTurn handler for now.
   */
  useEffect(() => {
    if (!isHost) {
      return undefined;
    }

    const endTurnHandler = handleHostEndTurn({
      connectionsRef,
      setGameState,
    });

    const subscriptions = connectionsRef.current.map(conn => {
      const onData = data => {
        endTurnHandler(data, conn);
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
   * CLIENT NETWORK LISTENER
   *
   * Client never decides whether SELECT_TRADER succeeded.
   * It waits for authoritative gameState from the host.
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
   * SELECT_TRADER
   *
   * HOST:
   * applies its own action locally because the host is authoritative,
   * then broadcasts the resulting state.
   *
   * CLIENT:
   * sends only its intent. It does NOT mutate gameState locally.
   */
  const handleSelectTrader = trader => {
    if (!gameState || !myUserId || !trader?.traderId || !myTurn) {
      return;
    }

    const action = selectTraderAction({
      playerId: myUserId,
      traderId: trader.traderId,
    });

    /*
     * HOST ACTION
     */
    if (isHost) {
      const nextState = gameReducer(gameState, action);

      /*
       * Reducer rejected the action.
       */
      if (nextState === gameState) {
        console.warn('[TraderList] Host SELECT_TRADER rejected:', action);

        return;
      }

      recordAcceptedLearningDecision({
        beforeState: gameState,
        afterState: nextState,
        action,
        actorId: myUserId,
      });

      /*
       * Remember expected trader before updating state.
       */
      setSelectedTraderIdForRedirect(trader.traderId);

      setShowModal(false);

      /*
       * Host owns authoritative state.
       */
      setGameState(nextState);

      /*
       * Host must immediately synchronize clients too.
       */
      broadcastGameState(nextState);

      return;
    }

    /*
     * CLIENT ACTION
     *
     * No local gameReducer().
     */
    if (!connection?.open) {
      console.error('[TraderList] Cannot send SELECT_TRADER: connection is not open.');

      return;
    }

    /*
     * Set this BEFORE sending.
     * When authoritative state comes back from host,
     * redirect effect below will verify that the trader
     * really belongs to this player.
     */
    setSelectedTraderIdForRedirect(trader.traderId);

    setShowModal(false);

    try {
      connection.send({
        type: 'gameAction',
        action,
      });
    } catch (error) {
      console.error('[TraderList] Failed to send SELECT_TRADER:', error);

      setSelectedTraderIdForRedirect(null);
    }
  };

  /*
   * AUTHORITATIVE REDIRECT
   *
   * Clicking the button is not sufficient.
   *
   * We navigate only when current gameState actually confirms
   * that this player owns the requested trader.
   */
  useEffect(() => {
    if (!selectedTraderIdForRedirect) {
      return;
    }

    const currentPlayer = gameState?.players?.find(player => player.user_id === myUserId);

    const hasTrader = currentPlayer?.traders?.some(
      trader => trader.traderId === selectedTraderIdForRedirect
    );

    if (!hasTrader) {
      return;
    }

    navigate(`/wholesale/${params.peerId}`);
  }, [gameState, myUserId, selectedTraderIdForRedirect, params.peerId, navigate]);

  const player = Array.isArray(gameState?.players)
    ? gameState.players.find(currentPlayer => currentPlayer.user_id === myUserId) || {}
    : {};

  /*
   * Display price mirrors reducer pricing.
   *
   * Current prototype:
   * 1st trader = 0
   * 2nd trader = 15
   * 3rd trader = 30
   */
  const price = (player.traders?.length || 0) * 15;

  const enoughCoins = Number(player.coins || 0) >= price;

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
                        alt={getField(trader, 'name', lang)}
                        style={{
                          maxHeight: '200px',

                          objectFit: 'cover',
                        }}
                      />
                    )}

                    <div className="card-body">
                      <h5 className="card-title">{getField(trader, 'name', lang)}</h5>

                      <p className="card-text">{getField(trader, 'bio', lang)}</p>
                    </div>

                    {isTaken && (
                      <div
                        style={{
                          position: 'absolute',

                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,

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
          <Modal.Title>{selectedTrader ? getField(selectedTrader, 'name', lang) : ''}</Modal.Title>
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
                  <b>Биография:</b> {selectedTrader ? getField(selectedTrader, 'bio', lang) : ''}
                </div>
              </>
            ) : (
              <div className="text-danger">
                Недостаточно монет для покупки! Не хватает {price - Number(player.coins || 0)}{' '}
                монет.
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
            onClick={() => {
              if (selectedTrader) {
                handleSelectTrader(selectedTrader);
              }
            }}
          >
            {isAuthorized ? (enoughCoins ? 'Выбрать торговца' : 'Не хватает монет') : 'Недоступно'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default TraderList;
