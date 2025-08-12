import React, { useState, useEffect, useRef } from 'react';

import { useTranslation } from 'react-i18next';
import {
  endTurn,
  handleEndRound,
  getField,
  startEventChoicePhase,
  applyPlayerEventChoice,
  areAllEventChoicesIn,
  finalizeEndRoundWithEvents,
  makeEventChoiceMessage,
  makeEventLogAckMessage,
  clearEventLogForUser,
} from '../logic/logic';
import { connectionsRef } from '../globals';
import { Link, useParams, useLocation } from 'react-router-dom';
import { Modal, Button, Row, Col } from 'react-bootstrap';
import CurrentPlayerInfo from './CurrentPlayerInfo';
import OtherPlayersInfo from './OtherPlayersInfo';

const Menu = ({
  myUserId: propMyUserId,
  gameState: propGameState = null,
  connection = null,
  setGameState,
  broadcastGameState,
}) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const location = useLocation();
  const { peerId: urlPeerId } = useParams();
  const pathname = location.pathname;

  // --- Вычисляем myUserId и gameState (fallback из window, если нет в props)
  const gameState = propGameState || (typeof window !== 'undefined' && window.gameState) || null;
  const myUserId =
    propMyUserId ||
    urlPeerId ||
    (typeof window !== 'undefined' && window.myUserId) ||
    (propGameState?.players?.[0]?.user_id ?? null);

  const isAuthorized =
    !!myUserId &&
    !!gameState &&
    Array.isArray(gameState.players) &&
    gameState.players.some(p => p.user_id === myUserId);

  // Текущий игрок и другие игроки
  const currentUserData = gameState?.players?.find(p => p.user_id === myUserId) || null;
  const otherUsers = gameState?.players?.filter(p => p.user_id !== myUserId) || [];

  // Для каких страниц показываем кнопку "Конец хода"
  const specialPages = ['/game', '/traders', '/wholesale', '/eventcards'];
  const isSpecialPage = specialPages.some(page => pathname.startsWith(page));

  const myTurn = gameState?.currentTurnUserId === myUserId;
  const isHost = !connection; // у хоста нет connection
  const [hadProducts, setHadProducts] = useState(false);

  const [showEventModal, setShowEventModal] = useState(false);
  const [positiveChoices, setPositiveChoices] = useState({}); // { cardId: "keep" | "use" }

  // вверху Menu:
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultsAcked, setResultsAcked] = useState(false);

  // открываем модалку, если у текущего игрока появились строки лога
  // Показываем модалку только когда есть логи И они ещё не подтверждены локально
  useEffect(() => {
    const hasMyLogs = !!gameState?.eventResultLog?.[myUserId]?.length;
    if (hasMyLogs && !resultsAcked) setShowResultModal(true);
    if (!hasMyLogs) {
      // как только хост очистил логи и прислал стейт — сбрасываем локальный флаг
      setResultsAcked(false);
      setShowResultModal(false);
    }
  }, [gameState?.eventResultLog, myUserId, resultsAcked]);

  // очищаем только мой лог (чтобы не трогать чужие)
  const clearMyLogs = () => {
    if (!setGameState) return;
    setGameState(prev => {
      const current = prev?.eventResultLog || {};
      return {
        ...prev,
        eventResultLog: {
          ...current,
          [myUserId]: [],
        },
      };
    });
    setShowResultModal(false);
  };

  // const roundNum = gameState?.round || 1;

  // при нажатии "Конец раунда" хост переводит игру в фазу выбора событий
  const handleShowEventPhase = () => {
    if (!isHost || !setGameState) return;
    setGameState(prev => {
      const updated = startEventChoicePhase(prev);
      // разослать новое состояние
      broadcastGameState && setTimeout(() => broadcastGameState(updated), 0);
      return updated;
    });
  };

  // 1) Хелпер: финализируем выборы с дефолтами
  function finalizePositiveChoicesForSubmit(player, lang, rawChoices) {
    const result = { ...(rawChoices || {}) };
    const cards = Array.isArray(player?.eventCards) ? player.eventCards : [];
    const coins = Number(player?.coins || 0);

    cards.forEach((card, idx) => {
      if (card?.fortune !== 'positive') return;
      const key = card.id ?? idx;
      if (result[key]) return; // уже выбран

      const canKeep = coins >= 5;
      // дефолт: если можем заплатить — 'keep', иначе — 'use'
      result[key] = canKeep ? 'keep' : 'use';
    });

    return result;
  }

  // Клиент: «Готово» в модалке — отправляем свой выбор хосту (или применяем локально, если мы хост)
  const handleSubmitEventChoices = () => {
    setShowEventModal(false);
    setRoundProcessing(true);

    const filledChoices = finalizePositiveChoicesForSubmit(currentUserData, lang, positiveChoices);

    const outgoing = makeEventChoiceMessage({
      userId: myUserId,
      positiveChoices: filledChoices,
      effectTargets,
    });

    if (connection) {
      // клиент -> хост
      connection.send(outgoing);
    } else {
      // хост сам себе
      setGameState(prev => applyPlayerEventChoice(prev, myUserId, outgoing));
    }
  };

  useEffect(() => {
    if (!showEventModal || !currentUserData) return;

    setPositiveChoices(prev => {
      const next = { ...prev };
      const coins = Number(currentUserData.coins || 0);

      (currentUserData.eventCards || []).forEach((card, idx) => {
        if (card.fortune !== 'positive') return;
        const key = card.id ?? idx;
        if (next[key]) return;
        next[key] = coins >= 5 ? 'keep' : 'use';
      });

      return next;
    });
  }, [showEventModal, currentUserData]);

  // ---- Показ модалки, когда началась фаза и игрок ещё не подтвердил

  useEffect(() => {
    if (
      gameState?.phase === 'eventChoice' &&
      gameState?.eventCardPhase &&
      !gameState?.eventCardPhase[myUserId]
    ) {
      setShowEventModal(true);
    } else {
      setShowEventModal(false);
    }
  }, [gameState?.phase, gameState?.eventCardPhase, myUserId]);

  // const allEventChoicesDone =
  //   gameState?.phase === 'eventChoice' &&
  //   gameState.eventCardPhase &&
  //   Object.values(gameState.eventCardPhase).every(Boolean);

  useEffect(() => {
    if (!currentUserData) return;

    const hasProducts =
      Array.isArray(currentUserData.products) && currentUserData.products.length > 0;

    if (hasProducts && !hadProducts) {
      setHadProducts(true); // произошло первое добавление
    }
  }, [currentUserData?.products?.length]);

  useEffect(() => {
    if ((pathname === '/game' || pathname.startsWith('/game/')) && hadProducts) {
      setHadProducts(false);
    }
  }, [pathname]);

  const handleEndTurn = () => {
    //console.log('connection in menu', connection);
    endTurn({
      connection,
      myTurn,
      myUserId,
      gameState,
      setGameState,
      broadcastGameState,
      connectionsRef,
    });
  };

  // ...внутри компонента Menu:
  const [roundProcessing, setRoundProcessing] = useState(false);

  useEffect(() => {
    // Сбрасываем roundProcessing, если раунд обновился
    setRoundProcessing(false);
  }, [gameState?.round]); // или [gameState.round]

  // Хост слушает клиентов и собирает выборы
  useEffect(() => {
    if (!isHost || !connectionsRef.current) return;

    const unsubs = connectionsRef.current.map(conn => {
      const onData = data => {
        if (data?.type === 'eventCardChoiceDone') {
          setGameState(prev => applyPlayerEventChoice(prev, data.userId, data));
        }
      };
      conn.on('data', onData);
      return () => conn.off('data', onData);
    });

    return () => unsubs.forEach(unsub => unsub && unsub());
  }, [isHost, setGameState]);

  // Когда все сдали — хост завершает раунд с учётом эффектов
  useEffect(() => {
    if (!isHost) return;
    if (!gameState?.phase || gameState.phase !== 'eventChoice') return;
    if (!areAllEventChoicesIn(gameState)) return;

    // применить эффекты и завершить раунд
    finalizeEndRoundWithEvents({
      setGameState,
      isHost,
      broadcastGameState,
      handleEndRoundFn: handleEndRound, // твоя текущая функция
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, gameState?.eventCardPhase, gameState?.phase]);

  const [effectTargets, setEffectTargets] = useState({}); // {cardId: {playerId, sector, traderId}}

  // 1) Открываем модал результатов, когда появились логи, и он ещё не ACK'нут
  const [myLogs, setMyLogs] = useState([]);
  const lastSeenLogSigRef = useRef(''); // сигнатура последней «увиденной» версии логов

  // следим за логами в gameState
  useEffect(() => {
    const logs = gameState?.eventResultLog?.[myUserId] || [];
    setMyLogs(logs);

    const sig = logs.length ? JSON.stringify(logs) : '';

    if (logs.length === 0) {
      // логи очищены хостом — закрыть и сбросить «последнюю версию»
      setShowResultModal(false);
      lastSeenLogSigRef.current = '';
      return;
    }

    // новая версия логов? показываем модалку
    if (sig !== lastSeenLogSigRef.current) {
      setShowResultModal(true);
    }
  }, [gameState?.eventResultLog, myUserId]);
  useEffect(() => {
    const shouldShow = myLogs.length > 0 && !resultsAcked;
    // на всякий случай закроем модал выбора перед показом результатов
    if (shouldShow) setShowEventModal(false);
    setShowResultModal(shouldShow);
  }, [myLogs.length, resultsAcked]);

  // 2) Закрытие модала результатов + ACK -> хосту/очистка
  const onResultsOk = () => {
    console.log('click onResultsOk');
    // зафиксировать текущую версию как «увиденную», чтобы не автопоказывать её снова
    const sig = myLogs.length ? JSON.stringify(myLogs) : '';
    lastSeenLogSigRef.current = sig;
    setShowResultModal(false);
    //  setResultsAcked(true);

    if (connection) {
      connection.send(makeEventLogAckMessage(myUserId));
    } else if (setGameState) {
      setGameState(prev => clearEventLogForUser(prev, myUserId));
    }
  };
  // 3) Хост: принимаем ACK и чистим логи этого игрока (чтобы у него не всплыло снова)
  useEffect(() => {
    if (!isHost || !connectionsRef.current) return;
    const unsubs = connectionsRef.current.map(conn => {
      const onData = data => {
        if (data?.type === 'ackEventResults') {
          setGameState(prev => clearEventLogForUser(prev, data.userId));
        }
      };
      conn.on('data', onData);
      return () => conn.off('data', onData);
    });
    return () => unsubs.forEach(u => u && u());
  }, [isHost, setGameState]);

  return (
    <div className="col">
      <div className="language-block col-12 mb-4">
        <button onClick={() => i18n.changeLanguage('ua')}>Укр</button>
        <button onClick={() => i18n.changeLanguage('ru')}>Рус</button>
        <button onClick={() => i18n.changeLanguage('es')}>Esp</button>
        <button onClick={() => i18n.changeLanguage('en')}>Eng</button>
      </div>
      <div className="rules">
        <Link to="/rules" className="btn btn-primary mb-2">
          {t('menu_rules')}
        </Link>
      </div>
      <h3>Menu</h3>
      {/* Навигация */}
      <nav className="d-flex justify-content-between flex-column mb-3">
        <Link to="/" className="mb-2">
          {t('menu_start_page')}
        </Link>
        <h3>Game pages</h3>
        <Link to={`/game/${myUserId}`} className={`mb-2 ${hadProducts ? 'next_move' : ''}`}>
          {t('menu_privoz')}
        </Link>

        <Link to={`/wholesale/${myUserId}`}>{t('menu_wholesale')}</Link>
        <Link to={`/eventcards/${myUserId}`}>{t('menu_eventcards')}</Link>
        <Link to={`/traders/${myUserId}`} className="mb-2">
          {t('menu_traders')}
        </Link>
        <Link to="/create">{t('menu_create')}</Link>
        <Link to="/JoinGamePage">{t('menu_join')}</Link>
      </nav>
      {/* Кнопка конец хода/инфо о ходе */}
      {isSpecialPage && myTurn ? (
        <button className="btn btn-warning mt-3" onClick={handleEndTurn}>
          Закончить ход{isHost ? ' (Хост)' : ''}
        </button>
      ) : (
        gameState?.players && (
          <div className="alert alert-info mt-3">
            Сейчас ходит:{' '}
            {gameState.players.find(p => p.user_id === gameState.currentTurnUserId)?.name || (
              <span>...</span>
            )}
          </div>
        )
      )}
      {/* Кнопка и инфо по раунду */}
      {isAuthorized &&
        location.pathname !== '/' &&
        (gameState?.players?.some(p => p.traders?.length > 0) || gameState?.round > 1) && (
          <div className="mt-3">
            <div className="alert alert-info mb-2">Раунд: {gameState?.round || 1}</div>

            {isHost && (
              <div>
                <Button
                  variant="danger"
                  onClick={() => handleShowEventPhase(true)}
                  disabled={roundProcessing}
                >
                  Конец раунда
                </Button>
              </div>
            )}
          </div>
        )}
      {/* {isHost && allEventChoicesDone && (
        <Button variant="success" onClick={handleSubmitEventChoices}>
          Продолжить и завершить выбор
        </Button>
      )} */}
      {/* Информация о текущем игроке */}
      <CurrentPlayerInfo player={currentUserData} lang={lang} />
      {/* Информация о других игроках */}
      <OtherPlayersInfo otherUsers={otherUsers} lang={lang} />
      <Modal show={showEventModal} onHide={() => setShowEventModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Карты событий перед концом раунда</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            {/* NEGATIVE */}
            <Col md={6}>
              <h6>Негативные карты</h6>
              <ul>
                {(currentUserData?.eventCards || [])
                  .filter(card => card.fortune === 'negative')
                  .map((card, idx) => (
                    <li key={card.id || idx} className="mb-2 border p-2">
                      <strong>{getField(card, 'title', lang)}</strong>
                      <div>{getField(card, 'description', lang)}</div>
                      <div>Fortune: {card.fortune}</div>

                      {/* Кнопка сброса эффекта */}
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() =>
                          setEffectTargets(prev => ({ ...prev, [card.id]: undefined }))
                        }
                      >
                        Сбросить карту
                      </Button>

                      {/* Если карта нацелена на игрока */}
                      {card.goal_action === 'player' && (
                        <div>
                          <p>Выберите игрока:</p>
                          {gameState.players.map(user => (
                            <Button
                              key={user.user_id}
                              variant={
                                effectTargets[card.id]?.playerId === user.user_id
                                  ? 'primary'
                                  : 'outline-primary'
                              }
                              size="sm"
                              className="m-1"
                              onClick={() =>
                                setEffectTargets(prev => ({
                                  ...prev,
                                  [card.id]: { ...prev[card.id], playerId: user.user_id },
                                }))
                              }
                            >
                              {user.name}
                            </Button>
                          ))}
                        </div>
                      )}

                      {/* Если карта нацелена на сектор */}
                      {card.goal_action === 'sector' && (
                        <div>
                          <p>Выберите сектор:</p>
                          {[
                            ...new Set(
                              gameState.players
                                .flatMap(p => (p.traders || []).map(t => t.location))
                                .filter(Boolean)
                            ),
                          ].map(sector => (
                            <Button
                              key={sector}
                              variant={
                                effectTargets[card.id]?.sector === sector
                                  ? 'primary'
                                  : 'outline-primary'
                              }
                              size="sm"
                              className="m-1"
                              onClick={() =>
                                setEffectTargets(prev => ({
                                  ...prev,
                                  [card.id]: { ...prev[card.id], sector },
                                }))
                              }
                            >
                              {sector}
                            </Button>
                          ))}
                        </div>
                      )}

                      {/* Если карта нацелена на торговца */}
                      {card.goal_action === 'trader' && (
                        <div>
                          <p>Выберите торговца:</p>
                          {gameState.players
                            .flatMap(p => p.traders || [])
                            .map(trader => (
                              <Button
                                key={trader.traderId}
                                variant={
                                  effectTargets[card.id]?.traderId === trader.traderId
                                    ? 'primary'
                                    : 'outline-primary'
                                }
                                size="sm"
                                className="m-1"
                                onClick={() =>
                                  setEffectTargets(prev => ({
                                    ...prev,
                                    [card.id]: { ...prev[card.id], traderId: trader.traderId },
                                  }))
                                }
                              >
                                {getField(trader, 'name', lang)} ({trader.traderId})
                              </Button>
                            ))}
                        </div>
                      )}

                      {/* Можно добавить отображение текущего выбора */}
                      {effectTargets[card.id] && (
                        <div className="mt-2 text-muted small">
                          {effectTargets[card.id].playerId && (
                            <>
                              Цель: Игрок{' '}
                              {
                                gameState.players.find(
                                  u => u.user_id === effectTargets[card.id].playerId
                                )?.name
                              }
                            </>
                          )}
                          {effectTargets[card.id].sector && (
                            <>Цель: Сектор {effectTargets[card.id].sector}</>
                          )}
                          {effectTargets[card.id].traderId && (
                            <>Цель: Торговец {effectTargets[card.id].traderId}</>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            </Col>
            {/* POSITIVE */}
            <Col md={6}>
              <h6>Позитивные карты</h6>
              <ul>
                {(currentUserData?.eventCards || [])
                  .filter(card => card.fortune === 'positive')
                  .map((card, idx) => {
                    const canKeep = (currentUserData.coins || 0) >= 5;
                    const selected = positiveChoices[card.id || idx];
                    return (
                      <li key={card.id || idx} className="mb-2">
                        <strong>{getField(card, 'title', lang)}</strong>
                        <div>{getField(card, 'description', lang)}</div>
                        <div>
                          <label>
                            <input
                              type="radio"
                              name={`pos_${card.id || idx}`}
                              checked={selected !== 'use'}
                              disabled={!canKeep}
                              onChange={() =>
                                setPositiveChoices(prev => ({
                                  ...prev,
                                  [card.id || idx]: 'keep',
                                }))
                              }
                            />{' '}
                            Оставить на руке стоимость 5 монет, у вас сейчас {currentUserData.coins}
                            {!canKeep && (
                              <span className="text-danger ms-2">Недостаточно монет (нужно 5)</span>
                            )}
                          </label>
                          <label className="ms-3">
                            <input
                              type="radio"
                              name={`pos_${card.id || idx}`}
                              checked={selected === 'use'}
                              onChange={() =>
                                setPositiveChoices(prev => ({
                                  ...prev,
                                  [card.id || idx]: 'use',
                                }))
                              }
                            />{' '}
                            Применить сейчас
                          </label>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEventModal(false)}>
            Отмена
          </Button>
          <Button variant="success" onClick={handleSubmitEventChoices}>
            Продолжить и завершить раунд
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showResultModal} onHide={onResultsOk} size="lg" centered backdrop={false}>
        <Modal.Header closeButton>
          <Modal.Title>Результаты применения карт</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul className="mb-0">
            {myLogs.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={onResultsOk}>
            Ок
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Menu;
