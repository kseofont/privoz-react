import React, { useState, useEffect } from 'react';
import PrivozSector from '../components/PrivozSector';
import Menu from '../components/Menu';

import usersData from '../users.json';

const GamePage = () => {
    // Process usersData to create defaultTradersData
    const defaultTradersData = usersData.map(user => ({
        ...user,
        traders: user.traders.map(trader => ({
            ...trader,
            goods: trader.goods.map(good => ({
                ...good,
                imageSrc: `../img/${good.imageSrc}`
            }))
        }))
    }));
    const maxTraders = usersData.length;

    // Extract unique locations from defaultTradersData
    const locations = [...new Set(defaultTradersData.flatMap(user => user.traders.map(trader => trader.location)))];

    // Use provided sectors list
    const sectors = ['Fruits', 'Vegetables', 'Dairy', 'Fish', 'Meat', 'Household goods'];

    // Ensure that all sectors are included, even if they don't have traders
    const allLocations = [...new Set([...locations, ...sectors])];

    // Initialize traders state with defaultTradersData
    const [traders, setTraders] = useState([]);

    useEffect(() => {
        // Set the traders state based on processed defaultTradersData
        setTraders(prevTraders => {
            // Ensure that the update is only performed if the state is empty
            return prevTraders.length === 0 ? defaultTradersData : prevTraders;
        });
    }, [defaultTradersData]);

    // Pass data to Menu with current user and other users
    const [currentUserData, setCurrentUserData] = useState(null);
    const [otherUsers, setOtherUsers] = useState([]);

    useEffect(() => {
        // Find the current user in the usersData
        const currentUser = usersData.find(user => user.current_user === 'current');

        if (currentUser) {
            // Extract required information for the current user
            const { user_id, name, className, color, coins, traders, eventCards } = currentUser;
            const sectorsWithTraders = traders.map(trader => trader.location);

            // Create an object with the extracted data
            const currentUserInfo = {
                user_id,
                name,
                className,
                color,
                traders,
                coins: coins,
                tradersCount: traders.length,
                sectorsWithTraders,
                position_in_game: "hand",
                eventCards,
            };

            // Set the state with the current user information
            setCurrentUserData(currentUserInfo);

            // Filter other users from usersData
            const otherUsersInfo = usersData.filter(user => user.current_user !== 'current');

            // Set the state with other users information
            setOtherUsers(otherUsersInfo);
        }
    }, []);

    return (
        <div className="container">
            <div className="row">
                <h2>Privoz Bazar Game session</h2>
                <div className="col-9">
                    {allLocations.map((location, index) => (
                        <div className="row" key={index}>
                            <h3>{location}</h3>
                            <PrivozSector
                                key={index}
                                category={location}
                                maxTraders={maxTraders}
                                traders={traders}  // Pass traders and setTraders props
                                setTraders={setTraders}
                                currentUserData={currentUserData}
                                setCurrentUserData={setCurrentUserData}
                                otherUsers={otherUsers}  // Pass otherUsers prop
                            />
                        </div>
                    ))}
                </div>
                <div className="col-3">
                    <Menu
                        currentUserData={currentUserData}
                        otherUsers={otherUsers}  // Pass otherUsers prop
                    />
                </div>
            </div>
        </div>
    );
};

export default GamePage;
