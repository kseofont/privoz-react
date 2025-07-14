import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Row, Col } from 'react-bootstrap';
import Trader from './Trader';

import { handleSectorClickLogic, handleAddTraderLogic } from '../logic/logic';
import productsData from '../products.json';

import { handleAddTraderToSector } from '../logic/logic';

const PrivozSector = ({
  category,
  maxTraders,
  gameState,
  myUserId,
  connection,

  setGameState,
}) => {
  const [clickedSector, setClickedSector] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showNotEnoughMoneyModal, setShowNotEnoughMoneyModal] = useState(false);
  const [showMaxTradersModal, setShowMaxTradersModal] = useState(false);
  const [showUpdatedInfoModal, setShowUpdatedInfoModal] = useState(false);
  const [coinsDecrease, setCoinsDecrease] = useState(0);
  const [showWholeModal, setShowWholeModal] = useState(false);
  const [sectorProducts, setSectorProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Всегда работаем через gameState.players!
  const players = gameState?.players || [];
  const myTurn = gameState?.currentTurnUserId === myUserId;

  // Собираем всех трейдеров в этом секторе
  const sectorTraders = players.flatMap(player =>
    (player.traders || [])
      .filter(trader => trader.location === category)
      .map(trader => ({ ...trader, owner: player }))
  );

  // для отображения трейдеров
  const tradersList = sectorTraders.map((trader, idx) => (
    <Trader key={idx} user={trader.owner} trader={trader} />
  ));

  const handleSectorClick = () => {
    // setCurrentUser тут можно по myUserId найти игрока
    setCurrentUser(players.find(p => p.user_id === myUserId));
    setClickedSector(category);
    setShowModal(true);
    // coinsDecrease: если есть логика - вставь сюда
    setCoinsDecrease((players.find(p => p.user_id === myUserId)?.tradersCount || 0) >= 1 ? 5 : 0);
  };

  // Добавление трейдера (логика разнесена, только пример)
  // const handleAddTrader = () => {
  //   // только если мой ход!
  //   // if (!myTurn) {
  //   //   setShowModal(false);
  //   //   return;
  //   // }
  //   // console.error('handleAddTrader click 11');

  //   handleAddTraderToSector({
  //     gameState,
  //     setGameState,
  //     category, // sector
  //     myUserId,
  //     maxTraders,
  //     setShowModal,
  //     setShowMaxTradersModal,
  //     setShowNotEnoughMoneyModal,
  //     setShowUpdatedInfoModal,
  //     connection,
  //   });
  // };

  const handleAddTrader = () => {
    // 1. Локально обновить state (optimistic update)
    setGameState(prev => {
      if (!prev || !prev.players) return prev;

      // Тот же кусок, что у тебя в хосте!
      const playerIdx = prev.players.findIndex(p => p.user_id === myUserId);
      if (playerIdx === -1) return prev;
      const player = prev.players[playerIdx];

      const tradersInSelectedSector = prev.players
        .flatMap(p => p.traders || [])
        .filter(trader => trader.location === category);

      if (tradersInSelectedSector.length >= maxTraders) {
        setShowMaxTradersModal(true);
        setShowModal(false);
        return prev;
      }

      const totalTradersCount = player.tradersCount || 0;
      const coinsDecrease = totalTradersCount <= 1 ? 0 : totalTradersCount * 5;
      const updatedCoins = (player.coins || 0) - coinsDecrease;
      if (updatedCoins < 0) {
        setShowNotEnoughMoneyModal(true);
        setShowModal(false);
        return prev;
      }

      const newTrader = {
        traderOwnerId: player.user_id,
        traderName: `Trader${(player.traders?.length || 0) + 1}`,
        location: category,
        goods: [],
      };

      // Можно без раздачи eventCards локально, пусть хост выдаёт (но можно и тут)
      const updatedPlayer = {
        ...player,
        traders: [...(player.traders || []), newTrader],
        tradersCount: totalTradersCount + 1,
        coins: updatedCoins,
        // eventCards: updatedEventCards,
      };

      const updatedPlayers = [...prev.players];
      updatedPlayers[playerIdx] = updatedPlayer;

      return {
        ...prev,
        players: updatedPlayers,
      };
    });

    // 2. Отправить действие хосту (пусть только он раздаёт eventCard и т.д.)
    if (connection) {
      connection.send({
        type: 'addTrader',
        payload: {
          sector: category,
          userId: myUserId,
        },
      });
    }

    setShowModal(false);
    setShowUpdatedInfoModal(true);
  };

  // --- Модальные окна и прочее без изменений ---

  return (
    <div className="yarr2">
      <div
        className={`sector border p-3 mb-3 ${category.toLowerCase()}`}
        onClick={handleSectorClick}
      >
        <div className="row gap-1">
          {tradersList.length > 0 ? (
            tradersList
          ) : (
            <div className="col border text-center pb-4 trader-block ">
              <p>No traders in this sector yet</p>
            </div>
          )}
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Trader Addition</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to add a trader to {category} sector?
          <p>New Trader price is {coinsDecrease} coins</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddTrader}>
            Add Trader
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showMaxTradersModal} onHide={() => setShowMaxTradersModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Maximum Traders Reached</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Maximum number of traders ({maxTraders}) reached in this sector. You cannot add another
          trader.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowMaxTradersModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showNotEnoughMoneyModal} onHide={() => setShowNotEnoughMoneyModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Not Enough Money</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          You do not have enough money to add a trader. Please acquire more coins before adding a
          trader.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowNotEnoughMoneyModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showUpdatedInfoModal} onHide={() => setShowUpdatedInfoModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Trader Added Successfully!</Modal.Title>
        </Modal.Header>
        <Modal.Body>Trader has been added! </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowUpdatedInfoModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PrivozSector;
