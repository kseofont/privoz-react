import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';
import Product from '../components/Product';
import Menu from '../components/Menu';
import localProductsData from '../data/products.json';
import { Modal, Button } from 'react-bootstrap';
import {
  handleHostEndTurn,
  endTurn,
  handleSelectTrader as logicHandleSelectTrader,
  getField,
} from '../logic/logic';

const Wholesale = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const location = useLocation();
  const params = useParams();

  const initialGameState = location.state?.gameState || window.gameState || null;

  const initialMyUserId = location.state?.myUserId || window.myUserId || params.peerId || null;

  const initialConnection = location.state?.connection || window.currentPrivozConnection || null;
  const initialConnections =
    location.state?.connections || window.connectionsRefPrivozConnection?.current || [];

  const [gameState, setGameState] = useState(initialGameState);
  const [connection, setConnection] = useState(initialConnection);
  const [myUserId, setMyUserId] = useState(initialMyUserId);

  const isAuthorized = !!myUserId && !!gameState && Array.isArray(gameState.players);
  const connectionsRef =
    window.connectionsRefPrivozConnection || require('../globals').connectionsRef;
  const myTurn = isAuthorized && gameState?.currentTurnUserId === myUserId;

  useEffect(() => {
    if (gameState) window.gameState = gameState;
    if (myUserId) window.myUserId = myUserId;
    if (connection) window.currentPrivozConnection = connection;
    // Здесь перепишем защиту:
    if (Array.isArray(initialConnections) && initialConnections.length > 0) {
      connectionsRef.current = initialConnections;
    } else if (Array.isArray(window.connectionsRefPrivozConnection?.current)) {
      connectionsRef.current = window.connectionsRefPrivozConnection.current;
    } else {
      console.warn('[TraderList] connectionsRef.current не инициализирован!');
    }
  }, [gameState, myUserId, connection]);

  const isHost = !connection;

  // --- Хост: объяви broadcastGameState (можно скопировать из CreateServerPage)
  function broadcastGameState(state = gameState) {
    // connectionsRef должен содержать все conn для PeerJS!
    // connectionsRef.current = [conn1, conn2, ...]
    if (!connectionsRef.current) return;
    connectionsRef.current.forEach(conn => {
      try {
        conn.send({ type: 'gameState', gameState: state });
      } catch (e) {
        // Отлов ошибок — чтобы не падало при недоступном клиенте
        // Можно залогировать
        console.log('[CLIENT] Получено сообщение gameState:', conn.state);
      }
    });
  }
  useEffect(() => {
    console.log('GameState изменился!', gameState);
  }, [gameState]);
  // end turn from gamepage
  useEffect(() => {
    const isHost = !connection;
    if (!isHost) return;

    // Навешиваем обработчик на все новые подключения (или на имеющиеся)
    connectionsRef.current.forEach(conn => {
      const handler = handleHostEndTurn({ connectionsRef, setGameState });
      conn.on('data', data => handler(data, conn));
    });
    console.log('[TraderList] myUserId, connection, isHost:', { myUserId, connection, isHost });
    // Чистка при размонтировании, если потребуется
    // return () => { ... }
  }, [connection, setGameState]);

  useEffect(() => {
    if (!connection) return;

    const onData = data => {
      console.log('[TraderList] Received data:', data);
      if (data.type === 'gameState' && data.gameState) {
        setGameState(data.gameState);
      }
    };

    connection.on('data', onData);

    return () => {
      connection.off('data', onData);
    };
  }, [connection]);

  // --- список продуктов
  const defaultProducts = Array.isArray(localProductsData.products)
    ? localProductsData.products
    : Array.isArray(localProductsData)
    ? localProductsData
    : [];

  // Если авторизован — берем из gameState, иначе дефолт
  const safeProducts = isAuthorized
    ? Array.isArray(gameState?.products)
      ? gameState.products
      : Array.isArray(gameState?.products?.products)
      ? gameState.products.products
      : []
    : defaultProducts;

  // Группировка по секторам
  const groupedBySector = safeProducts.reduce((acc, product) => {
    const sector = product.sector || product.product_sector || 'unknown';
    if (!acc[sector]) acc[sector] = [];
    acc[sector].push(product);
    return acc;
  }, {});

  // --- модалка выбора товара ---
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  function handleSelectProduct(product) {
    if (!isAuthorized || !myTurn) return;
    setSelectedProduct(product);
    setShowModal(true);
  }

  function handleConfirmProduct() {
    if (!selectedProduct || !isAuthorized || !gameState) return;

    setGameState(prev => {
      if (!prev) return prev;

      // Получаем актуальный продукт из gamestate (по id, а не копии!)
      let productList = Array.isArray(prev.products)
        ? prev.products
        : Array.isArray(prev.products?.products)
        ? prev.products.products
        : [];

      const prodIdx = productList.findIndex(p => p.productId === selectedProduct.productId);
      if (prodIdx === -1) return prev;

      const product = productList[prodIdx];

      // Проверка: есть ли свободные карточки
      if ((product.quantity_free_card || 0) <= 0) return prev;

      // Находим игрока
      const playerIdx = prev.players.findIndex(p => p.user_id === myUserId);
      if (playerIdx === -1) return prev;

      const player = prev.players[playerIdx];

      // Проверка: хватает ли денег
      if ((player.coins || 0) < (product.wholesalePrice || 0)) return prev;

      // 1. Обновляем продукт (минус 1 свободная карта, не меньше 0)
      const updatedProduct = {
        ...product,
        quantity_free_card: Math.max(0, (product.quantity_free_card || 0) - 1),
      };
      const updatedProductList = [...productList];
      updatedProductList[prodIdx] = updatedProduct;

      // 2. Добавляем товар игроку (products или goods)
      let playerProducts = Array.isArray(player.products) ? [...player.products] : [];

      const playerProdIdx = playerProducts.findIndex(p => p.productId === product.productId);

      if (playerProdIdx !== -1) {
        // Уже есть — увеличиваем количество
        playerProducts[playerProdIdx] = {
          ...playerProducts[playerProdIdx],
          quantity_player_card: (playerProducts[playerProdIdx].quantity_player_card || 1) + 1,
        };
      } else {
        // Новая карточка у игрока
        playerProducts.push({
          ...product,
          quantity_player_card: 1,
        });
      }

      // 3. Уменьшаем деньги игрока
      const newCoins = Math.max(0, (player.coins || 0) - (product.wholesalePrice || 0));

      // 4. Собираем нового игрока и стейт
      const updatedPlayer = {
        ...player,
        products: playerProducts,
        coins: newCoins,
      };

      const updatedPlayers = [...prev.players];
      updatedPlayers[playerIdx] = updatedPlayer;

      // 5. Обновляем products в gamestate
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
  }

  return (
    <div className="container mt-4 mb-4">
      <h2>Wholesale Marketplace</h2>
      <div className="row">
        <div className="col-9">
          {!isAuthorized && (
            <div className="alert alert-warning mb-3">
              Вы не подключены к игре. Ниже — полный список товаров. Для участия войдите в игру.
            </div>
          )}
          <div className="row">
            <h2>All cards in the game</h2>
          </div>
          {Object.keys(groupedBySector).map(sector => (
            <div key={sector} className={`row ${sector}`}>
              <h3>{sector.charAt(0).toUpperCase() + sector.slice(1)}</h3>
              {groupedBySector[sector].map((product, index) => (
                <div
                  key={index}
                  className="col"
                  style={{
                    minWidth: 240,
                    cursor: isAuthorized && myTurn ? 'pointer' : 'not-allowed',
                    opacity: isAuthorized && myTurn ? 1 : 0.5,
                  }}
                  onClick={() => {
                    if (isAuthorized) handleSelectProduct(product);
                  }}
                >
                  <div className={` border p-3 mb-3 `}>
                    <Product
                      sector={sector}
                      productName={getField(product, 'productName', lang)}
                      imageSrc={`/img/${product.imageSrc}`}
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
          ))}

          {/* Модалка подтверждения */}
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
                  gameState &&
                  (() => {
                    // Находим игрока и цену
                    const player = gameState.players.find(p => p.user_id === myUserId) || {};
                    const price = selectedProduct.wholesalePrice || 0;
                    const coins = player.coins || 0;
                    const enoughCoins = coins >= price;
                    if (!enoughCoins) {
                      return (
                        <div className="text-danger">
                          Недостаточно монет для покупки! Не хватает {price - coins} монет.
                        </div>
                      );
                    }
                    // Можно также проверить остаток товара, если надо
                    return (
                      <>
                        <div>Вы уверены, что хотите выбрать этот товар?</div>
                        <div>
                          Цена: <b>{price} монет</b> <br />
                          Ваши монеты: {coins}
                        </div>
                        <div>
                          <b>Сектор:</b> {selectedProduct.sector || selectedProduct.product_sector}
                        </div>
                        {/* Можно еще добавить описание или другие детали */}
                      </>
                    );
                  })()
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
                  !isAuthorized ||
                  !selectedProduct ||
                  !myTurn ||
                  (gameState &&
                    (() => {
                      const player = gameState.players.find(p => p.user_id === myUserId) || {};
                      return (player.coins || 0) < (selectedProduct?.wholesalePrice || 0);
                    })())
                }
              >
                Подтвердить выбор
              </Button>
            </Modal.Footer>
          </Modal>
        </div>
        <div className="col-3">
          <Menu
            gameState={gameState}
            myUserId={myUserId}
            connection={connection}
            setGameState={isHost ? setGameState : undefined}
            broadcastGameState={isHost ? broadcastGameState : undefined}
            connectionsRef
          />
        </div>
      </div>
    </div>
  );
};

export default Wholesale;
