import React, { useState, useEffect } from 'react';
import PrivozSector from '../components/PrivozSector';
import Menu from '../components/Menu';
import usersData from '../users.json';

const PrivozPage = () => {
    // Extract unique locations from users' data
    const locations = [...new Set(usersData.flatMap(user => user.traders.map(trader => trader.location)))];

    // Use provided sectors list
    const sectors = ['Fruits', 'Vegetables', 'Milk', 'Fish', 'Meat', 'Stuff'];

    // Ensure that all sectors are included, even if they don't have traders
    const allLocations = [...new Set([...locations, ...sectors])];

    const users = usersData.map(user => ({
        ...user,
        traders: user.traders.map(trader => ({
            ...trader,
            goods: trader.goods.map(good => ({
                ...good,
                imageSrc: `../img/${good.imageSrc}` // Assuming images are in the "img" folder
            }))
        }))
    }));
    //  const [traders, setTraders] = useState([]);

    const [traders, setTraders] = useState([]);
    useEffect(() => {
        console.log('Updated traders state:', traders);
    }, [traders]);

    return (
        <div className="container">
            <div className="row">
                <h2>Privoz Bazar</h2>
                <div className="col-9">
                    {allLocations.map((location, index) => (
                        <div className="row" key={index}>
                            <h3>{location}</h3>
                            <PrivozSector
                                key={index}
                                category={location}
                                users={users}
                                traders={traders}  // Pass traders and setTraders props
                                setTraders={setTraders}
                            />
                        </div>
                    ))}
                </div>
                <div className="col-3">
                    <Menu users={users} locations={locations} />
                </div>
            </div>
        </div>
    );
};

export default PrivozPage;
