import React, { Component } from 'react';
import Product from './Product';

class Trader extends Component {
    render() {
        const { user, trader } = this.props;

        if (!user || !user.name || !user.color || !trader) {
            return (
                <div className="col border text-center pb-4">
                    <p>Error: Invalid user or trader data</p>
                </div>
            );
        }

        const { name, color } = user;

        return (
            <div className={`col border text-center pb-4 ${color}`}>
                <div className='userdata'>{trader.traderName}</div>
                <i className={`bi bi-shop-window ${name.toLowerCase()}`}></i>
                <p>{name}</p>
                <div className="container-fluid">
                    <div className="">
                        {trader.goods.map((good, goodIndex) => (
                            <div key={goodIndex} className="row gap-1">
                                <div key={goodIndex} className="col border p-0 text-center p-1 product">
                                    <Product
                                        sector={good.sector}
                                        productName={good.productName}
                                        imageSrc={good.imageSrc}
                                        wholesalePrice={good.wholesalePrice}
                                        retailPrice={good.retailPrice}
                                        possibleIncome={good.possibleIncome}
                                        quantity_card={good.quantity_card}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
}

export default Trader;
