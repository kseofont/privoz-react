import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PrivozSector from '../components/PrivozSector';
import Menu from '../components/Menu';

const GamePage = () => {
    const location = useLocation();
    // Извлекаем данные, переданные через navigate (currentUserData и otherUsers)
    const { currentUserData: initialCurrentUserData, otherUsers: initialOtherUsers } = location.state || {};

    // Используем данные, переданные из предыдущих страниц (если они есть), или пустые значения
    const [currentUserData, setCurrentUserData] = useState(initialCurrentUserData || null);
    const [otherUsers, setOtherUsers] = useState(initialOtherUsers || []);

    // Пример данных о секторах для отображения на странице
    const sectors = ['Fruits', 'Vegetables', 'Dairy', 'Fish', 'Meat', 'Household goods'];

    // Инициализация состояния для торговцев
    const [traders, setTraders] = useState([]);

    useEffect(() => {
        // Предполагается, что у каждого пользователя есть свои торговцы, устанавливаем начальное состояние из currentUserData
        if (currentUserData && currentUserData.traders) {
            setTraders(currentUserData.traders);
        }
    }, [currentUserData]);

    return (
        <div className="container">
            <div className="row">
                <h2>Privoz Bazar Game Session</h2>

                {/* Отображение данных текущего игрока */}
                {currentUserData && (
                    <div className="user-info mt-3">
                        <h4>Current User Data:</h4>
                        <p><strong>Name:</strong> {currentUserData.name}</p>
                        <p><strong>Color:</strong> <span style={{ color: currentUserData.color }}>{currentUserData.color}</span></p>
                        <p><strong>Coins:</strong> {currentUserData.coins}</p>
                        <p><strong>Traders Count:</strong> {currentUserData.tradersCount}</p>
                        <p><strong>Event Cards Count:</strong> {currentUserData.eventCards.length}</p>
                    </div>
                )}

                {/* Отображение данных о других игроках */}
                {otherUsers && otherUsers.length > 0 && (
                    <div className="other-users-info mt-3">
                        <h4>Other Users in Game:</h4>
                        <ul className="list-unstyled">
                            {otherUsers.map((user, index) => (
                                <li key={index}>
                                    <p><strong>Name:</strong> {user.name}</p>
                                    <p><strong>Color:</strong> <span style={{ color: user.color }}>{user.color}</span></p>
                                    <p><strong>Coins:</strong> {user.coins}</p>
                                    <p><strong>Traders Count:</strong> {user.traders.length}</p>
                                    <hr />
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="col-9 mt-5">
                    {sectors.map((sector, index) => (
                        <div className="row" key={index}>
                            <h3>{sector}</h3>
                            <PrivozSector
                                key={index}
                                category={sector}
                                maxTraders={otherUsers.length + 1} // Максимальное количество торговцев - это все пользователи (включая текущего)
                                traders={traders}
                                setTraders={setTraders}
                                currentUserData={currentUserData}
                                setCurrentUserData={setCurrentUserData}
                                otherUsers={otherUsers}
                            />
                        </div>
                    ))}
                </div>
                <div className="col-3">
                    {/* Передаем currentUserData и otherUsers в Menu */}
                    <Menu
                        currentUserData={currentUserData}
                        otherUsers={otherUsers}
                    />
                </div>
            </div>
        </div>
    );
};

export default GamePage;
