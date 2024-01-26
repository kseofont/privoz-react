import React from 'react';


const Product = ({ sector, productName, imageSrc, wholesalePrice, retailPrice, possibleIncome }) => {
    return (

        <div className="card">
            <div className="card-header d-flex">
                <p className="card-text sector card-link">
                    {sector}
                </p>
                <h5 className="card-title card-link">{productName}</h5>
                <p className="card-text card-link">16 cards</p>
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
