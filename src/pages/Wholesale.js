import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';
import Product from '../components/Product';
import Menu from '../components/Menu';
import localProductsData from '../data/products.json';
import { Modal, Button } from 'react-bootstrap';

const Wholesale = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const location = useLocation();
  const params = useParams();

  const initialGameState = location.state?.gameState || window.gameState || null;
  const [gameState, setGameState] = useState(initialGameState);
  const myUserId = location.state?.myUserId || window.myUserId || params.peerId || null;

  const isAuthorized = !!myUserId && !!gameState && Array.isArray(gameState.players);

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
    if (!isAuthorized) return; // Защита на всякий случай
    setSelectedProduct(product);
    setShowModal(true);
  }

  function handleConfirmProduct() {
    // тут — твоя логика добавления товара игроку
    // setGameState(...);
    setShowModal(false);
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
                    cursor: isAuthorized ? 'pointer' : 'not-allowed',
                    opacity: isAuthorized ? 1 : 0.5,
                  }}
                  onClick={() => {
                    if (isAuthorized) handleSelectProduct(product);
                  }}
                >
                  <div className={`sector border p-3 mb-3 ${sector}`}>
                    <Product
                      sector={sector}
                      productName={
                        typeof product.productName === 'object'
                          ? product.productName[lang] || product.productName.en
                          : product.productName
                      }
                      imageSrc={`/img/${product.imageSrc}`}
                      wholesalePrice={product.wholesalePrice}
                      retailPrice={product.sellingPrice}
                      possibleIncome={product.profit}
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
                {selectedProduct
                  ? typeof selectedProduct.productName === 'object'
                    ? selectedProduct.productName[lang] || selectedProduct.productName.en
                    : selectedProduct.productName
                  : ''}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>Вы действительно хотите выбрать этот товар?</Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Отмена
              </Button>
              <Button variant="primary" onClick={handleConfirmProduct}>
                Подтвердить выбор
              </Button>
            </Modal.Footer>
          </Modal>
        </div>
        <div className="col-3">
          <Menu gameState={gameState} myUserId={myUserId} />
        </div>
      </div>
    </div>
  );
};

export default Wholesale;
