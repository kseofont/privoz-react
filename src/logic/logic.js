//import usersData from '../users.json';
import eventCardsData from '../eventcards.json';
// Assuming you're using axios for simplicity
import axios from 'axios';

export const processUsersData = async () => {
  try {
    // Make a GET request to the API endpoint
    const response = await axios.get('https://privoz-api.lavron.dev/fake/users', {
      headers: {
        Accept: 'application/json',
      },
    });

    // Extract the user data from the API response
    const usersData = response.data;

    // Process and return the data as needed
    return usersData.map(user => ({
      ...user,
      traders: user.traders.map(trader => ({
        ...trader,
        goods: trader.goods.map(good => ({
          ...good,
          imageSrc: `../img/${good.imageSrc}`,
        })),
      })),
    }));
  } catch (error) {
    console.error('Error fetching data from API:', error);
    // Handle errors appropriately (e.g., show a message to the user)
    return [];
  }
};

export const extractCurrentUser = async () => {
  try {
    // Make a GET request to the API endpoint
    const response = await axios.get('https://privoz-api.lavron.dev/fake/users', {
      headers: {
        Accept: 'application/json',
      },
    });

    // Extract the user data from the API response
    const usersData = response.data;

    // Find the current user in the fetched data
    const currentUser = usersData.find(user => user.current_user === 'current');

    if (currentUser) {
      const { name, className, color, coins, traders } = currentUser;

      return {
        name,
        className,
        color,
        coins,
        tradersCount: traders.length,

        position_in_game: 'hand',
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching data from API:', error);
    // Handle errors appropriately (e.g., show a message to the user)
    return null;
  }
};

export const handleSectorClickLogic = (
  category,
  setClickedSector,
  setShowModal,
  setCurrentUser,
  setCurrentUserData,
  setCoinsDecrease,
  traders
) => {
  setClickedSector(category);
  //console.error('setCurrentUser - ', setCurrentUser);
  //console.error('setCurrentUserData - ', setCurrentUserData);
  // Check if traders is an array before using find
  const user = Array.isArray(traders)
    ? traders.find(user => user.current_user === 'current')
    : null;

  if (user) {
    setCurrentUser(user);

    setCurrentUserData(prevUserData => {
      const totalTradersCount =
        user.traders.length + (prevUserData ? prevUserData.tradersCount : 0);
      const coinsDecrease = totalTradersCount <= 1 ? 0 : (totalTradersCount - 1) * 5;
      setCoinsDecrease(coinsDecrease);

      setShowModal(true);

      return {
        ...prevUserData,
      };
    });
  } else {
    // Handle the case where 'user' is not found
    console.error('Current user not found in traders array.');
  }
};

export const handleAddTraderLogic = (
  clickedSector,
  maxTraders,
  setShowModal,
  setShowMaxTradersModal,
  setShowNotEnoughMoneyModal,
  setTraders,
  setCurrentUserData,
  setShowUpdatedInfoModal,
  currentUser,
  traders,
  setCurrentUser
) => {
  const tradersArray = Array.isArray(traders) ? traders : [];
  const tradersInSelectedSector = tradersArray.filter(
    user => user.traders && user.traders.some(trader => trader.location === clickedSector)
  );

  if (tradersInSelectedSector.length < maxTraders) {
    let user = tradersArray.find(user => user.current_user === 'current');
    setCurrentUser(user);

    const newTraderData = {
      user_id: user.user_id,
      name: user.name,
      color: user.color,
      className: user.className,
      traders: [
        {
          traderOwnerId: user.user_id,
          traderName: `Trader${tradersInSelectedSector.length + 1}`,
          location: clickedSector,
          goods: [
            // {
            //     sector: clickedSector,
            //     productName: 'Onion',
            //     imageSrc: '../img/onion.svg',
            //     wholesalePrice: '2',
            //     retailPrice: '4',
            //     possibleIncome: '2',
            //     quantity_card: '16',
            // },
            // ... Additional goods data
          ],
        },
      ],
    };

    setTraders(prevTraders => [...prevTraders, newTraderData]);

    setCurrentUserData(prevUserData => {
      if (!prevUserData) {
        return null;
      }

      const currentUserTraders = currentUser ? currentUser.traders : [];
      const totalTradersCount = currentUserTraders.length + prevUserData.tradersCount;

      const coinsDecrease = totalTradersCount <= 1 ? 0 : (totalTradersCount - 1) * 5;
      const updatedCoins = prevUserData.coins - coinsDecrease;

      if (updatedCoins < 0) {
        setShowNotEnoughMoneyModal(true);
        return prevUserData;
      }

      const updatedTraders = [
        ...prevUserData.traders,
        ...newTraderData.traders, // Append the new trader data
      ];

      return {
        ...prevUserData,
        tradersCount: prevUserData.tradersCount + 1,

        traders: updatedTraders,
        coins: updatedCoins,
      };
    });

    setShowModal(false);

    const availableCards = eventCardsData.filter(
      card => card.position_in_game === 'deck' && card.quantity_active > 0
    );
    const randomCardIndex = Math.floor(Math.random() * availableCards.length);
    const randomCard = availableCards[randomCardIndex];

    randomCard.position_in_game = 'hand';
    randomCard.quantity_active--;

    if (randomCard.quantity_active === 0) {
      availableCards.splice(randomCardIndex, 1);
    }

    setShowUpdatedInfoModal(true);

    setCurrentUserData(prevUserData => {
      if (!prevUserData) {
        return null;
      }

      // Ensure that eventCards is initialized as an array
      const eventCards = Array.isArray(prevUserData.eventCards) ? prevUserData.eventCards : [];

      const updatedEventCards = [...eventCards, randomCard];

      return {
        ...prevUserData,
        // tradersCount: prevUserData.tradersCount + 1,
        // sectorsWithTraders: updatedTraders,
        // coins: updatedCoins,
        eventCards: updatedEventCards,
      };
    });

    // setUpdatedInfo({
    //     traders: newTraderData.traders,
    //     randomCard: randomCard,
    // });
  } else {
    setShowModal(false);
    setShowMaxTradersModal(true);
  }
};

export function handleAddTraderToSector({
  gameState,
  setGameState,
  category, // sector, куда добавляем
  myUserId, // кто добавляет
  maxTraders, // макс. кол-во продавцов в секторе
  setShowModal,
  setShowMaxTradersModal,
  setShowNotEnoughMoneyModal,
  setShowUpdatedInfoModal,
  connection,
  myTurn,
}) {
  // 1. Проверка на ход
  if (!gameState || gameState.currentTurnUserId !== myUserId) {
    setShowModal(false);
    return;
  }
  console.error(
    'handleAddTraderToSector click !gameState || gameState.currentTurnUserId !== myUserId'
  );

  // 2. Клиент отправляет на хост (а тот уже обновляет gameState)
  if (connection) {
    connection.send({
      type: 'addTrader',
      payload: {
        sector: category,
        userId: myUserId,
      },
    });
    setShowModal(false);
    setShowUpdatedInfoModal(true);
    return;
  }

  // 3. Хост обновляет gameState локально
  setGameState(prev => {
    if (!prev || !prev.players) return prev;

    // Найти игрока по userId
    const playerIdx = prev.players.findIndex(p => p.user_id === myUserId);
    if (playerIdx === -1) return prev;
    const player = prev.players[playerIdx];

    // Трейдеры в выбранном секторе (по всей игре)
    const tradersInSelectedSector = prev.players
      .flatMap(p => p.traders || [])
      .filter(trader => trader.location === category);

    if (tradersInSelectedSector.length >= maxTraders) {
      setShowMaxTradersModal(true);
      setShowModal(false);
      return prev;
    }

    // Стоимость нового трейдера (пример логики — твоя)
    const totalTradersCount = player.tradersCount || 0;
    const coinsDecrease = totalTradersCount <= 1 ? 0 : totalTradersCount * 5;
    const updatedCoins = (player.coins || 0) - coinsDecrease;
    if (updatedCoins < 0) {
      setShowNotEnoughMoneyModal(true);
      setShowModal(false);
      return prev;
    }

    // Добавление нового трейдера
    const newTrader = {
      traderOwnerId: player.user_id,
      traderName: `Trader${(player.traders?.length || 0) + 1}`,
      location: category,
      goods: [],
    };

    // Добавление Event Card (выдаём рандомную, если есть в deck)
    let updatedEventCards = [...(player.eventCards || [])];
    let updatedEventCardsData = [...eventCardsData]; // копия массива
    const availableCards = updatedEventCardsData.filter(
      card => card.position_in_game === 'deck' && card.quantity_active > 0
    );
    let drawnCard = null;
    if (availableCards.length > 0) {
      const randomCardIndex = Math.floor(Math.random() * availableCards.length);
      drawnCard = { ...availableCards[randomCardIndex] };
      drawnCard.position_in_game = 'hand';
      drawnCard.quantity_active--;
      updatedEventCards.push(drawnCard);
    }

    // Обновление игрока
    const updatedPlayer = {
      ...player,
      traders: [...(player.traders || []), newTrader],
      tradersCount: totalTradersCount + 1,
      coins: updatedCoins,
      eventCards: updatedEventCards,
    };

    // Обновление игроков
    const updatedPlayers = [...prev.players];
    updatedPlayers[playerIdx] = updatedPlayer;

    const updatedGameState = {
      ...prev,
      players: updatedPlayers,
      // Можно еще eventCardsInGame: updatedEventCardsData,
    };

    setShowModal(false);
    setShowUpdatedInfoModal(true);

    return updatedGameState;
  });
}

// logic.js
// FROM HERE NEW
export function endTurn({ connection, myTurn, myUserId, gameState, setGameState, connectionsRef }) {
  console.log(' endTurn + gameState ', gameState);
  console.log(' connection ', connection);
  console.log(' connectionsRef ', connectionsRef);
  console.log(' myTurn ', myTurn);
  console.log(' setGameState ', setGameState);
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
    console.log('[HOST] Получил g');
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
    };

    return {
      ...player,
      traders: [...(player.traders || []), traderToAdd],
      tradersCount: (player.tradersCount || 0) + 1,
      coins: player.coins - currPrice,
    };
  });

  const traderList = gameState.traderList
    ? gameState.traderList.map(t => (t.traderId === trader.traderId ? { ...t, taken: true } : t))
    : gameState.traderList;

  return { ...gameState, players, traderList };
}
