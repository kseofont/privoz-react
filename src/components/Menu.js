import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// ... (your existing imports)

const Menu = ({ category, users = [], currentUserData }) => {
    const traders = users.map((user, index) => (
        // Assuming you want to render some content for each user
        // You can customize this based on your requirements
        <div key={index}>{/* Add your content for each user */}</div>
    ));


    const sectorClassName = `border p-3 mb-3 ${category}`;
    const user_color = currentUserData.color;

    return (
        <div className="col">
            <h3>Menu</h3>

            {/* Navigation links */}
            <nav className='d-flex justify-content-between flex-column mb-3'>
                <Link to="/">Privoz</Link>
                <Link to="/wholesale">Wholesale Marketplace</Link>
                <Link to="/eventcards">Event Cards</Link>
            </nav>

            {/* Display information for the current user */}

            {currentUserData && (
                <div className='user-info'>
                    <p>Name: {currentUserData.name}</p>
                    <p className={user_color}>Color: {currentUserData.color}</p>
                    <p>Coins: {currentUserData.coins}</p>
                    <p>Traders Count: {currentUserData.tradersCount}</p>
                    <p>Sectors with Traders: {currentUserData.sectorsWithTraders.join(', ')}</p>
                    <p>event: {currentUserData.sectorsWithTraders.join(', ')}</p>
                </div>
            )}
        </div>
    );
};

export default Menu;
