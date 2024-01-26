import React from 'react';
import Product from '../components/Product';
import Menu from '../components/Menu';
import apple from '../img/apple.svg';

const Wholesale = () => {
    return (
        <div className="container mt-4 mb-4">
            <h2>Wholesale Marketplace</h2>
            <div className="row">
                <div className="col-9">

                    <div className="row">
                        {[...Array(6)].map((_, index) => (
                            <div key={index} className="col border p-0 text-center p-1 product">
                                <Product
                                    sector="Fruits"
                                    productName="Apple"
                                    imageSrc={apple}
                                    wholesalePrice="$2.00"
                                    retailPrice="$3.50"
                                    possibleIncome="$100.00"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="row">
                        {[...Array(6)].map((_, index) => (
                            <div key={index} className="col border p-0 text-center p-1 product"></div>
                        ))}
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
