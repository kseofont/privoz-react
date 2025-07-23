import React from 'react';

const Product = ({
  sector,
  productName,
  imageSrc,
  wholesalePrice,
  retailPrice,

  quantity_card,
  quantity_free_card,
}) => {
  console.log('imageSrc', imageSrc);
  const possibleIncome =
    typeof wholesalePrice === 'number' && typeof retailPrice === 'number'
      ? retailPrice - wholesalePrice
      : undefined;
  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between">
        <p className="card-text card-link mb-0">{sector}</p>
        <h5 className="card-title card-link mb-0">{productName}</h5>
      </div>

      <div className="cards-quant card-header d-flex justify-content-between">
        <p className="card-text card-link mb-0">{quantity_card} cards total</p>
        <p className="card-text card-link mb-0">Free {quantity_free_card} cards</p>
      </div>

      {imageSrc && (
        <img
          src={`/img/${imageSrc}`}
          className="card-img-top"
          alt={productName}
          onError={e => {
            e.target.onerror = null;
            e.target.src = '/img/default_product.webp';
          }}
        />
      )}

      <div className="card-body">
        {wholesalePrice !== undefined && <p>Wholesale price: {wholesalePrice}</p>}
        {retailPrice !== undefined && <p>Retail price: {retailPrice}</p>}
        {possibleIncome !== undefined && <p>Possible income: {possibleIncome}</p>}
      </div>
    </div>
  );
};

export default Product;
