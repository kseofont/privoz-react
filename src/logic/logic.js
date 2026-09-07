// logic.js
import { PHASES } from '../game/phases';
export function endTurn({ connection, myTurn, myUserId, gameState, setGameState, connectionsRef }) {
  console.log(' endTurn + gameState ', gameState);
  // console.log(' connection ', connection);
  // console.log(' setGameState ', setGameState);
  if (connection && myTurn) {
    // Только на клиенте
    console.log('[CLIENT] Отправляю endTurn + gameState хосту');
    connection.send({
      type: 'endTurn',
      playerId: myUserId,
      gameState,
    });
    // Optimistic UI, если хочешь:
    if (setGameState) {
      setGameState(prev => ({ ...prev, waitingForHost: true }));
    }
    return;
  }
  // Хосту: обновление состояния (только если setGameState передан)
  if (!connection && myTurn && typeof setGameState === 'function') {
    // !!! conn и data тут не определены, это должно быть внутри обработчика on('data')
    // Но если вызывается так — ты должен передать gameState как аргумент!
    setGameState(prev => {
      const incomingState = gameState;
      const currentIndex = incomingState.players.findIndex(
        p => p.user_id === incomingState.currentTurnUserId
      );
      const nextIndex = (currentIndex + 1) % incomingState.players.length;
      const nextUserId = incomingState.players[nextIndex].user_id;
      const updatedGameState = {
        ...incomingState,
        currentTurnUserId: nextUserId,
        waitingForHost: false,
      };
      console.log('[HOST] Рассылаю updatedGameState всем:', updatedGameState);
      connectionsRef.current.forEach(c => {
        c.send({ type: 'gameState', gameState: updatedGameState });
      });
      return updatedGameState;
    });
  }
}

// Обработка endTurn на стороне хоста
export function handleHostEndTurn({ connectionsRef, setGameState }) {
  // Верни функцию, которую будешь использовать как обработчик данных
  return function onHostData(data, conn) {
    // console.log('[HOST] Получил g');
    if (data.type === 'endTurn') {
      console.log(`[HOST] Получил endTurn от ${conn.peer}`, data);

      setGameState(prev => {
        // Используем gameState от клиента, если доверяешь, или только свой prev (лучше prev!)
        const incomingState = data.gameState || prev;
        // Тут можно вставить валидацию!

        // Вычисляем следующего игрока
        const currentIndex = incomingState.players.findIndex(
          p => p.user_id === incomingState.currentTurnUserId
        );
        const nextIndex = (currentIndex + 1) % incomingState.players.length;
        const nextUserId = incomingState.players[nextIndex].user_id;

        const updatedGameState = {
          ...incomingState,
          currentTurnUserId: nextUserId,
          waitingForHost: false,
        };

        // Рассылаем новый gameState всем клиентам
        if (connectionsRef && Array.isArray(connectionsRef.current)) {
          connectionsRef.current.forEach(c => {
            c.send({ type: 'gameState', gameState: updatedGameState });
          });
        }

        console.log('[HOST] Рассылаю updatedGameState всем:', updatedGameState);
        return updatedGameState;
      });
    }
  };
}

// Конец раунда
// Конец раунда: продаём все товары у всех трейдеров всех игроков
export function handleEndRound(setGameState, isHost, broadcastGameState) {
  if (typeof setGameState !== 'function') {
    console.log('setGameState is not available!');
    return;
  }

  setGameState(prev => {
    if (!prev || !Array.isArray(prev.players)) return prev;

    const updatedPlayers = prev.players.map(player => {
      let coinsEarned = 0;

      // Обрабатываем всех трейдеров игрока
      const updatedTraders = (player.traders || []).map(trader => {
        // Проверка: торговец размещён в секторе и есть товары
        if (
          typeof trader.card_in_game === 'string' &&
          trader.card_in_game.startsWith('sector_') &&
          Array.isArray(trader.goods) &&
          trader.goods.length > 0
        ) {
          // Считаем доход с каждого товара у этого торговца
          trader.goods.forEach(product => {
            const quantity = Number(product.quantity_player_card) || 0;
            // Название цены может быть sellingPrice, retailPrice или что-то ещё
            const sellingPrice =
              Number(product.sellingPrice) ||
              Number(product.retailPrice) ||
              Number(product.profit) ||
              0;
            coinsEarned += quantity * sellingPrice;
          });

          // Очищаем товары (после продажи)
          return {
            ...trader,
            goods: [],
            card_in_game: `${player.user_id}_hand`, // <- ключевое изменение
            location: null, // можно явно убрать сектор, если он был
          };
        }
        // Если не размещён или нет товаров, ничего не меняем
        return trader;
      });

      return {
        ...player,
        coins: (player.coins || 0) + coinsEarned,
        traders: updatedTraders,
      };
    });

    const nextRound = (prev.round || 1) + 1;
    const newState = {
      ...prev,
      round: nextRound,
      players: updatedPlayers,
      __roundProcessing: true, // временно блокируем повтор
      phase: PHASES.TRADER_SELECTION,
      eventCardPhase: undefined,
      playerEventChoices: undefined, // или сохранять в историю
    };

    if (isHost && typeof broadcastGameState === 'function') {
      broadcastGameState(newState);
    }

    return newState;
  });
}

// FOr translated text print
export const getField = (obj, field, lang = 'en') => {
  if (!obj || !obj[field]) return '';
  if (typeof obj[field] === 'string') return obj[field];
  if (typeof obj[field] === 'object') {
    return obj[field][lang] || obj[field].en || Object.values(obj[field])[0] || '';
  }
  if (typeof obj[field] === 'object') {
    console.warn('❗ ПОЛЕ НЕ ПРЕОБРАЗОВАНО:', field, obj[field]);
  }
  return '';
};

export function player_add_event(gameState, playerId) {
  // Всегда возвращаем:
  // [gameState, card | null]

  if (!gameState || !playerId) {
    return [gameState, null];
  }

  const eventCards = Array.isArray(gameState.eventcards) ? gameState.eventcards : [];

  const players = Array.isArray(gameState.players) ? gameState.players : [];

  // Сначала убеждаемся, что игрок существует.
  // Так мы не уменьшим колоду, если карту некому выдавать.
  const playerIdx = players.findIndex(player => player.user_id === playerId);

  if (playerIdx === -1) {
    return [gameState, null];
  }

  // Все доступные карты в колоде.
  const deckCards = eventCards.filter(
    card => card.position_in_game === 'deck' && Number(card.quantity_active) > 0
  );

  if (!deckCards.length) {
    return [gameState, null];
  }

  // Создаём weighted deck с учётом quantity_active.
  const expandedDeck = [];

  deckCards.forEach(card => {
    const quantity = Math.max(0, Number(card.quantity_active) || 0);

    for (let i = 0; i < quantity; i += 1) {
      expandedDeck.push(card);
    }
  });

  if (!expandedDeck.length) {
    return [gameState, null];
  }

  // Выбираем случайную карту.
  const randomIndex = Math.floor(Math.random() * expandedDeck.length);

  const chosenCard = expandedDeck[randomIndex];

  if (!chosenCard) {
    return [gameState, null];
  }

  // Находим оригинальную карту в общей колоде.
  const eventCardIndex = eventCards.findIndex(card => card.id === chosenCard.id);

  if (eventCardIndex === -1) {
    return [gameState, null];
  }

  // Уменьшаем quantity_active в общей колоде.
  const updatedEventCards = [...eventCards];

  updatedEventCards[eventCardIndex] = {
    ...updatedEventCards[eventCardIndex],

    quantity_active: Math.max(0, Number(updatedEventCards[eventCardIndex].quantity_active) - 1),
  };

  // Копия карты для руки игрока.
  const cardForPlayer = {
    ...chosenCard,

    position_in_game: `hand_${playerId}`,
    quantity_active: 1,
  };

  const player = players[playerIdx];

  const playerEventCards = Array.isArray(player.eventCards) ? [...player.eventCards] : [];

  const existingCardIndex = playerEventCards.findIndex(card => card.id === chosenCard.id);

  if (existingCardIndex !== -1) {
    playerEventCards[existingCardIndex] = {
      ...playerEventCards[existingCardIndex],

      quantity_active: Number(playerEventCards[existingCardIndex].quantity_active) + 1,
    };
  } else {
    playerEventCards.push(cardForPlayer);
  }

  const updatedPlayer = {
    ...player,
    eventCards: playerEventCards,
  };

  const updatedPlayers = [...players];

  updatedPlayers[playerIdx] = updatedPlayer;

  const updatedGameState = {
    ...gameState,

    eventcards: updatedEventCards,
    players: updatedPlayers,
  };

  return [updatedGameState, cardForPlayer];
}
// end round from menu
// logic/logic.js

/**
 * Переводим игру в фазу выбора событий (только хост).
 * Добавляет:
 *  - phase: 'eventChoice'
 *  - eventCardPhase: { [userId]: false } — еще не закончили
 *  - playerEventChoices: {}               — сюда будут складываться выборы
 */
export function startEventChoicePhase(prevGameState) {
  if (!prevGameState || !Array.isArray(prevGameState.players)) return prevGameState;
  const eventCardPhase = Object.fromEntries(prevGameState.players.map(p => [p.user_id, false]));
  return {
    ...prevGameState,
    phase: PHASES.PERSONAL_EVENTS,
    eventCardPhase,
    playerEventChoices: {}, // сбрасываем, чтобы начать заново
  };
}

/**
 * Кладём выбор конкретного игрока в gameState (может вызываться у хоста или локально, если хост сам себе).
 * positiveChoices: { [cardKey]: 'keep' | 'use' }
 * effectTargets:   { [cardId]: { playerId?, sector?, traderId? } }
 */
export function applyPlayerEventChoice(
  prevGameState,
  userId,
  { positiveChoices = {}, effectTargets = {} }
) {
  if (!prevGameState) return prevGameState;
  return {
    ...prevGameState,
    eventCardPhase: {
      ...(prevGameState.eventCardPhase || {}),
      [userId]: true,
    },
    playerEventChoices: {
      ...(prevGameState.playerEventChoices || {}),
      [userId]: { positiveChoices, effectTargets },
    },
  };
}

/**
 * Проверка: все ли игроки сдали выборы.
 */
export function areAllEventChoicesIn(gameState) {
  if (!gameState?.eventCardPhase) return false;
  return Object.values(gameState.eventCardPhase).every(Boolean);
}

/**
 * Применение выборов игроков к их картам/состоянию.
 * Здесь безопасно и иммутабельно обновляем игроков:
 *  - positive keep: спишем 5 монет (если хочешь), карта остаётся
 *  - positive use : применим эффект и удалим карту
 *  - negative     : обрабатывай через effectTargets (если есть), пример — пустышка ниже
 *
 * Возвращает НОВЫЙ gameState (без изменения round/продаж).
 */
// --- helpers ---------------------------------------------------------------

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getNumberFromArrayMaybe(arr, fallback = 0) {
  // формат эффектов у тебя такой: { extra_price: [1] }, { extra_product: [2] }
  if (Array.isArray(arr) && typeof arr[0] === 'number') return arr[0];
  if (typeof arr === 'number') return arr;
  return fallback;
}

// обновляем findTraderByTarget: возвращаем только размещённых по умолчанию
function findTraderByTarget(player, target = {}) {
  const traders = Array.isArray(player.traders) ? player.traders : [];

  if (target.traderId) {
    const t = traders.find(tr => tr.traderId === target.traderId && isPlaced(tr));
    if (t) return t;
  }
  if (target.sector) {
    const t = traders.find(tr => tr.location === target.sector);
    if (t) return t; // sector уже гарантирует isPlaced
  }
  // по умолчанию — любой размещённый, иначе любой
  return traders.find(isPlaced) || traders[0] || null;
}

function updateTraderInPlayer(player, traderToUpdate, updater) {
  const traders = Array.isArray(player.traders) ? player.traders : [];
  const idx = traders.findIndex(tr => tr.traderId === traderToUpdate.traderId);
  if (idx === -1) return player;
  const updatedTrader = updater(clone(traders[idx]));
  const nextTraders = [...traders];
  nextTraders[idx] = updatedTrader;
  return { ...player, traders: nextTraders };
}

function applyTraderFlags(trader, flags = {}) {
  // нормализуем ключ с ошибкой, но сохраним исходный
  const next = { ...trader };
  if (flags.Illigal_protection === true) {
    next.Illigal_protection = true;
    next.illegal_protection = true; // дублируем нормальный ключ, если пригодится
  }
  if (flags.trader_action) {
    next.trader_action = flags.trader_action; // например "free"
  }
  return next;
}

// --- helpers -----------------------------

function bumpSellingPriceForTraderGoodsWithCount(trader, delta = 0) {
  const goods = Array.isArray(trader.goods) ? trader.goods : [];
  if (!goods.length || !delta) return { trader: { ...trader }, changed: 0 };

  let changed = 0;
  const nextGoods = goods.map(g => {
    const sp = Number(g.sellingPrice) || 0;
    const newSP = sp + delta;
    if (newSP !== sp) changed += 1;
    return { ...g, sellingPrice: newSP };
  });
  return { trader: { ...trader, goods: nextGoods }, changed };
}

function bumpAllTradersGoodsPriceWithStats(player, delta = 0) {
  const traders = Array.isArray(player.traders) ? player.traders : [];
  let changedGoodsTotal = 0;
  let emptyTraders = 0;

  const nextTraders = traders.map(tr => {
    const goods = Array.isArray(tr.goods) ? tr.goods : [];
    if (!goods.length) {
      emptyTraders += 1;
      return { ...tr };
    }
    const { trader: bumped, changed } = bumpSellingPriceForTraderGoodsWithCount(tr, delta);
    changedGoodsTotal += changed;
    return bumped;
  });

  return {
    player: { ...player, traders: nextTraders },
    stats: {
      totalTraders: traders.length,
      emptyTraders,
      changedGoodsTotal,
    },
  };
}

function getLastTrader(player) {
  const list = Array.isArray(player.traders) ? player.traders : [];
  return list.length ? list[list.length - 1] : null;
}

// helpers again
function hasGoods(tr) {
  return Array.isArray(tr?.goods) && tr.goods.length > 0;
}
// ===== helpers: размещение и занятые трейдеры =====
function isPlaced(tr) {
  return !!tr?.location; // размещён в секторе
}
function lastOf(arr) {
  return Array.isArray(arr) && arr.length ? arr[arr.length - 1] : null;
}

function tradersWithGoodsAndLocation(player) {
  const list = Array.isArray(player.traders) ? player.traders : [];
  return list.filter(tr => isPlaced(tr) && hasGoods(tr));
}

function pickBaseGoodFromTrader(trader) {
  // возьмём последний товар как «базовый»
  const goods = Array.isArray(trader.goods) ? trader.goods : [];
  return lastOf(goods) || null;
}
function summarizeGood(g, lang = 'ru') {
  const name =
    (g &&
      (typeof g.productName === 'string'
        ? g.productName
        : g.productName?.[lang] || g.productName?.en)) ||
    (g && g.name) ||
    `#${g?.productId ?? 'unknown'}`;

  const sp = Number(g?.sellingPrice ?? g?.retailPrice ?? g?.profit ?? 0) || 0;
  const wp = Number(g?.wholesalePrice ?? 0) || 0;
  const pf = Number(g?.profit ?? sp - wp) || 0;
  const sec = g?.sector || g?.product_sector || '';
  const legal = g?.legality || '';

  return `${name} [price:${sp}, buy:${wp}, profit:${pf}${sec ? `, sector:${sec}` : ''}${
    legal ? `, ${legal}` : ''
  }]`;
}

function addClonedGoodToTrader(trader, goodToClone) {
  const goods = Array.isArray(trader.goods) ? [...trader.goods] : [];
  const sp =
    Number(goodToClone.sellingPrice) ||
    Number(goodToClone.retailPrice) ||
    Number(goodToClone.profit) ||
    0;

  const added = {
    ...JSON.parse(JSON.stringify(goodToClone)),
    sellingPrice: sp,
    quantity_player_card: 1,
  };
  goods.push(added);
  return { trader: { ...trader, goods }, addedGood: added };
}

function addOneClonedGoodToTrader(player, trader, goodToClone) {
  const res = addClonedGoodToTrader(trader, goodToClone);
  return {
    player: updateTraderInPlayer(player, trader, () => res.trader),
    addedGood: res.addedGood,
  };
}

/** Раскладываем extra_product среди трейдеров с goods и location */

function distributeExtraProductToBusyTraders(player, count = 1) {
  const busy = tradersWithGoodsAndLocation(player);
  if (!busy.length || count <= 0)
    return { player: null, affected: [], perTraderCounts: {}, added: [] };

  let updated = { ...player };
  const affected = [];
  const perTraderCounts = {};
  const added = []; // [{traderId, traderName, good}]

  if (count === 1) {
    const target = lastOf(busy);
    const baseGood = pickBaseGoodFromTrader(target);
    if (!baseGood) return { player: null, affected: [], perTraderCounts: {}, added: [] };
    const { player: p2, addedGood } = addOneClonedGoodToTrader(updated, target, baseGood);
    updated = p2;
    affected.push(target);
    perTraderCounts[target.traderId] = 1;
    added.push({
      traderId: target.traderId,
      traderName: target.name?.ru || target.name?.en || target.traderId,
      good: addedGood,
    });
    return { player: updated, affected, perTraderCounts, added };
  }

  let idx = 0;
  for (let i = 0; i < count; i++) {
    const target = busy[idx];
    const baseGood = pickBaseGoodFromTrader(target);
    if (baseGood) {
      const { player: p2, addedGood } = addOneClonedGoodToTrader(updated, target, baseGood);
      updated = p2;
      affected.push(target);
      perTraderCounts[target.traderId] = (perTraderCounts[target.traderId] || 0) + 1;
      added.push({
        traderId: target.traderId,
        traderName: target.name?.ru || target.name?.en || target.traderId,
        good: addedGood,
      });
    }
    idx = (idx + 1) % busy.length;
  }
  return { player: updated, affected, perTraderCounts, added };
}

// === NEGATIVE HELPERS ===

// взять игрока-жертву по id (если не нашли — null)
function findPlayerById(gameState, playerId) {
  if (!gameState?.players) return null;
  return gameState.players.find(p => p.user_id === playerId) || null;
}

// трейдеры игрока в конкретном секторе (только размещённые)
function tradersInSector(player, sector) {
  const list = Array.isArray(player.traders) ? player.traders : [];
  if (!sector) return [];
  const same = (a, b) =>
    typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
  return list.filter(tr => same(tr.location, sector));
}

// вернуть трейдера «на руку» (location -> null), по желанию очистить goods
function sendTraderToHand(trader, { clearGoods = false } = {}) {
  const ownerId = trader.traderOwnerId || trader.ownerId || trader.user_id || '';
  const next = {
    ...trader,
    location: null,
    card_in_game: ownerId ? `${ownerId}_hand` : 'hand',
  };
  if (clearGoods) next.goods = [];
  return next;
}

// заменить одного трейдера у игрока
function replaceTrader(player, traderId, newTraderObj) {
  const list = Array.isArray(player.traders) ? [...player.traders] : [];
  const idx = list.findIndex(t => t.traderId === traderId);
  if (idx === -1) return player;
  list[idx] = newTraderObj;
  return { ...player, traders: list };
}

// применить штраф к игроку (не уходим в минус)
function applyFineToPlayer(player, amountTotal) {
  const cur = Number(player.coins || 0);
  const dec = Math.max(0, Number(amountTotal || 0));
  const nextCoins = Math.max(0, cur - dec);
  return { ...player, coins: nextCoins };
}

// понижение цены на всех товарах трейдера на delta (>=0)
function pricePenaltyForTraderGoods(trader, delta = 0) {
  if (!delta) return { ...trader };
  const goods = Array.isArray(trader.goods)
    ? trader.goods.map(g => {
        const sp = Number(g.sellingPrice) || 0;
        return { ...g, sellingPrice: Math.max(0, sp - delta) };
      })
    : [];
  return { ...trader, goods };
}

// суммарно по игроку: понизить цены у всех трейдеров в указанном секторе
function pricePenaltyForSector(player, sector, delta = 0) {
  const list = Array.isArray(player.traders) ? player.traders : [];
  const next = list.map(tr => {
    if (tr?.location === sector) return pricePenaltyForTraderGoods(tr, delta);
    return tr;
  });
  return { ...player, traders: next };
}
// записать строку лога конкретному userId

function pushLogForUser(eventResultLog, userId, message) {
  if (!userId || !message) return;
  if (!eventResultLog[userId]) eventResultLog[userId] = [];
  eventResultLog[userId].push(message);
}

// защищён ли торговец «Крышей»
function isProtectedTrader(tr) {
  return !!(tr?.Illigal_protection || tr?.illegal_protection);
}

// понижение цены в секторе С ПРОПУСКОМ защищённых + статистика
function pricePenaltyForSectorWithStats(player, sector, delta = 0) {
  const list = Array.isArray(player.traders) ? player.traders : [];
  let changedGoods = 0;
  let protectedTraders = 0;
  let totalTradersInSector = 0;

  const next = list.map(tr => {
    if (!sameSector(tr?.location, sector)) return tr;
    totalTradersInSector += 1;

    if (isProtectedTrader(tr)) {
      protectedTraders += 1;
      return tr; // пропускаем
    }
    const goods = Array.isArray(tr.goods) ? tr.goods : [];
    if (!goods.length || !delta) return tr;

    const bumped = goods.map(g => {
      const sp = Number(g.sellingPrice) || 0;
      const newSP = Math.max(0, sp - delta);
      if (newSP !== sp) changedGoods += 1;
      return { ...g, sellingPrice: newSP };
    });
    return { ...tr, goods: bumped };
  });

  return {
    player: { ...player, traders: next },
    stats: { changedGoods, protectedTraders, totalTradersInSector },
  };
}

// сравнение секторов без учёта регистра/пробелов
function sameSector(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// найти жертву по сектору (не атакующего) среди ВСЕХ игроков
function findVictimBySector(allPlayers, attackerId, sector) {
  if (!sector) return null;
  return (
    allPlayers.find(
      p => p.user_id !== attackerId && (p.traders || []).some(t => sameSector(t.location, sector))
    ) || null
  );
}

export function applyEventChoicesToGameState(prevGameState) {
  if (!prevGameState || !Array.isArray(prevGameState.players)) return prevGameState;

  const choicesByUser = prevGameState.playerEventChoices || {};
  const roundNum = prevGameState.round || 1;

  // Сюда собираем логи «что изменили»
  const eventResultLog = {};
  // ключ: user_id жертвы -> целиком обновлённый объект игрока
  const patchesByUserId = {};

  const updatedPlayers = prevGameState.players.map(player => {
    const log = [];
    const logPush = msg => {
      if (msg) log.push(msg);
    };

    const userChoices = choicesByUser[player.user_id] || {};
    const positiveCh = userChoices.positiveChoices || {};
    const effectTargets = userChoices.effectTargets || {};
    let updated = { ...player };

    const cards = Array.isArray(player.eventCards) ? [...player.eventCards] : [];
    const nextCards = [];

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const key = card.id ?? i;

      if (card.fortune === 'positive') {
        const choice = positiveCh[key];

        if (choice === 'keep') {
          const cost = 5;
          const current = Number(updated.coins || 0);
          const canPay = current >= cost;

          if (canPay) {
            updated.coins = current - cost; // <-- нормализовано к number
            logPush(`Карта «${card.title?.ru || card.title?.en || card.id}»: удержали за 5 монет.`);
          } else {
            logPush(
              `Карта «${
                card.title?.ru || card.title?.en || card.id
              }»: монет не хватило, карта осталась без списания.`
            );
          }

          nextCards.push(card);
          continue;
        }

        if (choice === 'use') {
          const cardTitle = card.title?.ru || card.title?.en || card.id;
          logPush(`Карта «${cardTitle}»: применена.`); // <-- базовый лог, всегда
          updated[`effect_${roundNum}`] = card.effect ?? true;

          const effects = Array.isArray(card.effect) ? card.effect : [];
          const target = effectTargets[card.id] || effectTargets[key] || {};

          // --- EXTRA PRODUCT: добавляем к занятым трейдерам (goods+location), не с руки
          const extraProdItem = effects.find(e => e && e.extra_product);

          if (extraProdItem) {
            const count = getNumberFromArrayMaybe(extraProdItem.extra_product, 1);
            const cardTitle2 = card.title?.ru || card.title?.en || card.id;

            if (count <= 0) {
              logPush(`Карта «${cardTitle2}»: extra_product = 0 — изменений нет.`);
            } else {
              const {
                player: distPlayer,
                affected,
                perTraderCounts,
                added,
              } = distributeExtraProductToBusyTraders(updated, count);

              //logPush(`Карта «${cardTitle2}»: distPlayer = ${distPlayer}.`);

              if (distPlayer) {
                updated = distPlayer;

                if (affected.length === 1) {
                  const tr = affected[0];
                  const n = perTraderCounts[tr.traderId] || count;
                  // какой именно товар добавили
                  const addInfo = added.find(a => a.traderId === tr.traderId);
                  const goodStr = addInfo ? summarizeGood(addInfo.good, 'ru') : 'товар';

                  logPush(
                    `Карта «${cardTitle2}»: добавлен ${n} товар к торговцу ` +
                      `${getField(tr, 'name', 'ru') || tr.traderId} — ${goodStr}.`
                  );
                } else {
                  // составим сводку: по каждому трейдеру — сколько добавлено

                  // по каждому трейдеру покажем, сколько и что
                  const perTraderLines = [];
                  const byTrader = added.reduce((acc, a) => {
                    (acc[a.traderId] ||= { name: a.traderName, goods: [] }).goods.push(a.good);
                    return acc;
                  }, {});
                  for (const [tid, info] of Object.entries(byTrader)) {
                    const goodsList = info.goods.map(g => summarizeGood(g, 'ru')).join(', ');
                    perTraderLines.push(`${info.name}: +${info.goods.length} (${goodsList})`);
                  }
                  logPush(
                    `Карта «${cardTitle2}»: добавлено ${count} товар(ов) среди занятых торговцев — ${perTraderLines.join(
                      '; '
                    )}.`
                  );
                }
              } else {
                logPush(
                  `Карта «${cardTitle2}»: нет ни одного размещённого торговца с товарами — добавить нечего.`
                );
              }
            }
          }

          // --- EXTRA PRICE с разными целями -------------------------

          // a) effect_goal: "trader" — +X всем твоим торговцам, лог с пустыми
          const extraPriceForTraders = effects.find(
            e => e && e.effect_goal === 'trader' && e.extra_price
          );
          if (extraPriceForTraders) {
            const delta = getNumberFromArrayMaybe(extraPriceForTraders.extra_price, 1);
            if (delta) {
              const { player: bumped, stats } = bumpAllTradersGoodsPriceWithStats(updated, delta);
              updated = bumped;
              const title = card.title?.ru || card.title?.en || card.id;
              const affectedTraders = (stats.totalTraders || 0) - (stats.emptyTraders || 0);
              const changedGoodsTotal = Number(stats?.changedGoodsTotal || 0);
              const emptyTraders = Number(stats?.emptyTraders || 0);
              const totalTraders = Number(stats?.totalTraders || 0);

              logPush(
                `Карта «${title}»: +${delta} к цене товаров у всех ваших торговцев. ` +
                  `Изменено товаров: ${changedGoodsTotal}. ` +
                  `Торговцев без товаров: ${emptyTraders}/${totalTraders} (без изменений).`
              );
            }
          }

          // b) effect_goal: "product" — +X только одному торговцу: таргет или последний; лог для пустых
          const extraPriceForOneTrader = effects.find(
            e => e && e.effect_goal === 'product' && e.extra_price
          );
          if (extraPriceForOneTrader) {
            const delta = getNumberFromArrayMaybe(extraPriceForOneTrader.extra_price, 1);
            if (delta) {
              // таргет из effectTargets, иначе — последний торговец игрока
              let trader = findTraderByTarget(updated, target);
              if (!trader) trader = getLastTrader(updated);

              const title = card.title?.ru || card.title?.en || card.id;
              if (trader) {
                const { trader: bumpedTrader, changed } = bumpSellingPriceForTraderGoodsWithCount(
                  trader,
                  delta
                );
                if (changed > 0) {
                  updated = updateTraderInPlayer(updated, trader, () => bumpedTrader);
                  logPush(
                    `Карта «${title}»: +${delta} к цене всех товаров у ` +
                      `${
                        getField(trader, 'name', 'ru') || trader.traderId
                      }. Изменено товаров: ${changed}.`
                  );
                } else {
                  logPush(
                    `Карта «${title}»: выбранный торговец ` +
                      `${
                        getField(trader, 'name', 'ru') || trader.traderId
                      } не имеет товаров — изменений нет.`
                  );
                }
              } else {
                logPush(`Карта «${title}»: у вас нет торговцев для повышения цены.`);
              }
            }
          }

          // c) goal_item: "trader" с флагами (защита/действие) — как раньше
          if (card.goal_item === 'trader') {
            const flagPayload = {};
            effects.forEach(e => {
              if (!e || typeof e !== 'object') return;
              if (e.Illigal_protection === true) flagPayload.Illigal_protection = true;
              if (e.trader_action) flagPayload.trader_action = e.trader_action;
            });

            if (flagPayload.Illigal_protection || flagPayload.trader_action) {
              const trader = findTraderByTarget(updated, target);
              if (trader) {
                updated = updateTraderInPlayer(updated, trader, tr =>
                  applyTraderFlags(tr, flagPayload)
                );
                const chunks = [];
                if (flagPayload.Illigal_protection) chunks.push('защита от нелегала');
                if (flagPayload.trader_action)
                  chunks.push(`действие: ${flagPayload.trader_action}`);
                logPush(
                  `Карта «${card.title?.ru || card.title?.en || card.id}»: у торговца ` +
                    `${
                      getField(trader, 'name', 'ru') || trader.traderId
                    } установлены флаги (${chunks.join(', ')}).`
                );
              } else {
                logPush(
                  `Карта «${
                    card.title?.ru || card.title?.en || card.id
                  }»: не выбран торговец для установки флагов.`
                );
              }
            }
          }

          // карту сжигаем после use
          continue;
        }

        // нет выбора — оставляем карту
        nextCards.push(card);
        continue;
      }

      // === NEGATIVE CARDS ===

      // === NEGATIVE CARDS ===
      if (card.fortune === 'negative') {
        // 1) нормализуем цель
        const tgtRaw = effectTargets[card.id] || effectTargets[key] || {};
        const sector = typeof tgtRaw.sector === 'string' ? tgtRaw.sector.trim() : undefined;
        const effects = Array.isArray(card.effect) ? card.effect : [];
        const goalAction = card.goal_action; // "sector"|"player"|"trader"
        const goalItem = card.goal_item; // "product"|"trader"|...
        const cardTitle = card.title?.ru || card.title?.en || card.id;
        const attackerId = player.user_id;

        // 2) ищем жертву по ВСЕМ игрокам исходного стейта (НЕ по updatedPlayers)
        const victim = findVictimBySector(prevGameState.players, attackerId, sector);

        if (!victim) {
          logPush(
            `Карта «${cardTitle}»: цель не выбрана или в секторе «${
              sector || '—'
            }» нет продавцов соперников — эффект не применён.`
          );
          continue; // карта не сработала
        }

        // ---- 1) Цены на ПРОДУКТАХ в секторе: price_fine ----
        const priceFineObj = effects.find(e => e && e.price_fine !== undefined);
        if (goalAction === 'sector' && goalItem === 'product' && priceFineObj) {
          const delta = Array.isArray(priceFineObj.price_fine)
            ? Number(priceFineObj.price_fine[0] || 0)
            : Number(priceFineObj.price_fine || 0);

          if (!sector || !delta) {
            logPush(`Карта «${cardTitle}»: сектор не указан или штраф=0 — изменения не применены.`);
            continue;
          }

          const { player: victimAfter, stats } = pricePenaltyForSectorWithStats(
            victim,
            sector,
            delta
          );
          patchesByUserId[victim.user_id] = victimAfter;

          const { changedGoods, protectedTraders, totalTradersInSector } = stats;

          // лог атакующему
          logPush(
            `Карта «${cardTitle}»: в секторе «${sector}» снижена цена на ${delta} у товаров соперника (${victim.name}). ` +
              `Затронуто товаров: ${changedGoods}. Защищённых пропущено: ${protectedTraders}/${totalTradersInSector}.`
          );
          // лог жертве
          pushLogForUser(
            eventResultLog,
            victim.user_id,
            `Против вас применили «${cardTitle}» в секторе «${sector}». Цена товаров снижена на ${delta}. ` +
              `Затронуто товаров: ${changedGoods}. Защищённых пропущено: ${protectedTraders}/${totalTradersInSector}.`
          );

          continue; // карта сгорела
        }

        // ---- 2) Удар по ТОРГОВЦАМ в секторе: конфискация/штраф/hold ----
        if (goalAction === 'sector' && goalItem === 'trader') {
          const confObj = effects.find(e => e && e.confiscation !== undefined);
          const fineObj = effects.find(e => e && e.fine !== undefined);
          const actObj = effects.find(e => e && e.trader_action !== undefined);

          const confiscation = confObj ? !!confObj.confiscation : false;
          const fineEach = fineObj
            ? Array.isArray(fineObj.fine)
              ? Number(fineObj.fine[0] || 0)
              : Number(fineObj.fine || 0)
            : 0;
          const action = actObj?.trader_action; // например "hold"

          if (!sector) {
            logPush(`Карта «${cardTitle}»: сектор не указан — эффект для торговцев не применён.`);
            continue;
          }

          const victimsTradersAll = tradersInSector(victim, sector);
          if (!victimsTradersAll.length) {
            logPush(
              `Карта «${cardTitle}»: у соперника (${victim.name}) нет торговцев в секторе «${sector}».`
            );
            continue;
          }

          const protectedList = victimsTradersAll.filter(isProtectedTrader);
          const unprotectedList = victimsTradersAll.filter(t => !isProtectedTrader(t));

          let victimMut = { ...victim };
          let affected = 0;

          if (confiscation) {
            // конфискуем ТОЛЬКО у незащищённых
            unprotectedList.forEach(tr => {
              let nextTr = sendTraderToHand(tr, { clearGoods: true });
              if (action) nextTr = { ...nextTr, trader_action: action }; // навесить hold, если требуется
              victimMut = replaceTrader(victimMut, tr.traderId, nextTr);
              affected += 1;
            });

            if (affected > 0) {
              logPush(
                `Карта «${cardTitle}»: в секторе «${sector}» у соперника (${victim.name}) ` +
                  `торговцы без «крыши» отправлены на руку, товары конфискованы. ` +
                  `Под защитой пропущено: ${protectedList.length}/${victimsTradersAll.length}.`
              );
              pushLogForUser(
                eventResultLog,
                victim.user_id,
                `Против вас применили «${cardTitle}». Сектор «${sector}»: ваши незащищённые торговцы отправлены на руку, товары конфискованы. ` +
                  `Защищённых не трогали: ${protectedList.length}/${victimsTradersAll.length}.`
              );
            } else {
              logPush(
                `Карта «${cardTitle}»: все торговцы соперника (${victim.name}) в секторе «${sector}» под защитой — конфискации не было.`
              );
              pushLogForUser(
                eventResultLog,
                victim.user_id,
                `Против вас применили «${cardTitle}» в секторе «${sector}», но все ваши торговцы были под защитой — без последствий.`
              );
            }
          } else {
            // без конфискации: продажа пойдёт как обычно
            logPush(
              `Карта «${cardTitle}»: в секторе «${sector}» конфискации нет — продажа у соперника (${victim.name}) сохранится. ` +
                `Защищённых (не затрагивали): ${protectedList.length}/${victimsTradersAll.length}.`
            );
            pushLogForUser(
              eventResultLog,
              victim.user_id,
              `Против вас применили «${cardTitle}» в секторе «${sector}». Конфискации нет, продажа сохранится.`
            );
          }

          // Штраф: только по незащищённым
          if (fineEach > 0) {
            const fineTotal = fineEach * unprotectedList.length;
            const victimAfterFine = applyFineToPlayer(victimMut, fineTotal);
            patchesByUserId[victim.user_id] = victimAfterFine;

            logPush(
              `Карта «${cardTitle}»: штраф с соперника (${victim.name}) ` +
                `${fineEach}×${unprotectedList.length} = ${fineTotal} монет (защищённых не штрафовали).`
            );
            pushLogForUser(
              eventResultLog,
              victim.user_id,
              `Штраф по «${cardTitle}»: ${fineEach}×${unprotectedList.length} = ${fineTotal} монет (торговцы под защитой без штрафа).`
            );
          } else {
            // без штрафа — просто зафиксировать итоговые изменения
            patchesByUserId[victim.user_id] = victimMut;
          }

          continue; // карта сгорела
        }

        // нераспознанная негативная комбо
        logPush(`Карта «${cardTitle}»: цель/эффект не распознаны — изменений нет.`);
        continue;
      }
    }

    updated.eventCards = nextCards;
    if (log.length) eventResultLog[player.user_id] = log;
    return updated;
  });

  const finalPlayers = updatedPlayers.map(p =>
    patchesByUserId[p.user_id] ? patchesByUserId[p.user_id] : p
  );

  return {
    ...prevGameState,
    players: finalPlayers,
    eventResultLog,
  };
}

/**
 * Финализация: применяем выборы, затем вызываем твой handleEndRound.
 * - setGameState: react setState
 * - isHost, broadcastGameState: как и раньше
 *
 * Если нужно, высылай «finalEndRound» уже после того, как handleEndRound обновит стейт.
 */
export function finalizeEndRoundWithEvents({
  setGameState,
  isHost,
  broadcastGameState,
  handleEndRoundFn = handleEndRound,
}) {
  if (!setGameState) return;

  let stateWithLogs = null; // состояние ПОСЛЕ применения эффектов (с eventResultLog)

  // 1) Применяем выборы и коммитим состояние с логами (+nonce)
  setGameState(prev => {
    const applied = applyEventChoicesToGameState(prev);

    const hasAnyLogs =
      !!applied?.eventResultLog &&
      Object.values(applied.eventResultLog).some(arr => Array.isArray(arr) && arr.length > 0);

    // это состояние будем рассылать клиентам для показа модалки
    stateWithLogs = {
      ...applied,
      eventResultNonce: hasAnyLogs
        ? (applied.eventResultNonce || 0) + 1
        : applied.eventResultNonce || 0,
      // фазу чистим, но ЛОГИ ОСТАВЛЯЕМ – они нужны клиентам
      phase: PHASES.ROUND_END,

      eventCardPhase: undefined,
      playerEventChoices: undefined,
    };

    return stateWithLogs;
  });

  // 2) Разослать состояние с логами (очень важно!)
  if (isHost && typeof broadcastGameState === 'function') {
    // маленькая микрозадержка — чтобы setState уже попал в React у хоста
    setTimeout(() => {
      broadcastGameState(stateWithLogs);
    }, 0);
  }

  // 3) Чуть позже — запускаем конец раунда (продажи, ++round и т.д.)
  //    Нужна пауза, чтобы клиенты успели открыть модалку.
  setTimeout(() => {
    try {
      handleEndRoundFn(setGameState, isHost, broadcastGameState);
    } catch (e) {
      console.error('[finalizeEndRoundWithEvents] handleEndRound error:', e);
    }
  }, 400); // 300–500мс достаточно; если хочешь – можно ждать ACK’и вместо таймера
}

// logic/logic.js

/** упаковать сообщение от клиента с выбором */
export function makeEventChoiceMessage({ userId, positiveChoices, effectTargets }) {
  return {
    type: 'eventCardChoiceDone',
    userId,
    positiveChoices,
    effectTargets,
  };
}

/** разослать всем новое состояние (хост) */
export function broadcastState(connectionsRef, state) {
  if (!connectionsRef?.current) return;
  connectionsRef.current.forEach(conn => {
    try {
      conn.send({ type: 'gameState', gameState: state });
    } catch {}
  });
}

// Очистить логи для конкретного игрока (можно вызывать у хоста)
export function clearEventLogForUser(prevGameState, userId) {
  if (!prevGameState?.eventResultLog) return prevGameState;
  const nextLog = { ...prevGameState.eventResultLog };
  nextLog[userId] = [];
  return { ...prevGameState, eventResultLog: nextLog };
}

// Сообщение-ACK от клиента хосту
export function makeEventLogAckMessage(userId) {
  return { type: 'ackEventResults', userId };
}
