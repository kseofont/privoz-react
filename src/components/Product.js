import React from 'react';

const Product = ({
  sector,
  productName,
  imageSrc,
  wholesalePrice,
  retailPrice,
  possibleIncome,
  quantity_card,
  quantity_free_card,
}) => {
  return (
    <div className="card">
      <div className="card-header d-flex">
        <p className="card-text card-link">{sector}</p>
        <h5 className="card-title card-link">{productName}</h5>
      </div>
      <div className="cards-quant card-header d-flex">
        <p className="card-text card-link ">{quantity_card} cards total</p>
        <p className="card-text card-link">Free {quantity_free_card} cards</p>
      </div>
      <img src={imageSrc} className="card-img-top" alt={productName} />

      <div className="card-body">
        <p>Wholesale price: {wholesalePrice}</p>
        <p>Retail price: {retailPrice}</p>
        <p>Possible income: {possibleIncome}</p>
      </div>
    </div>
  );
};

export default Product;
