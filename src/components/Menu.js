import React, { useState, useEffect, useRef } from 'react';
import { PHASES } from '../game/phases';
import CoinsLog from './CoinsLog';
import EventDebugHistory from './EventDebugHistory';
import PlayerActivityHistory from './PlayerActivityHistory';

import { useTranslation } from 'react-i18next';
import {
  handleEndRound,
  getField,
  startEventChoicePhase,
  areAllEventChoicesIn,
  finalizeEndRoundWithEvents,
} from '../logic/logic';
import { connectionsRef } from '../globals';
import { applyHostGameAction, handleHostGameAction } from '../game/hostActionHandler';
import { ackEventResultsAction, endTurnAction, submitEventChoicesAction } from '../game/actions';
import { Link, useParams, useLocation } from 'react-router-dom';
import { Modal, Button, Row, Col } from 'react-bootstrap';
import CurrentPlayerInfo from './CurrentPlayerInfo';
import OtherPlayersInfo from './OtherPlayersInfo';
import FeedbackButton from './FeedbackButton';
import BotPlayerController from '../bot/BotPlayerController';
import { recordAcceptedLearningDecision } from '../learning/recordAcceptedLearningDecision';
import { recordLearningOutcome } from '../learning/recordLearningOutcome';
import {
  buildCoinChangeEntries,
  buildDebugStateSignature,
  buildEventHistoryEntries,
  buildPlayerActivityEntries,
  mergeHistoryEntries,
} from '../debug/gameDebugHistory';
import { DEBUG_HISTORY_EVENT, readDebugHistories } from '../debug/debugHistoryStorage';

const getLearningAdminUrl = () => {
  const learningApiUrl = process.env.REACT_APP_LEARNING_API_URL;

  if (learningApiUrl) {
    return learningApiUrl.replace(/\/learning\.php(?:\?.*)?$/, '/learning-admin.php');
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/learning-admin.php`;
  }

  return '/api/learning-admin.php';
};

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
  const learningAdminUrl = getLearningAdminUrl();

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

  const gameId = gameState?.gameId || 'defaultGame';
  const COIN_HISTORY_STORAGE_KEY = `debugCoinHistory:${gameId}`;
  const EVENT_HISTORY_STORAGE_KEY = `debugEventHistory:${gameId}`;
  const ACTIVITY_HISTORY_STORAGE_KEY = `debugActivityHistory:${gameId}`;

  // Текущий игрок и другие игроки
  const currentUserData = gameState?.players?.find(p => p.user_id === myUserId) || null;
  const otherUsers = gameState?.players?.filter(p => p.user_id !== myUserId) || [];
  const currentUserIsBot = currentUserData?.isBot === true;
  const gameEnded = gameState?.phase === PHASES.GAME_END && !!gameState?.gameOutcome;
  const finalRanking = Array.isArray(gameState?.gameOutcome?.ranking)
    ? gameState.gameOutcome.ranking
    : [];
  const finalWinners = finalRanking.filter(entry => entry?.isWinner === true);

  // Для каких страниц показываем кнопку "Конец хода"
  const specialPages = ['/game', '/traders', '/wholesale', '/eventcards'];
  const isSpecialPage = specialPages.some(page => pathname.startsWith(page));

  const myTurn = gameState?.currentTurnUserId === myUserId;
  const isHost = !connection; // у хоста нет connection
  const [hadProducts, setHadProducts] = useState(false);

  // Local debug histories. These are session-only diagnostics and are never sent
  // to learning storage. We keep histories for all observed players so the menu
  // can explain balance changes and event-card interactions while testing.
  const [coinHistoryByPlayer, setCoinHistoryByPlayer] = useState({});
  const [eventHistory, setEventHistory] = useState([]);
  const [activityHistory, setActivityHistory] = useState([]);
  const debugPrevStateRef = useRef(null);
  const debugStateSignatureRef = useRef('');

  useEffect(() => {
    let restoredCoins = {};
    let restoredEvents = [];
    let restoredActivity = [];

    try {
      const parsedCoins = JSON.parse(sessionStorage.getItem(COIN_HISTORY_STORAGE_KEY) || '{}');
      if (parsedCoins && typeof parsedCoins === 'object' && !Array.isArray(parsedCoins)) {
        restoredCoins = parsedCoins;
      }
    } catch {}

    try {
      const parsedEvents = JSON.parse(sessionStorage.getItem(EVENT_HISTORY_STORAGE_KEY) || '[]');
      if (Array.isArray(parsedEvents)) {
        restoredEvents = parsedEvents;
      }
    } catch {}

    try {
      const parsedActivity = JSON.parse(sessionStorage.getItem(ACTIVITY_HISTORY_STORAGE_KEY) || '[]');
      if (Array.isArray(parsedActivity)) {
        restoredActivity = parsedActivity;
      }
    } catch {}

    if (gameState?.players && Object.keys(restoredCoins).length === 0) {
      const ts = Date.now();
      restoredCoins = Object.fromEntries(
        gameState.players.map((player, playerIndex) => [
          player.user_id,
          [
            {
              id: `coin-init:${gameId}:${player.user_id}`,
              ts,
              playerId: player.user_id,
              playerIndex,
              playerName: player.name || `#${playerIndex + 1}`,
              before: Number(player.coins || 0),
              after: Number(player.coins || 0),
              delta: 0,
              reasonType: 'initial',
              context: { round: gameState.round || 1 },
            },
          ],
        ])
      );
    }

    setCoinHistoryByPlayer(restoredCoins);
    setEventHistory(restoredEvents);
    setActivityHistory(restoredActivity);
    try {
      sessionStorage.setItem(COIN_HISTORY_STORAGE_KEY, JSON.stringify(restoredCoins));
    } catch {}
    debugPrevStateRef.current = gameState;
    debugStateSignatureRef.current = buildDebugStateSignature(gameState);
    // The history baseline intentionally resets only when gameId changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  useEffect(() => {
    const refreshFromStorage = event => {
      if (event?.detail?.gameId && event.detail.gameId !== gameId) return;
      const restored = readDebugHistories(gameId);
      setCoinHistoryByPlayer(restored.coins);
      setEventHistory(restored.events);
      setActivityHistory(restored.activity);
    };

    window.addEventListener(DEBUG_HISTORY_EVENT, refreshFromStorage);
    return () => window.removeEventListener(DEBUG_HISTORY_EVENT, refreshFromStorage);
  }, [gameId]);

  useEffect(() => {
    if (!gameState?.gameId || gameState.gameId !== gameId) return;

    const nextSignature = buildDebugStateSignature(gameState);
    if (nextSignature === debugStateSignatureRef.current) return;

    const beforeState = debugPrevStateRef.current;
    if (beforeState?.gameId === gameState.gameId) {
      const coinEntries = buildCoinChangeEntries(beforeState, gameState);
      const eventEntries = buildEventHistoryEntries(beforeState, gameState);
      const activityEntries = buildPlayerActivityEntries(beforeState, gameState);

      if (coinEntries.length) {
        setCoinHistoryByPlayer(current => {
          const next = { ...current };
          coinEntries.forEach(entry => {
            next[entry.playerId] = mergeHistoryEntries(next[entry.playerId] || [], [entry], 300);
          });
          try {
            sessionStorage.setItem(COIN_HISTORY_STORAGE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      }

      if (eventEntries.length) {
        setEventHistory(current => {
          const next = mergeHistoryEntries(current, eventEntries, 300);
          try {
            sessionStorage.setItem(EVENT_HISTORY_STORAGE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      }

      if (activityEntries.length) {
        setActivityHistory(current => {
          const next = mergeHistoryEntries(current, activityEntries, 500);
          try {
            sessionStorage.setItem(ACTIVITY_HISTORY_STORAGE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    }

    debugPrevStateRef.current = gameState;
    debugStateSignatureRef.current = nextSignature;
  }, [
    gameState,
    gameId,
    COIN_HISTORY_STORAGE_KEY,
    EVENT_HISTORY_STORAGE_KEY,
    ACTIVITY_HISTORY_STORAGE_KEY,
  ]);

  const [showEventModal, setShowEventModal] = useState(false);
  const [positiveChoices, setPositiveChoices] = useState({}); // { cardId: "keep" | "use" }

  // вверху Menu:
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultsAcked, setResultsAcked] = useState(false);
  const outcomeSaveRef = useRef({ key: null, inFlight: false, saved: false });

  // HOST stores one privacy-safe final outcome in the learning log.
  useEffect(() => {
    if (!isHost || !gameEnded || !gameState?.gameOutcome || !gameState?.gameId) {
      return;
    }

    const outcome = gameState.gameOutcome;
    const outcomeKey = [
      gameState.gameId,
      outcome.completedRound,
      outcome.maxCoins,
      ...(outcome.winnerActorIndexes || []),
    ].join(':');
    const storageKey = `learningOutcomeSaved:${gameState.gameId}`;

    if (sessionStorage.getItem(storageKey) === outcomeKey) {
      return;
    }

    if (
      outcomeSaveRef.current.key === outcomeKey &&
      (outcomeSaveRef.current.inFlight || outcomeSaveRef.current.saved)
    ) {
      return;
    }

    outcomeSaveRef.current = { key: outcomeKey, inFlight: true, saved: false };

    recordLearningOutcome(gameState).then(result => {
      if (result?.saved) {
        sessionStorage.setItem(storageKey, outcomeKey);
        outcomeSaveRef.current = { key: outcomeKey, inFlight: false, saved: true };
      } else {
        outcomeSaveRef.current = { key: outcomeKey, inFlight: false, saved: false };
      }
    });
  }, [isHost, gameEnded, gameState]);

  // открываем модалку, если у текущего игрока появились строки лога
  // Показываем модалку только когда есть логи И они ещё не подтверждены локально
  useEffect(() => {
    const hasMyLogs = !!gameState?.eventResultLog?.[myUserId]?.length;
    if (hasMyLogs && !resultsAcked && !currentUserIsBot) setShowResultModal(true);
    if (!hasMyLogs) {
      // как только хост очистил логи и прислал стейт — сбрасываем локальный флаг
      setResultsAcked(false);
      setShowResultModal(false);
    }
  }, [gameState?.eventResultLog, myUserId, resultsAcked, currentUserIsBot]);

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

  // «Готово» в модалке — тот же host-authoritative action для человека и бота.
  const handleSubmitEventChoices = () => {
    setShowEventModal(false);
    setRoundProcessing(true);

    const filledChoices = finalizePositiveChoicesForSubmit(currentUserData, lang, positiveChoices);
    const action = submitEventChoicesAction({
      playerId: myUserId,
      positiveChoices: filledChoices,
      effectTargets,
    });

    if (connection?.open) {
      connection.send({
        type: 'gameAction',
        action,
      });
      return;
    }

    if (isHost) {
      applyHostGameAction({
        connectionsRef,
        setGameState,
        action,
        actorId: myUserId,
        onAcceptedAction: recordAcceptedLearningDecision,
      });
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
      !currentUserIsBot &&
      gameState?.phase === PHASES.PERSONAL_EVENTS &&
      gameState?.eventCardPhase &&
      !gameState?.eventCardPhase[myUserId]
    ) {
      setShowEventModal(true);
    } else {
      setShowEventModal(false);
    }
  }, [gameState?.phase, gameState?.eventCardPhase, myUserId, currentUserIsBot]);

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
    if (!myTurn || !myUserId) {
      return;
    }

    const action = endTurnAction({ playerId: myUserId });

    if (connection?.open) {
      connection.send({
        type: 'gameAction',
        action,
      });
      return;
    }

    if (isHost) {
      applyHostGameAction({
        connectionsRef,
        setGameState,
        action,
        actorId: myUserId,
        onAcceptedAction: recordAcceptedLearningDecision,
      });
    }
  };

  // ...внутри компонента Menu:
  const [roundProcessing, setRoundProcessing] = useState(false);

  useEffect(() => {
    // Сбрасываем roundProcessing, если раунд обновился
    setRoundProcessing(false);
  }, [gameState?.round]); // или [gameState.round]

  // Общий host-network listener.
  //
  // ВАЖНО:
  // Этот listener живёт в Menu, а не в TraderList/Wholesale/GamePage.
  // Menu присутствует на всех игровых страницах, поэтому host продолжает
  // принимать gameAction даже после перехода между страницами.
  //
  // Здесь обрабатываем все migrated gameAction, включая personal events/ACK.
  useEffect(() => {
    if (!isHost || typeof setGameState !== 'function' || !Array.isArray(connectionsRef.current)) {
      return undefined;
    }

    const gameActionHandler = handleHostGameAction({
      connectionsRef,
      setGameState,
      onAcceptedAction: recordAcceptedLearningDecision,
    });

    const subscriptions = connectionsRef.current.map(conn => {
      const onData = data => {
        gameActionHandler(data, conn);
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
  }, [isHost, setGameState]);

  // Когда все сдали — хост завершает раунд с учётом эффектов
  useEffect(() => {
    if (!isHost) return;
    if (!gameState?.phase || gameState.phase !== PHASES.PERSONAL_EVENTS) return;
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

  // ключ для хранения "последняя показанная версия"
  const seenKey = `eventResultsSeen:${myUserId}`;

  // local ref, чтобы переживать ремоунты внутри одной вкладки
  const lastSeenRef = React.useRef(Number(sessionStorage.getItem(seenKey) || 0));

  // 1) Открываем модал результатов, когда появились логи, и он ещё не ACK'нут
  //  const [myLogs, setMyLogs] = useState([]);
  const myLogs = gameState?.eventResultLog?.[myUserId] || [];
  const currentNonce = Number(gameState?.eventResultNonce || 0);
  const lastSeenLogSigRef = useRef(''); // сигнатура последней «увиденной» версии логов

  // следим за логами в gameState
  // useEffect(() => {
  //   const logs = gameState?.eventResultLog?.[myUserId] || [];
  //   setMyLogs(logs);

  //   const sig = logs.length ? JSON.stringify(logs) : '';

  //   if (logs.length === 0) {
  //     // логи очищены хостом — закрыть и сбросить «последнюю версию»
  //     setShowResultModal(false);
  //     lastSeenLogSigRef.current = '';
  //     return;
  //   }

  //   // новая версия логов? показываем модалку
  //   if (sig !== lastSeenLogSigRef.current) {
  //     setShowResultModal(true);
  //   }
  // }, [gameState?.eventResultLog, myUserId]);
  // показываем только если есть строки И nonce больше, чем уже видели
  useEffect(() => {
    if (!currentUserIsBot && myLogs.length > 0 && currentNonce > lastSeenRef.current) {
      setShowResultModal(true);
    }
  }, [myLogs.length, currentNonce, currentUserIsBot]);

  useEffect(() => {
    const shouldShow = !currentUserIsBot && myLogs.length > 0 && !resultsAcked;
    // на всякий случай закроем модал выбора перед показом результатов
    if (shouldShow) setShowEventModal(false);
    setShowResultModal(shouldShow);
  }, [myLogs.length, resultsAcked, currentUserIsBot]);

  // 2) Закрытие модала результатов + host-authoritative ACK.
  const onResultsOk = () => {
    setShowResultModal(false);

    // отмечаем, что эту версию уже видели
    lastSeenRef.current = currentNonce;
    sessionStorage.setItem(seenKey, String(currentNonce));

    const action = ackEventResultsAction({ playerId: myUserId });

    if (connection?.open) {
      connection.send({
        type: 'gameAction',
        action,
      });
    } else if (isHost) {
      applyHostGameAction({
        connectionsRef,
        setGameState,
        action,
        actorId: myUserId,
        onAcceptedAction: recordAcceptedLearningDecision,
      });
    }
  };
  // на случай ухода со страницы до клика — шлём ACK/помечаем как увиденное
  useEffect(() => {
    return () => {
      if (showResultModal && !currentUserIsBot) {
        lastSeenRef.current = currentNonce;
        sessionStorage.setItem(seenKey, String(currentNonce));
        const action = ackEventResultsAction({ playerId: myUserId });
        if (connection?.open) {
          connection.send({ type: 'gameAction', action });
        } else if (isHost) {
          applyHostGameAction({
            connectionsRef,
            setGameState,
            action,
            actorId: myUserId,
            onAcceptedAction: recordAcceptedLearningDecision,
          });
        }
      }
    };
  }, [showResultModal, currentNonce, connection, myUserId, setGameState, isHost, currentUserIsBot]);


  return (
    <div className="col">
      <BotPlayerController gameState={gameState} myUserId={myUserId} connection={connection} />
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
      <div className="feedback">
        <FeedbackButton
          gameState={gameState}
          myUserId={myUserId}
          connection={connection}
          connectionsRef={connectionsRef}
        />

        <div>
          <a
            href="https://privoz.kotucheniy.com.ua/api/feedback-admin.php"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-secondary mb-2"
          >
            {{
              ua: 'Переглянути звіти',
              ru: 'Посмотреть отчёты',
              es: 'Ver informes',
              en: 'View reports',
            }[lang] || 'View reports'}
          </a>
        </div>
        <div>
          <a
            href={learningAdminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-secondary mb-2"
          >
            {{
              ua: 'Історія ігор',
              ru: 'История игр',
              es: 'Historial de partidas',
              en: 'Game history',
            }[lang] || 'Game history'}
          </a>
        </div>
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
      {/* Финал игры / кнопка конец хода / инфо о ходе */}
      {gameEnded ? (
        <div className="alert alert-success mt-3">
          <strong>
            {{
              ua: 'Гру завершено',
              ru: 'Игра окончена',
              es: 'Partida terminada',
              en: 'Game over',
            }[lang] || 'Game over'}
          </strong>
          <div>
            {{
              ua: 'Завершено раундів',
              ru: 'Завершено раундов',
              es: 'Rondas completadas',
              en: 'Rounds completed',
            }[lang] || 'Rounds completed'}: {gameState?.gameOutcome?.completedRound}
          </div>
          <div>
            {{
              ua: finalWinners.length > 1 ? 'Переможці' : 'Переможець',
              ru: finalWinners.length > 1 ? 'Победители' : 'Победитель',
              es: finalWinners.length > 1 ? 'Ganadores' : 'Ganador',
              en: finalWinners.length > 1 ? 'Winners' : 'Winner',
            }[lang] || 'Winner'}:{' '}
            {finalWinners
              .map(entry => gameState.players?.[entry.actorIndex]?.name || `#${entry.actorIndex + 1}`)
              .join(', ')}{' '}
            - {gameState?.gameOutcome?.maxCoins || 0}
          </div>
          <div className="mt-2">
            {finalRanking.map(entry => (
              <div key={entry.actorIndex}>
                #{entry.place} {gameState.players?.[entry.actorIndex]?.name || `#${entry.actorIndex + 1}`}: {entry.coins}
              </div>
            ))}
          </div>
        </div>
      ) : isSpecialPage && myTurn ? (
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

            {isHost && !gameEnded && (
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
      <PlayerActivityHistory
        entries={activityHistory}
        lang={lang}
        playerId={myUserId}
        defaultOpen
      />
      <CoinsLog
        entries={coinHistoryByPlayer[myUserId] || []}
        lang={lang}
        defaultOpen
        limit={300}
      />
      <EventDebugHistory
        entries={eventHistory}
        lang={lang}
        playerId={myUserId}
        defaultOpen
      />
      {/* Информация о других игроках */}
      <OtherPlayersInfo
        otherUsers={otherUsers}
        lang={lang}
        coinHistoryByPlayer={coinHistoryByPlayer}
        eventHistory={eventHistory}
        activityHistory={activityHistory}
      />
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
                          {gameState.players
                            .filter(user => user.user_id !== myUserId)
                            .map(user => (
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
                                .filter(p => p.user_id !== myUserId)
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
                            .filter(p => p.user_id !== myUserId)
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

      <Modal show={showResultModal} onHide={onResultsOk} size="lg" centered>
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
