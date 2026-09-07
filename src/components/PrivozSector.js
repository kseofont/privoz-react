import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Row, Col } from 'react-bootstrap';

import Trader from './Trader';

import { player_add_event } from '../logic/logic';

const PrivozSector = ({ category, maxTraders, gameState, myUserId, setGameState }) => {
  const { i18n } = useTranslation();

  const lang = i18n.language || 'en';

  const players = gameState?.players || [];

  const player = players.find(currentPlayer => currentPlayer.user_id === myUserId);

  const myTraders = player?.traders || [];

  /*
   * All traders currently placed in this sector.
   *
   * Attach owner information only for rendering.
   */
  const sectorTraders = players
    .flatMap(currentPlayer =>
      (currentPlayer.traders || []).map(trader => ({
        ...trader,

        owner: {
          name: currentPlayer.name,
          color: currentPlayer.color,
        },
      }))
    )
    .filter(trader => trader.location === category);

  const [showNoTradersModal, setShowNoTradersModal] = useState(false);

  const [showTraderSelectModal, setShowTraderSelectModal] = useState(false);

  const [selectedTraderForSector, setSelectedTraderForSector] = useState(null);

  const [showMaxTradersModal, setShowMaxTradersModal] = useState(false);

  const [showNotEnoughMoneyModal, setShowNotEnoughMoneyModal] = useState(false);

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [lastAddedEventCard, setLastAddedEventCard] = useState(null);

  const [showProductSelectModal, setShowProductSelectModal] = useState(false);

  const [selectedProducts, setSelectedProducts] = useState([]);

  const totalTradersCount = player?.tradersCount || 0;

  /*
   * Existing placement cost.
   *
   * Gameplay remains unchanged during this stabilization pass.
   */
  const coinsDecrease = totalTradersCount <= 1 ? 0 : totalTradersCount * 5;

  const getField = (obj, field, currentLang = 'en') => {
    if (!obj || !obj[field]) {
      return '';
    }

    if (typeof obj[field] === 'string') {
      return obj[field];
    }

    return obj[field][currentLang] || obj[field].en || Object.values(obj[field])[0] || '';
  };

  const myAvailableTraders = myTraders.filter(trader => !trader.location);

  const playerProducts = player?.products || [];

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

    setShowProductSelectModal(true);
  };

  /*
   * Place trader without products.
   *
   * IMPORTANT:
   * The previous implementation also sent:
   *
   * {
   *   type: 'addTraderToSector'
   * }
   *
   * to the host.
   *
   * There is currently no host handler for that message, so it had no
   * effect. We remove that dead network message now.
   *
   * Client state is still synchronized with the host through the existing
   * endTurn flow, exactly as before.
   */
  const handleConfirmAddTrader = () => {
    if (!selectedTraderForSector) {
      return;
    }

    setGameState(prev => {
      if (!prev || !Array.isArray(prev.players)) {
        return prev;
      }

      const playerIndex = prev.players.findIndex(
        currentPlayer => currentPlayer.user_id === myUserId
      );

      if (playerIndex === -1) {
        return prev;
      }

      const currentPlayer = prev.players[playerIndex];

      const tradersInSelectedSector = prev.players
        .flatMap(current => current.traders || [])
        .filter(trader => trader.location === category);

      if (tradersInSelectedSector.length >= maxTraders) {
        setShowMaxTradersModal(true);
        setShowTraderSelectModal(false);

        return prev;
      }

      const currentTradersCount = currentPlayer.tradersCount || 0;

      const placementCost = currentTradersCount <= 1 ? 0 : currentTradersCount * 5;

      const updatedCoins = (currentPlayer.coins || 0) - placementCost;

      if (updatedCoins < 0) {
        setShowNotEnoughMoneyModal(true);
        setShowTraderSelectModal(false);

        return prev;
      }

      /*
       * Compare by traderId instead of object identity.
       *
       * This is safer if gameState was refreshed between selecting and
       * confirming the trader.
       */
      const updatedTraders = (currentPlayer.traders || []).map(trader =>
        trader.traderId === selectedTraderForSector.traderId
          ? {
              ...trader,

              card_in_game: `sector_${category}_user_${myUserId}`,

              location: category,
            }
          : trader
      );

      const updatedPlayer = {
        ...currentPlayer,

        traders: updatedTraders,
        coins: updatedCoins,
      };

      const updatedPlayers = [...prev.players];

      updatedPlayers[playerIndex] = updatedPlayer;

      setShowTraderSelectModal(false);
      setShowSuccessModal(true);

      return {
        ...prev,
        players: updatedPlayers,
      };
    });
  };

  /*
   * Place trader and transfer selected products.
   *
   * Existing gameplay is intentionally preserved here.
   *
   * The temporary addTraderToSector PeerJS message has also been removed
   * from this flow.
   */
  const handleConfirmAddTraderWithProducts = () => {
    if (!selectedTraderForSector) {
      return;
    }

    setGameState(prev => {
      if (!prev || !Array.isArray(prev.players)) {
        return prev;
      }

      const playerIndex = prev.players.findIndex(
        currentPlayer => currentPlayer.user_id === myUserId
      );

      if (playerIndex === -1) {
        return prev;
      }

      const currentPlayer = prev.players[playerIndex];

      /*
       * Copy products currently held by the player.
       */
      const updatedPlayerProducts = Array.isArray(currentPlayer.products)
        ? [...currentPlayer.products]
        : [];

      /*
       * Remove each transferred product card from player's hand.
       */
      selectedProducts.forEach(selectedProduct => {
        const productIndex = updatedPlayerProducts.findIndex(
          product => product.productId === selectedProduct.productId
        );

        if (productIndex === -1) {
          return;
        }

        const quantity = updatedPlayerProducts[productIndex].quantity_player_card || 1;

        if (quantity > 1) {
          updatedPlayerProducts[productIndex] = {
            ...updatedPlayerProducts[productIndex],

            quantity_player_card: quantity - 1,
          };
        } else {
          updatedPlayerProducts.splice(productIndex, 1);
        }
      });

      /*
       * Place the selected trader and give him the selected goods.
       */
      const updatedTraders = (currentPlayer.traders || []).map(trader =>
        trader.traderId === selectedTraderForSector.traderId
          ? {
              ...trader,

              card_in_game: `sector_${category}_user_${myUserId}`,

              location: category,

              goods: selectedProducts,
            }
          : trader
      );

      const updatedPlayer = {
        ...currentPlayer,

        traders: updatedTraders,

        coins: (currentPlayer.coins || 0) - coinsDecrease,

        products: updatedPlayerProducts,
      };

      const updatedPlayers = [...prev.players];

      updatedPlayers[playerIndex] = updatedPlayer;

      const newGameState = {
        ...prev,
        players: updatedPlayers,
      };

      /*
       * Keep the current event-card behavior unchanged for now.
       *
       * The return contract of player_add_event() will be fixed in the
       * NEXT small stabilization commit.
       */
      const [eventedGameState, card] = player_add_event(newGameState, myUserId);

      setLastAddedEventCard(card);

      setShowTraderSelectModal(false);
      setShowProductSelectModal(false);
      setShowSuccessModal(true);
      setSelectedProducts([]);

      return eventedGameState;
    });
  };

  return (
    <div className="yarr2">
      <h3>{category}</h3>

      <div
        className={`sector border p-3 mb-3 ${category.toLowerCase()}`}
        onClick={handleSectorClick}
        style={{
          cursor: 'pointer',
        }}
      >
        <div className="row gap-1">
          {sectorTraders.length > 0 ? (
            sectorTraders.map(trader => (
              <Trader
                key={`${trader.traderOwnerId || trader.owner?.name}-${trader.traderId}`}
                user={trader.owner}
                trader={trader}
                gameState={gameState}
              />
            ))
          ) : (
            <div className="col border text-center pb-4 trader-block">
              <p>No traders in this sector yet</p>
            </div>
          )}
        </div>
      </div>

      {/* No traders */}
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

      {/* Trader selection */}
      <Modal show={showTraderSelectModal} onHide={() => setShowTraderSelectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Выберите трейдера для размещения в секторе "{category}"</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Row>
            {myAvailableTraders.map(trader => (
              <Col key={trader.traderId} xs={12}>
                <Button
                  variant={
                    selectedTraderForSector?.traderId === trader.traderId
                      ? 'primary'
                      : 'outline-primary'
                  }
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

      {/* Product selection */}
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

            {playerProducts.flatMap(product => {
              const productSector = (product.product_sector || '').toLowerCase();

              const currentSector = (category || '').toLowerCase();

              const canAdd = productSector === currentSector || product.legality === 'illegal';

              return Array.from(
                {
                  length: product.quantity_player_card || 1,
                },
                (_, index) => (
                  <Col key={`${product.productId}-${index}`} xs={12}>
                    <div className="d-flex align-items-center mb-2">
                      <input
                        type="checkbox"
                        checked={
                          selectedProducts.filter(
                            selected => selected.productId === product.productId
                          ).length > index
                        }
                        disabled={!canAdd}
                        onChange={() => {
                          if (!canAdd) {
                            return;
                          }

                          setSelectedProducts(prev => {
                            const selectedOfThisProduct = prev.filter(
                              selected => selected.productId === product.productId
                            );

                            if (selectedOfThisProduct.length > index) {
                              let occurrenceIndex = -1;

                              const indexToRemove = prev.findIndex(selected => {
                                if (selected.productId !== product.productId) {
                                  return false;
                                }

                                occurrenceIndex += 1;

                                return occurrenceIndex === index;
                              });

                              if (indexToRemove === -1) {
                                return prev;
                              }

                              return [
                                ...prev.slice(0, indexToRemove),

                                ...prev.slice(indexToRemove + 1),
                              ];
                            }

                            return [
                              ...prev,

                              {
                                ...product,
                                quantity_player_card: 1,
                              },
                            ];
                          });
                        }}
                        style={{
                          marginRight: '8px',
                        }}
                      />

                      <span>
                        {getField(product, 'productName', lang)} (#{index + 1})
                        {!canAdd && (
                          <span className="text-danger small ms-2">
                            (нельзя добавить в этот сектор)
                          </span>
                        )}
                      </span>
                    </div>
                  </Col>
                )
              );
            })}
          </Row>
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

      {/* Maximum traders */}
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

      {/* Not enough money */}
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

      {/* Success */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Trader Added Successfully!</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          Trader has been added!
          {lastAddedEventCard && (
            <div className="mt-3 p-2 border rounded bg-light">
              <div>
                <b>Вам выпала карта события!</b>
              </div>

              <div>
                <b>
                  {typeof lastAddedEventCard.title === 'object'
                    ? lastAddedEventCard.title[lang] || lastAddedEventCard.title.en
                    : lastAddedEventCard.title}
                </b>
              </div>

              <div className="small text-muted">
                {typeof lastAddedEventCard.description === 'object'
                  ? lastAddedEventCard.description[lang] || lastAddedEventCard.description.en
                  : lastAddedEventCard.description}
              </div>

              <div>
                <b>Тип:</b>{' '}
                {lastAddedEventCard.fortune === 'positive' ? 'Позитивная' : 'Негативная'}
              </div>
            </div>
          )}
        </Modal.Body>

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
