import React from 'react';
import Product from '../components/Product';
import Menu from '../components/Menu';
import products from '../products.json';

const Wholesale = () => {
    return (
        <div className="container mt-4 mb-4">
            <h2>Wholesale Marketplace</h2>
            <div className="row">
                <div className="col-9">
                    <div className="row">
                        <h2>All cards in the game</h2>
                    </div>
                    <div className="row">
                        {products.sectors.map((sector, index) => (
                            <div key={index} className={`row ${sector.sector}`}>
                                <h3>{sector.sector.charAt(0).toUpperCase() + sector.sector.slice(1)}</h3>
                                {sector.products.map((product, productIndex) => (
                                    <div key={productIndex} className="col">
                                        <div className={`sector border p-3 mb-3 ${sector.sector}`}>
                                            <Product
                                                key={productIndex}
                                                sector={sector.sector}
                                                productName={product.productName}
                                                imageSrc={`../img/${product.imageSrc}`}
                                                wholesalePrice={product.wholesalePrice}
                                                retailPrice={product.sellingPrice}
                                                possibleIncome={product.profit}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    <div className="row">
                        <h2>here is a real Wholesale Marketplace </h2>
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
