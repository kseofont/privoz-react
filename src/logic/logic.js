//import usersData from '../users.json';
//import eventCardsData from '../eventcards.json';
// Assuming you're using axios for simplicity
//import axios from 'axios';

// export const processUsersData = async () => {
//   try {
//     // Make a GET request to the API endpoint
//     const response = await axios.get('https://privoz-api.lavron.dev/fake/users', {
//       headers: {
//         Accept: 'application/json',
//       },
//     });

//     // Extract the user data from the API response
//     const usersData = response.data;

//     // Process and return the data as needed
//     return usersData.map(user => ({
//       ...user,
//       traders: user.traders.map(trader => ({
//         ...trader,
//         goods: trader.goods.map(good => ({
//           ...good,
//           imageSrc: `../img/${good.imageSrc}`,
//         })),
//       })),
//     }));
//   } catch (error) {
//     console.error('Error fetching data from API:', error);
//     // Handle errors appropriately (e.g., show a message to the user)
//     return [];
//   }
// };

// export const extractCurrentUser = async () => {
//   try {
//     // Make a GET request to the API endpoint
//     const response = await axios.get('https://privoz-api.lavron.dev/fake/users', {
//       headers: {
//         Accept: 'application/json',
//       },
//     });

//     // Extract the user data from the API response
//     const usersData = response.data;

//     // Find the current user in the fetched data
//     const currentUser = usersData.find(user => user.current_user === 'current');

//     if (currentUser) {
//       const { name, className, color, coins, traders } = currentUser;

//       return {
//         name,
//         className,
//         color,
//         coins,
//         tradersCount: traders.length,

//         position_in_game: 'hand',
//       };
//     }

//     return null;
//   } catch (error) {
//     console.error('Error fetching data from API:', error);
//     // Handle errors appropriately (e.g., show a message to the user)
//     return null;
//   }
// };

// export const handleSectorClickLogic = (
//   category,
//   setClickedSector,
//   setShowModal,
//   setCurrentUser,
//   setCurrentUserData,
//   setCoinsDecrease,
//   traders
// ) => {
//   setClickedSector(category);
//   //console.error('setCurrentUser - ', setCurrentUser);
//   //console.error('setCurrentUserData - ', setCurrentUserData);
//   // Check if traders is an array before using find
//   const user = Array.isArray(traders)
//     ? traders.find(user => user.current_user === 'current')
//     : null;

//   if (user) {
//     setCurrentUser(user);

//     setCurrentUserData(prevUserData => {
//       const totalTradersCount =
//         user.traders.length + (prevUserData ? prevUserData.tradersCount : 0);
//       const coinsDecrease = totalTradersCount <= 1 ? 0 : (totalTradersCount - 1) * 5;
//       setCoinsDecrease(coinsDecrease);

//       setShowModal(true);

//       return {
//         ...prevUserData,
//       };
//     });
//   } else {
//     // Handle the case where 'user' is not found
//     console.error('Current user not found in traders array.');
//   }
// };

// export const handleAddTraderLogic = (
//   clickedSector,
//   maxTraders,
//   setShowModal,
//   setShowMaxTradersModal,
//   setShowNotEnoughMoneyModal,
//   setTraders,
//   setCurrentUserData,
//   setShowUpdatedInfoModal,
//   currentUser,
//   traders,
//   setCurrentUser
// ) => {
//   const tradersArray = Array.isArray(traders) ? traders : [];
//   const tradersInSelectedSector = tradersArray.filter(
//     user => user.traders && user.traders.some(trader => trader.location === clickedSector)
//   );

//   if (tradersInSelectedSector.length < maxTraders) {
//     let user = tradersArray.find(user => user.current_user === 'current');
//     setCurrentUser(user);

//     const newTraderData = {
//       user_id: user.user_id,
//       name: user.name,
//       color: user.color,
//       className: user.className,
//       traders: [
//         {
//           traderOwnerId: user.user_id,
//           traderName: `Trader${tradersInSelectedSector.length + 1}`,
//           location: clickedSector,
//           goods: [
//             // {
//             //     sector: clickedSector,
//             //     productName: 'Onion',
//             //     imageSrc: '../img/onion.svg',
//             //     wholesalePrice: '2',
//             //     retailPrice: '4',
//             //     possibleIncome: '2',
//             //     quantity_card: '16',
//             // },
//             // ... Additional goods data
//           ],
//         },
//       ],
//     };

//     setTraders(prevTraders => [...prevTraders, newTraderData]);

//     setCurrentUserData(prevUserData => {
//       if (!prevUserData) {
//         return null;
//       }

//       const currentUserTraders = currentUser ? currentUser.traders : [];
//       const totalTradersCount = currentUserTraders.length + prevUserData.tradersCount;

//       const coinsDecrease = totalTradersCount <= 1 ? 0 : (totalTradersCount - 1) * 5;
//       const updatedCoins = prevUserData.coins - coinsDecrease;

//       if (updatedCoins < 0) {
//         setShowNotEnoughMoneyModal(true);
//         return prevUserData;
//       }

//       const updatedTraders = [
//         ...prevUserData.traders,
//         ...newTraderData.traders, // Append the new trader data
//       ];

//       return {
//         ...prevUserData,
//         tradersCount: prevUserData.tradersCount + 1,

//         traders: updatedTraders,
//         coins: updatedCoins,
//       };
//     });

//     setShowModal(false);

//     const availableCards = eventCardsData.filter(
//       card => card.position_in_game === 'deck' && card.quantity_active > 0
//     );
//     const randomCardIndex = Math.floor(Math.random() * availableCards.length);
//     const randomCard = availableCards[randomCardIndex];

//     randomCard.position_in_game = 'hand';
//     randomCard.quantity_active--;

//     if (randomCard.quantity_active === 0) {
//       availableCards.splice(randomCardIndex, 1);
//     }

//     setShowUpdatedInfoModal(true);

//     setCurrentUserData(prevUserData => {
//       if (!prevUserData) {
//         return null;
//       }

//       // Ensure that eventCards is initialized as an array
//       const eventCards = Array.isArray(prevUserData.eventCards) ? prevUserData.eventCards : [];

//       const updatedEventCards = [...eventCards, randomCard];

//       return {
//         ...prevUserData,
//         // tradersCount: prevUserData.tradersCount + 1,
//         // sectorsWithTraders: updatedTraders,
//         // coins: updatedCoins,
//         eventCards: updatedEventCards,
//       };
//     });

//     // setUpdatedInfo({
//     //     traders: newTraderData.traders,
//     //     randomCard: randomCard,
//     // });
//   } else {
//     setShowModal(false);
//     setShowMaxTradersModal(true);
//   }
// };

// export function handleAddTraderToSector({
//   gameState,
//   setGameState,
//   category, // sector, куда добавляем
//   myUserId, // кто добавляет
//   maxTraders, // макс. кол-во продавцов в секторе
//   setShowModal,
//   setShowMaxTradersModal,
//   setShowNotEnoughMoneyModal,
//   setShowUpdatedInfoModal,
//   connection,
//   myTurn,
// }) {
//   // 1. Проверка на ход
//   if (!gameState || gameState.currentTurnUserId !== myUserId) {
//     setShowModal(false);
//     return;
//   }
//   console.error(
//     'handleAddTraderToSector click !gameState || gameState.currentTurnUserId !== myUserId'
//   );

//   // 2. Клиент отправляет на хост (а тот уже обновляет gameState)
//   if (connection) {
//     connection.send({
//       type: 'addTrader',
//       payload: {
//         sector: category,
//         userId: myUserId,
//       },
//     });
//     setShowModal(false);
//     setShowUpdatedInfoModal(true);
//     return;
//   }

//   // 3. Хост обновляет gameState локально
//   setGameState(prev => {
//     if (!prev || !prev.players) return prev;

//     // Найти игрока по userId
//     const playerIdx = prev.players.findIndex(p => p.user_id === myUserId);
//     if (playerIdx === -1) return prev;
//     const player = prev.players[playerIdx];

//     // Трейдеры в выбранном секторе (по всей игре)
//     const tradersInSelectedSector = prev.players
//       .flatMap(p => p.traders || [])
//       .filter(trader => trader.location === category);

//     if (tradersInSelectedSector.length >= maxTraders) {
//       setShowMaxTradersModal(true);
//       setShowModal(false);
//       return prev;
//     }

//     // Стоимость нового трейдера (пример логики — твоя)
//     const totalTradersCount = player.tradersCount || 0;
//     const coinsDecrease = totalTradersCount <= 1 ? 0 : totalTradersCount * 5;
//     const updatedCoins = (player.coins || 0) - coinsDecrease;
//     if (updatedCoins < 0) {
//       setShowNotEnoughMoneyModal(true);
//       setShowModal(false);
//       return prev;
//     }

//     // Добавление нового трейдера
//     const newTrader = {
//       traderOwnerId: player.user_id,
//       traderName: `Trader${(player.traders?.length || 0) + 1}`,
//       location: category,
//       goods: [],
//     };

//     // Добавление Event Card (выдаём рандомную, если есть в deck)
//     let updatedEventCards = [...(player.eventCards || [])];
//     let updatedEventCardsData = [...eventCardsData]; // копия массива
//     const availableCards = updatedEventCardsData.filter(
//       card => card.position_in_game === 'deck' && card.quantity_active > 0
//     );
//     let drawnCard = null;
//     if (availableCards.length > 0) {
//       const randomCardIndex = Math.floor(Math.random() * availableCards.length);
//       drawnCard = { ...availableCards[randomCardIndex] };
//       drawnCard.position_in_game = 'hand';
//       drawnCard.quantity_active--;
//       updatedEventCards.push(drawnCard);
//     }

//     // Обновление игрока
//     const updatedPlayer = {
//       ...player,
//       traders: [...(player.traders || []), newTrader],
//       tradersCount: totalTradersCount + 1,
//       coins: updatedCoins,
//       eventCards: updatedEventCards,
//     };

//     // Обновление игроков
//     const updatedPlayers = [...prev.players];
//     updatedPlayers[playerIdx] = updatedPlayer;

//     const updatedGameState = {
//       ...prev,
//       players: updatedPlayers,
//       // Можно еще eventCardsInGame: updatedEventCardsData,
//     };

//     setShowModal(false);
//     setShowUpdatedInfoModal(true);

//     return updatedGameState;
//   });
// }

// logic.js
// FROM HERE NEW
export function endTurn({ connection, myTurn, myUserId, gameState, setGameState, connectionsRef }) {
  console.log(' endTurn + gameState ', gameState);
  // console.log(' connection ', connection);
  // console.log(' connectionsRef ', connectionsRef);
  // console.log(' myTurn ', myTurn);
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

// logic.js

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

export function handleSelectTrader({ gameState, myUserId, trader }) {
  if (!gameState || !myUserId) return gameState; // Возвращаем без изменений если некорректно

  const players = gameState.players.map(player => {
    if (player.user_id !== myUserId) return player;

    if (player.traders?.some(t => t.traderId === trader.traderId)) return player;

    const tradersLen = player.traders?.length || 0;
    const currPrice = tradersLen * 15;
    if ((player.coins || 0) < currPrice) return player;

    const traderToAdd = {
      ...trader,
      card_in_game: `${myUserId}_hand`,
      taken: true,
      traderOwnerId: myUserId,
    };

    return {
      ...player,
      traders: [...(player.traders || []), traderToAdd],
      tradersCount: (player.tradersCount || 0) + 1,
      coins: player.coins - currPrice,
    };
  });

  const traderList = gameState.traderList
    ? gameState.traderList.map(t =>
        t.traderId === trader.traderId ? { ...t, taken: true, card_in_game: `${myUserId}_hand` } : t
      )
    : gameState.traderList;

  return { ...gameState, players, traderList };
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
      phase: undefined,
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
  // 1. Собрать все eventcards в колоде, у которых quantity_active > 0
  const deckCards = (gameState.eventcards || []).filter(
    c => c.position_in_game === 'deck' && c.quantity_active > 0
  );

  if (!deckCards.length) return gameState; // Нет доступных карт

  // 2. Выбрать случайную карту из этого массива (с учётом количества)
  const expanded = [];
  deckCards.forEach(card => {
    for (let i = 0; i < card.quantity_active; i++) expanded.push(card);
  });
  const randomIdx = Math.floor(Math.random() * expanded.length);
  const chosenCard = expanded[randomIdx];
  if (!chosenCard) return gameState;

  // 3. Найти её в eventcards по id для изменения quantity_active
  const evIdx = gameState.eventcards.findIndex(c => c.id === chosenCard.id);
  if (evIdx === -1) return gameState;

  // 4. Уменьшаем quantity_active на 1 в общей колоде
  const updatedEventCards = [...gameState.eventcards];
  updatedEventCards[evIdx] = {
    ...updatedEventCards[evIdx],
    quantity_active: Math.max(0, updatedEventCards[evIdx].quantity_active - 1),
  };

  // 5. Копируем свойства карты для игрока
  const cardForPlayer = {
    ...chosenCard,
    position_in_game: `hand_${playerId}`,
    quantity_active: 1,
  };

  // 6. Добавляем игроку эту карту (или увеличиваем количество, если такая уже есть)
  const playerIdx = gameState.players.findIndex(p => p.user_id === playerId);
  if (playerIdx === -1) return { ...gameState, eventcards: updatedEventCards };

  const player = gameState.players[playerIdx];
  let playerEventCards = Array.isArray(player.eventCards) ? [...player.eventCards] : [];

  const playerCardIdx = playerEventCards.findIndex(c => c.id === chosenCard.id);
  if (playerCardIdx !== -1) {
    // Уже есть такая карта у игрока — увеличиваем количество
    playerEventCards[playerCardIdx] = {
      ...playerEventCards[playerCardIdx],
      quantity_active: (playerEventCards[playerCardIdx].quantity_active || 0) + 1,
    };
  } else {
    // Новая карта
    playerEventCards.push(cardForPlayer);
  }

  // 7. Обновить игрока в массиве
  const updatedPlayer = { ...player, eventCards: playerEventCards };
  const updatedPlayers = [...gameState.players];
  updatedPlayers[playerIdx] = updatedPlayer;

  // 8. Вернуть обновлённый gamestate
  return [
    // <--- вот тут меняется!
    {
      ...gameState,
      eventcards: updatedEventCards,
      players: updatedPlayers,
    },
    cardForPlayer, // <-- эта карта, которую выдали игроку
  ];
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
    phase: 'eventChoice',
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

export function applyEventChoicesToGameState(prevGameState) {
  if (!prevGameState || !Array.isArray(prevGameState.players)) return prevGameState;

  const choicesByUser = prevGameState.playerEventChoices || {};
  const roundNum = prevGameState.round || 1;

  // Сюда собираем логи «что изменили»
  const eventResultLog = {};

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
                  // const perTraderSummary = affected.reduce((acc, tr) => {
                  //   const id = tr.traderId;
                  //   acc[id] = (acc[id] || 0) + 1;
                  //   return acc;
                  // }, {});
                  // const pieces = Object.entries(perTraderSummary).map(([id, n]) => {
                  //   const tr = affected.find(t => t.traderId === id);
                  //   const name = tr ? getField(tr, 'name', 'ru') || id : id;
                  //   return `${name}: +${n}`;
                  // });
                  // logPush(
                  //   `Карта «${cardTitle2}»: добавлено ${count} товар(ов) среди занятых торговцев — ${pieces.join(
                  //     '; '
                  //   )}.`
                  // );
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

      // Негативные пока не трогаем
      nextCards.push(card);
    }

    updated.eventCards = nextCards;
    if (log.length) eventResultLog[player.user_id] = log;
    return updated;
  });

  return {
    ...prevGameState,
    players: updatedPlayers,
    eventResultLog, // <-- логи по игрокам
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
  let applied = null;

  // 1) Применяем выборы и сразу кладём это в state (чтобы монеты/цены уже были применены)
  // 1) Применяем выборы и чистим фазу — это коммитим в стейт
  setGameState(prev => {
    applied = applyEventChoicesToGameState(prev);
    const cleared = {
      ...applied,
      phase: undefined,
      eventCardPhase: undefined,
      playerEventChoices: undefined,
    };
    return cleared;
  });
  // 2) В следующем тике завершаем раунд (продажи, ++round и т.д.)
  //    Теперь handleEndRound будет работать поверх уже применённых изменений.
  setTimeout(() => {
    try {
      handleEndRoundFn(setGameState, isHost, broadcastGameState);
    } catch (e) {
      console.error('[finalizeEndRoundWithEvents] handleEndRound error:', e);
    }
  }, 0);
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
