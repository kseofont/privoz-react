import React, { useState } from 'react';
import { Modal, Button, Row, Col } from 'react-bootstrap';
import Trader from './Trader';

const PrivozSector = ({ category, maxTraders, gameState, myUserId, connection, setGameState }) => {
  const players = gameState?.players || [];
  const player = players.find(p => p.user_id === myUserId);
  const myTraders = player?.traders || [];

  const sectorTraders = players
    .flatMap(p => p.traders || [])
    .filter(trader => trader.location === category)
    .map(trader => ({ ...trader, owner: players.find(p => p.user_id === trader.traderOwnerId) }));

  // Состояния для разных модалок
  const [showNoTradersModal, setShowNoTradersModal] = useState(false);
  const [showTraderSelectModal, setShowTraderSelectModal] = useState(false);
  const [selectedTraderForSector, setSelectedTraderForSector] = useState(null);
  const [showMaxTradersModal, setShowMaxTradersModal] = useState(false);
  const [showNotEnoughMoneyModal, setShowNotEnoughMoneyModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const totalTradersCount = player?.tradersCount || 0;
  const coinsDecrease = totalTradersCount <= 1 ? 0 : totalTradersCount * 5;

  const handleSectorClick = () => {
    if (!myTraders.length) {
      setShowNoTradersModal(true);
      return;
    }
    setShowTraderSelectModal(true);
  };

  const handleConfirmAddTrader = () => {
    if (!selectedTraderForSector) return;
    setGameState(prev => {
      if (!prev || !prev.players) return prev;
      const playerIdx = prev.players.findIndex(p => p.user_id === myUserId);
      if (playerIdx === -1) return prev;
      const player = prev.players[playerIdx];

      const tradersInSelectedSector = prev.players
        .flatMap(p => p.traders || [])
        .filter(trader => trader.location === category);

      if (tradersInSelectedSector.length >= maxTraders) {
        setShowMaxTradersModal(true);
        setShowTraderSelectModal(false);
        return prev;
      }

      const totalTradersCount = player.tradersCount || 0;
      const coinsDecrease = totalTradersCount <= 1 ? 0 : totalTradersCount * 5;
      const updatedCoins = (player.coins || 0) - coinsDecrease;
      if (updatedCoins < 0) {
        setShowNotEnoughMoneyModal(true);
        setShowTraderSelectModal(false);
        return prev;
      }

      // Обновляем location только для выбранного трейдера
      const updatedTraders = (player.traders || []).map(t =>
        t === selectedTraderForSector ? { ...t, location: category } : t
      );

      const updatedPlayer = {
        ...player,
        traders: updatedTraders,
        coins: updatedCoins,
      };

      const updatedPlayers = [...prev.players];
      updatedPlayers[playerIdx] = updatedPlayer;

      setShowTraderSelectModal(false);
      setShowSuccessModal(true);
      return { ...prev, players: updatedPlayers };
    });

    // Для P2P логики отправляй экшн хосту
    if (connection) {
      connection.send({
        type: 'addTraderToSector',
        payload: {
          sector: category,
          userId: myUserId,
          traderId: selectedTraderForSector.traderId,
        },
      });
    }
  };

  return (
    <div className="yarr2">
      <div
        className={`sector border p-3 mb-3 ${category.toLowerCase()}`}
        onClick={handleSectorClick}
        style={{ cursor: 'pointer' }}
      >
        <div className="row gap-1">
          {sectorTraders.length > 0 ? (
            sectorTraders.map((trader, idx) => (
              <Trader key={idx} user={trader.owner} trader={trader} />
            ))
          ) : (
            <div className="col border text-center pb-4 trader-block ">
              <p>No traders in this sector yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Модалка: Нет торговцев */}
      <Modal show={showNoTradersModal} onHide={() => setShowNoTradersModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Нет торговцев</Modal.Title>
        </Modal.Header>
        <Modal.Body>Сначала купите торговца, чтобы разместить его в секторе!</Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowNoTradersModal(false)}>
            ОК
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Модалка: Выбор трейдера */}
      <Modal show={showTraderSelectModal} onHide={() => setShowTraderSelectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Выберите трейдера для размещения в секторе "{category}"</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            {myTraders.map((trader, idx) => (
              <Col key={idx} xs={12}>
                <Button
                  variant={selectedTraderForSector === trader ? 'primary' : 'outline-primary'}
                  className="w-100 mb-2"
                  onClick={() => setSelectedTraderForSector(trader)}
                  disabled={!!trader.location} // не даём выбрать уже размещённых
                >
                  {trader.traderName || `Трейдер #${idx + 1}`}
                  {trader.location && <span> (сектор: {trader.location})</span>}
                </Button>
              </Col>
            ))}
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTraderSelectModal(false)}>
            Отмена
          </Button>
          <Button
            variant="success"
            disabled={!selectedTraderForSector || !!selectedTraderForSector?.location}
            onClick={handleConfirmAddTrader}
          >
            Разместить трейдера
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Модалка: Максимум трейдеров */}
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

      {/* Модалка: Не хватает денег */}
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

      {/* Модалка: Успех */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Trader Added Successfully!</Modal.Title>
        </Modal.Header>
        <Modal.Body>Trader has been added!</Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowSuccessModal(false)}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PrivozSector;
