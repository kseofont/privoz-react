import React from 'react';

const ProductMini = ({
  sector,
  productName,
  imageSrc,
  wholesalePrice,
  retailPrice,

  quantity_card,
  quantity_free_card,
}) => {
  const possibleIncome =
    typeof wholesalePrice === 'number' && typeof retailPrice === 'number'
      ? retailPrice - wholesalePrice
      : undefined;
  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between">
        <p className="card-text card-link mb-0">{sector}</p>
        {imageSrc && (
          <img
            src={`/img/${imageSrc}`}
            className="card-img-small "
            alt={productName}
            // style={{ maxWidth: '64px', height: 'auto' }}
            onError={e => {
              e.target.onerror = null;
              e.target.src = '/img/default_product.webp';
            }}
          />
        )}
        <h5 className="card-title card-link mb-0">{productName}</h5>
      </div>

      <div className="card-body">
        {wholesalePrice !== undefined && (
          <p>
            Wholesale price: {wholesalePrice}{' '}
            <i className="bi bi-coin" style={{ marginLeft: '3px', color: '#ffc107' }}></i>
          </p>
        )}
        {retailPrice !== undefined && (
          <p>
            Retail price: {retailPrice}{' '}
            <i className="bi bi-coin" style={{ marginLeft: '3px', color: '#ffc107' }}></i>
          </p>
        )}
        {possibleIncome !== undefined && (
          <p>
            Possible income: +{possibleIncome}{' '}
            <i className="bi bi-coin" style={{ marginLeft: '3px', color: '#ffc107' }}></i>
          </p>
        )}
      </div>
    </div>
  );
};

export default ProductMini;
