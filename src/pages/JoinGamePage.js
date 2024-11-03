import React, { useState, useEffect } from 'react';
import Peer from 'peerjs';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Menu from '../components/Menu';

const JoinGamePage = () => {
    const [userName, setUserName] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [hostPeerId, setHostPeerId] = useState('');
    const [connected, setConnected] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [peer, setPeer] = useState(null);
    const [connection, setConnection] = useState(null);
    const [players, setPlayers] = useState([]);
    const [gameStatus, setGameStatus] = useState('Waiting for players');
    const [logs, setLogs] = useState([]);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [otherUsers, setOtherUsers] = useState([]);

    const navigate = useNavigate();

    const addLog = (message) => {
        setLogs((prevLogs) => [...prevLogs, message]);
    };

    useEffect(() => {
        if (connected && connection) {
            connection.on('data', (data) => {
                addLog('Received data: ' + JSON.stringify(data));
                if (data.type === 'join') {
                    setPlayers((prevPlayers) => [...prevPlayers, { name: data.playerName, color: data.color }]);
                    addLog(`${data.playerName} joined the game with color ${data.color}`);
                } else if (data.type === 'start') {
                    setGameStatus('Game Started');
                    navigate(`/game/${hostPeerId}`); // Перенаправление на игровую сессию с уникальным идентификатором
                } else if (data.type === 'initialPlayers') {
                    setPlayers(data.players);
                    const currentUser = data.players.find(player => player.name === userName && player.color === selectedColor);
                    setCurrentUserData(currentUser);
                } else if (data.type === 'colorTaken') {
                    setErrorMessage('This color is already taken. Please choose a different color.');
                }
            });
        }
    }, [connected, connection, navigate]);

    useEffect(() => {
        if (selectedColor && players.some(player => player.color === selectedColor)) {
            setErrorMessage('This color is already taken. Please choose a different color.');
            setSelectedColor('');
        } else {
            setErrorMessage('');
        }
    }, [selectedColor, players]);

    const handleJoinGame = () => {
        if (!hostPeerId || !userName || !selectedColor) {
            alert('Please fill in all the fields to join the game.');
            return;
        }

        // Логика подключения к хосту через PeerJS
        const newPeer = new Peer();
        setPeer(newPeer);

        newPeer.on('open', () => {
            const conn = newPeer.connect(hostPeerId);
            setConnection(conn);

            conn.on('open', () => {
                console.log('Connected to host:', hostPeerId);
                setConnected(true);
                setErrorMessage('');
                addLog(`Connected to host with ID: ${hostPeerId}`);

                // Отправляем имя игрока и цвет на хост
                conn.send({
                    type: 'join',
                    playerName: userName,
                    color: selectedColor
                });

                // Устанавливаем currentUserData для меню
                setCurrentUserData({
                    user_id: newPeer.id,
                    name: userName,
                    color: selectedColor
                });
            });

            conn.on('data', (data) => {
                addLog('Received from host: ' + JSON.stringify(data));
                if (data.type === 'initialPlayers') {
                    setPlayers(data.players);
                    const otherConnectedUsers = data.players.filter(player => player.name !== userName);
                    setOtherUsers(otherConnectedUsers);
                }
                if (data.type === 'start') {
                    navigate(`/game/${hostPeerId}`);
                }
                if (data.type === 'colorTaken') {
                    setErrorMessage('This color is already taken. Please choose a different color.');
                }
            });

            conn.on('error', (error) => {
                console.error('Connection error:', error);
                setErrorMessage(`Connection error: ${error.message || 'An error occurred while connecting to the host.'}`);
                addLog('Connection error: ' + error.message);
            });

            conn.on('close', () => {
                console.log('Disconnected from host.');
                setConnected(false);
                setErrorMessage('Disconnected unexpectedly from the host. Please try reconnecting.');
                addLog('Disconnected from host.');
            });
        });

        newPeer.on('error', (error) => {
            console.error('Peer error:', error);
            setErrorMessage(`Peer error: ${error.message || 'An error occurred while initializing the peer connection.'}`);
            addLog('Peer error: ' + error.message);
        });
    };

    return (
        <div className="container mt-5">
            <div className="row">
                <div className="col-9">
                    <h1>Join an Existing Game</h1>
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
                            {['red', 'green', 'blue', 'orange', 'purple', 'brown'].filter(color => !players.some(player => player.color === color)).map(color => (
                                <option key={color} value={color}>{color}</option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-3">
                        <label htmlFor="hostPeerId" className="form-label">Host Peer ID:</label>
                        <input
                            type="text"
                            className="form-control"
                            id="hostPeerId"
                            value={hostPeerId}
                            onChange={(e) => setHostPeerId(e.target.value)}
                            required
                        />
                    </div>

                    <button className="btn btn-success" onClick={handleJoinGame}>Join Game</button>

                    {connected && (
                        <div className="mt-3">
                            <p>Successfully connected to the game! Please wait for the game to start...</p>
                            <p><strong>Connected to Host Peer ID:</strong> {hostPeerId}</p>
                            <p><strong>Game Status:</strong> {gameStatus}</p>
                            <h5>Connected Players:</h5>
                            <ul className="list-group">
                                {console.log(players, 'players')}
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

                    {errorMessage && (
                        <div className="mt-3 alert alert-danger">
                            <p>{errorMessage}</p>
                        </div>
                    )}
                </div>
                <div className="col-3">
                    <Menu currentUserData={currentUserData} otherUsers={otherUsers} />
                </div>
            </div>
        </div>
    );
};

export default JoinGamePage;
