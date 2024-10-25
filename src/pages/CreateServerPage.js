import React, { useState, useEffect } from 'react';
import Peer from 'peerjs';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Menu from '../components/Menu';

const CreateServerPage = () => {
    const [userName, setUserName] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [numberOfPlayers, setNumberOfPlayers] = useState(2);
    const [serverStarted, setServerStarted] = useState(false);
    const [peerId, setPeerId] = useState('');
    const [peer, setPeer] = useState(null);
    const [logs, setLogs] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
        if (serverStarted) {
            // Логика запуска PeerJS-сервера
            const startServer = () => {
                try {
                    const newPeer = new Peer();
                    newPeer.on('open', (id) => {
                        setPeerId(id);
                        setPeer(newPeer);
                        addLog('PeerJS server started with ID: ' + id);
                    });

                    newPeer.on('connection', (conn) => {
                        addLog('New player connected: ' + conn.peer);

                        conn.on('data', (data) => {
                            addLog('Received data from ' + conn.peer + ': ' + JSON.stringify(data));
                            // Обработка данных от игрока
                        });
                    });
                } catch (error) {
                    addLog('Error starting PeerJS server: ' + error.message);
                    console.error('Error starting PeerJS server:', error);
                }
            };

            startServer();
        }
    }, [serverStarted]);

    const addLog = (message) => {
        setLogs((prevLogs) => [...prevLogs, message]);
    };

    const handleStartGame = () => {
        if (numberOfPlayers < 2 || numberOfPlayers > 6) {
            alert('Please enter a number of players between 2 and 6.');
            return;
        }

        setServerStarted(true);
        addLog('Server started for signaling...');
    };

    return (
        <div className="container mt-5">
            <div className="row">
                <div className="col-9">
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

                    {serverStarted && peerId && (
                        <div className="mt-3">
                            <p>Server started! Share this Peer ID with other players to join the game:</p>
                            <input type="text" readOnly className="form-control" value={peerId} />
                        </div>
                    )}

                    {logs.length > 0 && (
                        <div className="mt-3">
                            <h5>Logs:</h5>
                            <ul className="list-unstyled">
                                {logs.map((log, index) => (
                                    <li key={index}>{log}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="col-3">
                    <Menu />
                </div>
            </div>
        </div>
    );
};

export default CreateServerPage;
