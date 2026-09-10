import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, Row, Col } from 'react-bootstrap';

import Trader from './Trader';

import { placeTraderAction } from '../game/actions';
import { gameReducer } from '../game/reducer';
import { prepareAuthoritativeGameAction } from '../game/hostActionPreparation';
import {
  MAX_TRADER_GOODS,
  isProductAllowedInSector,
  validatePlaceTrader,
} from '../game/placeTraderRules';
import { recordAcceptedLearningDecision } from '../learning/recordAcceptedLearningDecision';

const PrivozSector = ({
  category,
  maxTraders,
  gameState,
  myUserId,
  connection,
  myTurn,
  setGameState,
  broadcastGameState,
  clickable,
}) => {
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
    if (!clickable || !myTurn) {
      return;
    }

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

  const showValidationError = reason => {
    if (reason === 'sector_full') {
      setShowMaxTradersModal(true);
    } else if (reason === 'not_enough_coins') {
      setShowNotEnoughMoneyModal(true);
    } else {
      console.warn('[PrivozSector] PLACE_TRADER validation failed:', reason);
    }
  };

  const finishPlacementUi = ({ eventCard = null } = {}) => {
    setLastAddedEventCard(eventCard);
    setShowTraderSelectModal(false);
    setShowProductSelectModal(false);
    setShowSuccessModal(true);
    setSelectedProducts([]);
    setSelectedTraderForSector(null);
  };

  const submitPlaceTrader = productIds => {
    if (!selectedTraderForSector || !gameState || !myTurn) {
      return;
    }

    const action = placeTraderAction({
      playerId: myUserId,
      traderId: selectedTraderForSector.traderId,
      sector: category,
      productIds,
    });
    const clientValidation = validatePlaceTrader(gameState, action.payload);

    if (!clientValidation.ok) {
      showValidationError(clientValidation.reason);
      return;
    }

    const isHost = !connection;

    if (isHost) {
      const authoritativeAction = prepareAuthoritativeGameAction(gameState, action, myUserId);
      const nextState = gameReducer(gameState, authoritativeAction);

      if (nextState === gameState) {
        console.warn('[PrivozSector] Host PLACE_TRADER rejected:', authoritativeAction);
        return;
      }

      recordAcceptedLearningDecision({
        beforeState: gameState,
        afterState: nextState,
        action: authoritativeAction,
        actorId: myUserId,
      });

      const awardedEventCardId = authoritativeAction.payload?.eventCardId;
      const eventCard = awardedEventCardId
        ? nextState.players
            ?.find(player => player.user_id === myUserId)
            ?.eventCards?.find(card => card.id === awardedEventCardId) || null
        : null;

      setGameState(nextState);

      if (typeof broadcastGameState === 'function') {
        broadcastGameState(nextState);
      }

      finishPlacementUi({ eventCard });
      return;
    }

    if (!connection?.open) {
      console.error('[PrivozSector] Cannot send PLACE_TRADER: connection is not open.');
      return;
    }

    try {
      connection.send({
        type: 'gameAction',
        action,
      });

      /*
       * The host will validate again and broadcast authoritative state.
       * Close the selection UI now; the market rendering itself updates
       * only after that authoritative broadcast arrives.
       */
      finishPlacementUi();
    } catch (error) {
      console.error('[PrivozSector] Failed to send PLACE_TRADER:', error);
    }
  };

  const handleConfirmAddTrader = () => {
    submitPlaceTrader([]);
  };

  const handleConfirmAddTraderWithProducts = () => {
    submitPlaceTrader(selectedProducts.map(product => product.productId));
  };

  return (
    <div className="yarr2">
      <h3>{category}</h3>

      <div
        className={`sector border p-3 mb-3 ${category.toLowerCase()}`}
        onClick={handleSectorClick}
        style={{
          cursor: clickable && myTurn ? 'pointer' : 'not-allowed',
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
          <div className="small text-muted mb-2">
            Можно передать до {MAX_TRADER_GOODS} товаров. Легальные товары должны соответствовать
            сектору; нелегальные можно разместить в любом секторе.
          </div>

          <Row>
            {playerProducts.length === 0 && (
              <div className="text-muted">У вас нет товаров для передачи продавцу.</div>
            )}

            {playerProducts.flatMap(product => {
              const canAdd = isProductAllowedInSector(product, category);

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
                        disabled={
                          !canAdd ||
                          (selectedProducts.filter(
                            selected => selected.productId === product.productId
                          ).length <= index &&
                            selectedProducts.length >= MAX_TRADER_GOODS)
                        }
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
            Передать товары продавцу ({selectedProducts.length}/{MAX_TRADER_GOODS})
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
