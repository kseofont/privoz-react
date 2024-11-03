import React from 'react';
import { Link } from 'react-router-dom';

const Menu = ({ currentUserData = null, otherUsers = [] }) => {
    let user_color;
    const userBackgroundColorClass = currentUserData ? `bg-${currentUserData.color}` : '';

    if (currentUserData && currentUserData.color) {
        user_color = currentUserData.color;
    } else {
        user_color = 'red';
    }

    // Extract unique sectors from traders
    const uniqueSectors = [...new Set(currentUserData?.traders?.map(trader => trader.location) || [])];

    return (
        <div className="col">
            <h3>Menu</h3>

            {/* Navigation links */}
            <nav className='d-flex justify-content-between flex-column mb-3'>
             
               
                <Link to="/">StartPage</Link>
                <Link to="/privoz">Privoz</Link>
               
                <Link to="/wholesale">Wholesale Marketplace</Link>
                <Link to="/eventcards">Event Cards</Link>
                <Link to="/rules">Game Rules</Link>
                <Link to="/create">Create Game</Link>
                <Link to="/JoinGamePage">Join Game</Link>
            </nav>

            {/* Display information for the current user */}
            {currentUserData && (
                <div className={`user-info ${userBackgroundColorClass}`} >
                    <p>Id: {currentUserData.user_id}</p>
                    <p>Name: {currentUserData.name}</p>
                    <p className={user_color}>Color: {currentUserData.color}</p>
                    <p>Coins: {currentUserData.coins}</p>
                    <p>Traders Count: {currentUserData.tradersCount}</p>
                    {currentUserData.traders && currentUserData.traders.length > 0 && (
                        <div>
                            <p>Products from Your Traders:</p>
                            <ul className="list-unstyled">
                                {currentUserData.traders.map((trader, traderIndex) => (
                                    <li key={traderIndex}>
                                        <p>Trader: {trader.traderName}</p>
                                        <p>Trader sector: {trader.location}</p>
                                        {trader.goods && trader.goods.length > 0 && (
                                            <ul className="list-unstyled">
                                                {trader.goods.map((product, productIndex) => (
                                                    <li key={productIndex}>
                                                        <p>Product: {product.productName}</p>
                                                        {/* Include other product details as needed */}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <p>Sectors with Traders: </p>
                    <ul>
                        {uniqueSectors.map((sector, index) => (
                            <li key={index}>{sector}</li>
                        ))}
                    </ul>

                    <p>Event Cards Count: {currentUserData.eventCards ? currentUserData.eventCards.length : 0}</p>
                    <p>Event Cards:</p>

                    {currentUserData && currentUserData.eventCards && currentUserData.eventCards.length > 0 ? (
                        <ul className="list-unstyled" >
                            {currentUserData.eventCards.map((card, index) => (
                                <li key={index} className={`event-card ${card.fortune === 'negative' ? 'bg-danger' : 'bg-success'}`}>
                                    <p>Title: {card.title}</p>
                                    <p>Description: {card.description}</p>
                                    <p>Fortune: {card.fortune}</p>
                                    <p>Quantity In Game: {card.quantity_ingame}</p>
                                    <p>Quantity Active: {card.quantity_active}</p>
                                    <p>Position In Game: {card.position_in_game}</p>
                                    <p>Goal Action: {card.goal_action}</p>
                                    <p>Goal Item: {card.goal_item}</p>
                                    {card.effect && card.effect.length > 0 && (
                                        <div>
                                            <p>Effect:</p>
                                            <ul className="list-unstyled">
                                                {card.effect.map((effect, effectIndex) => (
                                                    <li key={effectIndex}>
                                                        {Object.keys(effect).map((key, subIndex) => (
                                                            <p key={subIndex}>{key}: {JSON.stringify(effect[key])}</p>
                                                        ))}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No Event Cards.</p>
                    )}

                    {/* Additional details from currentUserData */}
                    {/* Include any additional details you want to display */}

                    {/* Display information about other users, their traders, and products */}

                </div>
            )}
            <div className='other-users'>
                {/* Display information about other users, their traders, and products */}
                {otherUsers && otherUsers.length > 0 && (
                    <div className={`user-info`}>
                        <p>Other Users in Game:</p>
                        <ul className="list-unstyled">
                            {otherUsers.map((user, userIndex) => {
                                const userBackgroundColorClass = user.color ? `bg-${user.color}` : '';
                                return (
                                    <li key={userIndex} className={userBackgroundColorClass}>
                                        <p>User: {user.name}</p>
                                        {user.traders && user.traders.length > 0 && (
                                            <ul className="list-unstyled">
                                                {user.traders.map((trader, traderIndex) => {
                                                    const traderBackgroundColorClass = trader.location ? `bg-${trader.location.toLowerCase()}` : '';
                                                    return (
                                                        <li key={traderIndex} className={traderBackgroundColorClass}>
                                                            <p>Trader: {trader.traderName}</p>
                                                            {trader.goods && trader.goods.length > 0 && (
                                                                <ul className="list-unstyled">
                                                                    {trader.goods.map((product, productIndex) => (
                                                                        <li key={productIndex}>
                                                                            <p>Product: {product.productName}</p>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Menu;
