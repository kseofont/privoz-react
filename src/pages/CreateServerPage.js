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
    const [players, setPlayers] = useState([]);
    const [gameStarted, setGameStarted] = useState(false);

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
                        // Добавление создателя игры в список игроков
                        setPlayers([{ name: userName, color: selectedColor, isHost: true, playerCount: numberOfPlayers }]);
                    });

                    newPeer.on('connection', (conn) => {
                        addLog('New player connected: ' + conn.peer);
                        conn.on('data', (data) => {
                            addLog('Received data from ' + conn.peer + ': ' + JSON.stringify(data));
                            if (data.type === 'join') {
                                setPlayers((prevPlayers) => [...prevPlayers, { name: data.playerName, color: data.color }]);
                            }
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
        if (!userName || !selectedColor) {
            alert('Please fill in your name and select a color.');
            return;
        }

        if (numberOfPlayers < 2 || numberOfPlayers > 6) {
            alert('Please enter a number of players between 2 and 6.');
            return;
        }

        setServerStarted(true);
        addLog('Server started for signaling...');
    };

    const handleStopAddingPlayers = () => {
        setGameStarted(true);
        addLog('Game started with players: ' + players.map(player => player.name).join(', '));
        players.forEach(player => {
            if (!player.isHost) {
                const conn = peer.connect(player.peerId);
                conn.on('open', () => {
                    conn.send({ type: 'start', message: 'The game has started!' });
                });
            }
        });
        navigate(`/game/${peerId}`); // Редирект на страницу игры с уникальным идентификатором
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

                    <button className="btn btn-primary" onClick={handleStartGame} disabled={serverStarted}>Start Game</button>
                    {serverStarted && (
                        <button className="btn btn-danger ms-3" onClick={handleStopAddingPlayers} disabled={gameStarted}>Stop Adding Players and Start Game</button>
                    )}

                    {serverStarted && peerId && (
                        <div className="mt-3">
                            <p>Server started! Share this Peer ID with other players to join the game:</p>
                            <input type="text" readOnly className="form-control" value={peerId} />
                        </div>
                    )}

                    {players.length > 0 && (
                        <div className="mt-3">
                            <h5>Connected Players:</h5>
                            <ul className="list-group">
                                {players.map((player, index) => (
                                    <li key={index} className="list-group-item">
                                        {player.isHost ? `${player.name} (Host - Game for ${player.playerCount} players)` : player.name} - <span style={{ color: player.color }}>{player.color}</span>
                                    </li>
                                ))}
                            </ul>
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
