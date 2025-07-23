import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Row, Col } from 'react-bootstrap';
import Trader from './Trader';

const PrivozSector = ({ category, maxTraders, gameState, myUserId, connection, setGameState }) => {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const players = gameState?.players || [];
  const player = players.find(p => p.user_id === myUserId);
  const myTraders = player?.traders || [];

  const sectorTraders = players
    .flatMap(p => p.traders || [])
    .filter(trader => trader.location === category)
    .map(trader => ({ ...trader, owner: { name: player.name, color: player.color } }));

  // Состояния для разных модалок
  const [showNoTradersModal, setShowNoTradersModal] = useState(false);
  const [showTraderSelectModal, setShowTraderSelectModal] = useState(false);
  const [selectedTraderForSector, setSelectedTraderForSector] = useState(null);
  const [showMaxTradersModal, setShowMaxTradersModal] = useState(false);
  const [showNotEnoughMoneyModal, setShowNotEnoughMoneyModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const totalTradersCount = player?.tradersCount || 0;
  const coinsDecrease = totalTradersCount <= 1 ? 0 : totalTradersCount * 5;
  const getField = (obj, field, lang = 'en') => {
    if (!obj || !obj[field]) return '';
    if (typeof obj[field] === 'string') return obj[field];
    return obj[field][lang] || obj[field].en || Object.values(obj[field])[0] || '';
  };
  const myAvailableTraders = myTraders.filter(trader => !trader.location);

  const [showProductSelectModal, setShowProductSelectModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]); // Массив выбранных товаров для трейдера

  const handleSectorClick = () => {
    if (!myTraders.length) {
      setShowNoTradersModal(true);
      return;
    }
    if (!myAvailableTraders.length) {
      setShowNoTradersModal(true);
      return;
    }
    setShowTraderSelectModal(true);
  };

  const handleSelectTraderForSector = trader => {
    setSelectedTraderForSector(trader);
    setShowProductSelectModal(true); // Показываем модалку выбора товаров
  };

  const playerProducts = player?.products || [];

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
        t === selectedTraderForSector
          ? { ...t, card_in_game: `sector_${category}_user_${myUserId}`, location: category }
          : t
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

  const handleConfirmAddTraderWithProducts = () => {
    if (!selectedTraderForSector) return;
    setGameState(prev => {
      if (!prev || !prev.players) return prev;
      const playerIdx = prev.players.findIndex(p => p.user_id === myUserId);
      if (playerIdx === -1) return prev;
      const player = prev.players[playerIdx];

      // Обновляем только выбранного трейдера (добавляем ему goods)
      const updatedTraders = (player.traders || []).map(t =>
        t === selectedTraderForSector
          ? {
              ...t,
              card_in_game: `sector_${category}_user_${myUserId}`,
              location: category,
              goods: selectedProducts, // Здесь весь массив товаров с количеством
            }
          : t
      );

      // Можно убрать эти продукты из player.products если нужно

      const updatedPlayer = {
        ...player,
        traders: updatedTraders,
        coins: (player.coins || 0) - coinsDecrease,
        // products: ... (если нужно удалять отданные товары из продуктов игрока)
      };

      const updatedPlayers = [...prev.players];
      updatedPlayers[playerIdx] = updatedPlayer;

      setShowTraderSelectModal(false);
      setShowProductSelectModal(false);
      setShowSuccessModal(true);
      setSelectedProducts([]); // очищаем
      return { ...prev, players: updatedPlayers };
    });

    if (connection) {
      connection.send({
        type: 'addTraderToSector',
        payload: {
          sector: category,
          userId: myUserId,
          traderId: selectedTraderForSector.traderId,
          goods: selectedProducts,
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
              <Trader key={idx} user={trader.owner} trader={trader} gameState={gameState} />
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
            {myAvailableTraders.map((trader, idx) => (
              <Col key={idx} xs={12}>
                <Button
                  variant={selectedTraderForSector === trader ? 'primary' : 'outline-primary'}
                  className="w-100 mb-2 text-start"
                  onClick={() => handleSelectTraderForSector(trader)}
                >
                  <div>
                    <b>{getField(trader, 'name', lang)}</b>
                    <div className="small text-muted">{getField(trader, 'bio', lang)}</div>
                  </div>
                </Button>
              </Col>
            ))}
          </Row>
          {myAvailableTraders.length === 0 && (
            <div className="text-center text-muted p-3">
              У вас нет свободных торговцев для размещения.
            </div>
          )}

          {selectedTraderForSector && (
            <div className="mt-3 p-2 border rounded">
              <b>Выбранный трейдер:</b>
              <div>
                <b>{getField(selectedTraderForSector, 'name', lang)}</b>
              </div>
              <div>{getField(selectedTraderForSector, 'bio', lang)}</div>
            </div>
          )}
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

      <Modal show={showProductSelectModal} onHide={() => setShowProductSelectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            Выберите товары для {getField(selectedTraderForSector, 'name', lang)}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            {playerProducts.length === 0 && (
              <div className="text-muted">У вас нет товаров для передачи продавцу.</div>
            )}

            {playerProducts.flatMap((prod, idx) =>
              Array.from({ length: prod.quantity_player_card || 1 }, (_, i) => (
                <Col key={`${prod.productId}-${i}`} xs={12}>
                  <div className="d-flex align-items-center mb-2">
                    <input
                      type="checkbox"
                      checked={
                        selectedProducts.filter(p => p.productId === prod.productId).length > i
                      }
                      onChange={() => {
                        setSelectedProducts(prev => {
                          const selectedOfThisProduct = prev.filter(
                            p => p.productId === prod.productId
                          );
                          if (selectedOfThisProduct.length > i) {
                            // Удаляем i-й экземпляр
                            const indexToRemove = prev.findIndex(
                              (p, idx) =>
                                p.productId === prod.productId &&
                                selectedOfThisProduct.indexOf(p) === i
                            );
                            return [
                              ...prev.slice(0, indexToRemove),
                              ...prev.slice(indexToRemove + 1),
                            ];
                          } else {
                            // Добавляем новый экземпляр
                            return [...prev, { ...prod, quantity_player_card: 1 }];
                          }
                        });
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    <span>
                      {getField(prod, 'productName', lang)} (#{i + 1})
                    </span>
                  </div>
                </Col>
              ))
            )}
          </Row>

          {/* Можно добавить выбор количества товаров */}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowProductSelectModal(false)}>
            Отмена
          </Button>
          <Button
            variant="success"
            disabled={selectedProducts.length === 0}
            onClick={handleConfirmAddTraderWithProducts}
          >
            Передать товары продавцу
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
