import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';

import Product from '../components/Product';
import Menu from '../components/Menu';

import localProductsData from '../data/products.json';

import { connectionsRef } from '../globals';

import { handleHostEndTurn, getField } from '../logic/logic';

const Wholesale = () => {
  const { t, i18n } = useTranslation();

  const lang = i18n.language || 'en';

  const location = useLocation();
  const params = useParams();

  /*
   * Legacy navigation fallback.
   *
   * window.* stays temporarily because the current application still
   * uses it between pages. We will remove this later when GameSession
   * becomes the single source of truth.
   */
  const initialGameState = location.state?.gameState || window.gameState || null;

  const initialMyUserId = location.state?.myUserId || window.myUserId || params.peerId || null;

  const initialConnection = location.state?.connection || window.currentPrivozConnection || null;

  const [gameState, setGameState] = useState(initialGameState);

  /*
   * These values don't change during Wholesale.
   *
   * Previously they were state variables with unused setters.
   */
  const connection = initialConnection;
  const myUserId = initialMyUserId;

  const [showModal, setShowModal] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);

  /*
   * Make sure the current user actually exists in gameState.
   */
  const isAuthorized =
    !!myUserId &&
    !!gameState &&
    Array.isArray(gameState.players) &&
    gameState.players.some(player => player.user_id === myUserId);

  /*
   * Host doesn't have a PeerJS DataConnection to himself.
   */
  const isHost = !connection;

  const myTurn = isAuthorized && gameState?.currentTurnUserId === myUserId;

  /*
   * Keep the old global navigation state synchronized.
   *
   * IMPORTANT:
   * connectionsRef itself is no longer reconstructed from window globals.
   * It is imported directly from globals.js and stays the same shared ref.
   */
  useEffect(() => {
    if (gameState) {
      window.gameState = gameState;
    }

    if (myUserId) {
      window.myUserId = myUserId;
    }

    window.currentPrivozConnection = connection || null;
  }, [gameState, myUserId, connection]);

  /*
   * Host broadcasts current game state to all active clients.
   */
  const broadcastGameState = state => {
    const stateToSend = state || gameState;

    if (!stateToSend) {
      return;
    }

    connectionsRef.current.forEach(conn => {
      if (!conn?.open) {
        return;
      }

      try {
        conn.send({
          type: 'gameState',
          gameState: stateToSend,
        });
      } catch (error) {
        console.error(`[Wholesale] Failed to send gameState to ${conn.peer}:`, error);
      }
    });
  };

  /*
   * HOST DATA LISTENERS
   *
   * Previously Wholesale added:
   *
   * conn.on('data', ...)
   *
   * on every mount but never removed it.
   *
   * After multiple rounds the host could therefore accumulate several
   * Wholesale listeners on the same connection.
   */
  useEffect(() => {
    if (!isHost) {
      return undefined;
    }

    const handler = handleHostEndTurn({
      connectionsRef,
      setGameState,
    });

    const subscriptions = connectionsRef.current.map(conn => {
      const onData = data => {
        handler(data, conn);
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
  }, [isHost]);

  /*
   * CLIENT DATA LISTENER
   *
   * Receive authoritative gameState from host.
   */
  useEffect(() => {
    if (!connection) {
      return undefined;
    }

    const onData = data => {
      console.log('[Wholesale] Received data:', data);

      if (data.type === 'gameState' && data.gameState) {
        setGameState(data.gameState);
      }
    };

    connection.on('data', onData);

    return () => {
      connection.off('data', onData);
    };
  }, [connection]);

  /*
   * Products fallback.
   */
  const defaultProducts = Array.isArray(localProductsData.products)
    ? localProductsData.products
    : Array.isArray(localProductsData)
      ? localProductsData
      : [];

  /*
   * Authorized players use the synchronized gameState.
   * Non-authorized visitors only see local product data.
   */
  const safeProducts = isAuthorized
    ? Array.isArray(gameState?.products)
      ? gameState.products
      : Array.isArray(gameState?.products?.products)
        ? gameState.products.products
        : []
    : defaultProducts;

  /*
   * Group products by market sector.
   */
  const groupedBySector = safeProducts.reduce((acc, product) => {
    const sector = product.sector || product.product_sector || 'unknown';

    if (!acc[sector]) {
      acc[sector] = [];
    }

    acc[sector].push(product);

    return acc;
  }, {});

  /*
   * Open confirmation modal.
   */
  const handleSelectProduct = product => {
    if (!isAuthorized || !myTurn) {
      return;
    }

    setSelectedProduct(product);
    setShowModal(true);
  };

  /*
   * Confirm wholesale purchase.
   *
   * Gameplay intentionally stays exactly as it was before the
   * PeerJS lifecycle stabilization.
   */
  const handleConfirmProduct = () => {
    if (!selectedProduct || !isAuthorized || !gameState) {
      return;
    }

    setGameState(prev => {
      if (!prev) {
        return prev;
      }

      /*
       * Resolve the latest product object from current gameState.
       */
      const productList = Array.isArray(prev.products)
        ? prev.products
        : Array.isArray(prev.products?.products)
          ? prev.products.products
          : [];

      const productIndex = productList.findIndex(
        product => product.productId === selectedProduct.productId
      );

      if (productIndex === -1) {
        return prev;
      }

      const product = productList[productIndex];

      /*
       * No free cards left.
       */
      if ((product.quantity_free_card || 0) <= 0) {
        return prev;
      }

      const playerIndex = prev.players.findIndex(player => player.user_id === myUserId);

      if (playerIndex === -1) {
        return prev;
      }

      const player = prev.players[playerIndex];

      /*
       * Not enough money.
       */
      if ((player.coins || 0) < (product.wholesalePrice || 0)) {
        return prev;
      }

      /*
       * Reduce available wholesale quantity.
       */
      const updatedProduct = {
        ...product,

        quantity_free_card: Math.max(0, (product.quantity_free_card || 0) - 1),
      };

      const updatedProductList = [...productList];

      updatedProductList[productIndex] = updatedProduct;

      /*
       * Add purchased card to player's inventory.
       */
      const playerProducts = Array.isArray(player.products) ? [...player.products] : [];

      const existingPlayerProductIndex = playerProducts.findIndex(
        playerProduct => playerProduct.productId === updatedProduct.productId
      );

      if (existingPlayerProductIndex !== -1) {
        playerProducts[existingPlayerProductIndex] = {
          ...playerProducts[existingPlayerProductIndex],
          ...updatedProduct,

          quantity_player_card:
            (playerProducts[existingPlayerProductIndex].quantity_player_card || 1) + 1,
        };
      } else {
        playerProducts.push({
          ...updatedProduct,
          quantity_player_card: 1,
        });
      }

      /*
       * Charge the player.
       */
      const newCoins = Math.max(0, (player.coins || 0) - (product.wholesalePrice || 0));

      const updatedPlayer = {
        ...player,
        products: playerProducts,
        coins: newCoins,
      };

      const updatedPlayers = [...prev.players];

      updatedPlayers[playerIndex] = updatedPlayer;

      /*
       * Preserve the existing shape of gameState.products.
       *
       * The project currently supports both:
       *
       * products: [...]
       *
       * and:
       *
       * products: {
       *   products: [...]
       * }
       */
      let newProducts;

      if (Array.isArray(prev.products)) {
        newProducts = updatedProductList;
      } else if (prev.products && Array.isArray(prev.products.products)) {
        newProducts = {
          ...prev.products,
          products: updatedProductList,
        };
      } else {
        newProducts = prev.products;
      }

      setShowModal(false);

      return {
        ...prev,
        players: updatedPlayers,
        products: newProducts,
      };
    });
  };

  const currentPlayer = gameState?.players?.find(player => player.user_id === myUserId) || {};

  const selectedProductPrice = selectedProduct?.wholesalePrice || 0;

  const currentPlayerCoins = currentPlayer.coins || 0;

  const enoughCoinsForSelectedProduct = currentPlayerCoins >= selectedProductPrice;

  return (
    <div className="container-fluid">
      <div className="row flex-column flex-sm-row">
        <div className="col-12 col-sm-9 order-2 order-sm-1 d-flex flex-column justify-content-center align-items-center text-center">
          <div className="row flex-column flex-sm-row">
            <h2>Wholesale Marketplace</h2>

            {!isAuthorized && (
              <div className="alert alert-warning mb-3">
                Вы не подключены к игре. Ниже - полный список товаров. Для участия войдите в игру.
              </div>
            )}

            <div className="row">
              <h2>All cards in the game</h2>

              <h2>{t('makePurchaseAtWholesale')}</h2>
            </div>

            {Object.keys(groupedBySector).map(sector => (
              <div key={sector} className={`col-12 col-sm-6 ${sector}`}>
                <div className="row">
                  <h3 className="bg-white">{sector.charAt(0).toUpperCase() + sector.slice(1)}</h3>

                  {groupedBySector[sector].map((product, index) => (
                    <div
                      key={product.productId || index}
                      className="col"
                      style={{
                        minWidth: 240,

                        cursor: isAuthorized && myTurn ? 'pointer' : 'not-allowed',

                        opacity: isAuthorized && myTurn ? 1 : 0.5,
                      }}
                      onClick={() => {
                        handleSelectProduct(product);
                      }}
                    >
                      <div className="border mb-3">
                        <Product
                          sector={sector}
                          productName={getField(product, 'productName', lang)}
                          imageSrc={product.imageSrc}
                          wholesalePrice={product.wholesalePrice}
                          retailPrice={product.sellingPrice}
                          possibleIncome={product.profit}
                          quantity_card={product.quantity_card}
                          quantity_free_card={product.quantity_free_card}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <Modal show={showModal} onHide={() => setShowModal(false)}>
              <Modal.Header closeButton>
                <Modal.Title>
                  {selectedProduct ? getField(selectedProduct, 'productName', lang) : ''}
                </Modal.Title>
              </Modal.Header>

              <Modal.Body>
                {isAuthorized && !myTurn && (
                  <div className="text-danger">Сейчас не ваш ход. Покупка недоступна.</div>
                )}

                {isAuthorized ? (
                  selectedProduct ? (
                    enoughCoinsForSelectedProduct ? (
                      <>
                        <div>Вы уверены, что хотите выбрать этот товар?</div>

                        <div>
                          Цена: <b>{selectedProductPrice} монет</b>
                          <br />
                          Ваши монеты: {currentPlayerCoins}
                        </div>

                        <div>
                          <b>Сектор:</b> {selectedProduct.sector || selectedProduct.product_sector}
                        </div>
                      </>
                    ) : (
                      <div className="text-danger">
                        Недостаточно монет для покупки! Не хватает{' '}
                        {selectedProductPrice - currentPlayerCoins} монет.
                      </div>
                    )
                  ) : (
                    <div>Товар не выбран</div>
                  )
                ) : (
                  <div className="text-warning">
                    Для выбора товара нужно быть подключённым к игре!
                  </div>
                )}
              </Modal.Body>

              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  Отмена
                </Button>

                <Button
                  variant="primary"
                  onClick={handleConfirmProduct}
                  disabled={
                    !isAuthorized || !selectedProduct || !myTurn || !enoughCoinsForSelectedProduct
                  }
                >
                  Подтвердить выбор
                </Button>
              </Modal.Footer>
            </Modal>
          </div>
        </div>

        <div className="col-12 col-sm-3 order-1 order-sm-2 border-start">
          <Menu
            gameState={gameState}
            myUserId={myUserId}
            connection={connection}
            setGameState={isHost ? setGameState : undefined}
            broadcastGameState={isHost ? broadcastGameState : undefined}
            connectionsRef={connectionsRef}
          />
        </div>
      </div>
    </div>
  );
};

export default Wholesale;
