import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Peer from 'peerjs';
import 'bootstrap/dist/css/bootstrap.min.css';

// Страница создания сервера (создание сигналинг-хоста)
const CreateServerPage = () => {
    const [userName, setUserName] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [numberOfPlayers, setNumberOfPlayers] = useState(2);
    const [peerId, setPeerId] = useState('');
    const [peer, setPeer] = useState(null);
    const [connectedPlayers, setConnectedPlayers] = useState([]);

    useEffect(() => {
        if (!peer) {
            // Создаем нового Peer для хоста
            const newPeer = new Peer();

            newPeer.on('open', (id) => {
                console.log('Peer ID:', id);
                setPeerId(id);
            });

            newPeer.on('connection', (conn) => {
                console.log('New player connected:', conn.peer);
                setConnectedPlayers((prev) => [...prev, conn.peer]);

                conn.on('data', (data) => {
                    console.log('Received data:', data);
                    // Обрабатываем полученные данные (например, сообщения о ходе игры)
                });
            });

            setPeer(newPeer);
        }
    }, [peer]);

    const handleStartGame = () => {
        if (numberOfPlayers < 2 || numberOfPlayers > 6) {
            alert('Please enter a number of players between 2 and 6.');
            return;
        }

        console.log('Game started with Peer ID:', peerId);
    };

    return (
        <div className="container mt-5">
            <h1>Create a new Game as Host</h1>
            <div className="mb-3">
                <label htmlFor="userName" className="form-label">Enter your name:</label>
                <input
                    type="text"
                    className="form-control"
                    id="userName"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    required
                />
            </div>

            <div className="mb-3">
                <label htmlFor="colorSelect" className="form-label">Select your color:</label>
                <select
                    className="form-select"
                    id="colorSelect"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    required
                >
                    <option value="" disabled>Select color...</option>
                    <option value="red">Red</option>
                    <option value="green">Green</option>
                    <option value="blue">Blue</option>
                    <option value="orange">Orange</option>
                    <option value="purple">Purple</option>
                    <option value="brown">Brown</option>
                </select>
            </div>

            <div className="mb-3">
                <label htmlFor="numberOfPlayers" className="form-label">Number of players:</label>
                <input
                    type="number"
                    className="form-control"
                    id="numberOfPlayers"
                    value={numberOfPlayers}
                    onChange={(e) => setNumberOfPlayers(parseInt(e.target.value))}
                    required
                    min="2"
                    max="6"
                />
            </div>

            <button className="btn btn-primary" onClick={handleStartGame}>Start Game</button>

            {peerId && (
                <div className="mt-3">
                    <p>Server started! Share this Peer ID with other players to join the game:</p>
                    <input type="text" readOnly className="form-control" value={peerId} />
                </div>
            )}
        </div>
    );
};

export default CreateServerPage;