import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';
import Product from '../components/Product';
import Menu from '../components/Menu';
import localProductsData from '../data/products.json';

const Wholesale = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const location = useLocation();

  const initialGameState = location.state?.gameState || window.gameState || null;
  const [gameState, setGameState] = useState(initialGameState);

  const defaultProducts = Array.isArray(localProductsData.products)
    ? localProductsData.products
    : Array.isArray(localProductsData)
    ? localProductsData
    : [];

  const [allProducts, setAllProducts] = useState(defaultProducts);

  useEffect(() => {
    // Если gameState.products — массив, то ставим его, иначе — дефолт
    if (gameState && Array.isArray(gameState.products)) {
      setAllProducts(gameState.products);
    } else if (gameState && gameState.products && Array.isArray(gameState.products.products)) {
      setAllProducts(gameState.products.products);
    } else {
      setAllProducts(defaultProducts);
    }
  }, [gameState]);

  // Если вдруг попал не массив — делаем защиту
  const safeProducts = Array.isArray(allProducts) ? allProducts : [];

  const groupedBySector = safeProducts.reduce((acc, product) => {
    const sector = product.sector || product.product_sector || 'unknown';
    if (!acc[sector]) acc[sector] = [];
    acc[sector].push(product);
    return acc;
  }, {});

  return (
    <div className="container mt-4 mb-4">
      <h2>Wholesale Marketplace</h2>
      <div className="row">
        <div className="col-9">
          <div className="row">
            <h2>All cards in the game</h2>
          </div>
          {Object.keys(groupedBySector).map(sector => (
            <div key={sector} className={`row ${sector}`}>
              <h3>{sector.charAt(0).toUpperCase() + sector.slice(1)}</h3>
              {groupedBySector[sector].map((product, index) => (
                <div key={index} className="col" style={{ minWidth: 240 }}>
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
          <div className="row">
            <h2>Here is a real Wholesale Marketplace</h2>
          </div>
        </div>
        <div className="col-3">
          <Menu />
        </div>
      </div>
    </div>
  );
};

export default Wholesale;
