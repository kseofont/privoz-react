import React, { useState, useEffect } from 'react';
import Peer from 'peerjs';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Menu from '../components/Menu';

const CreateServerPage = () => {
    const [userName, setUserName] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [numberOfPlayers, setNumberOfPlayers] = useState(3);
    const [serverStarted, setServerStarted] = useState(false);
    const [peerId, setPeerId] = useState('');
    const [peer, setPeer] = useState(null);
    const [connections, setConnections] = useState([]);
    const [logs, setLogs] = useState([]);
    const [players, setPlayers] = useState([]);
    const [gameStarted, setGameStarted] = useState(false);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [otherUsers, setOtherUsers] = useState([]);

    const navigate = useNavigate();

    const addLog = (message) => {
        setLogs((prevLogs) => [...prevLogs, message]);
        console.log(message); // Ensure all log messages are also printed to the console
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

        // Логика запуска PeerJS-сервера
        const startServer = () => {
            try {
                const newPeer = new Peer();
                newPeer.on('open', (id) => {
                    setPeerId(id);
                    setPeer(newPeer);
                    addLog('PeerJS server started with ID: ' + id);

                    const hostPlayer = {
                        user_id: id,
                        name: userName,
                        className: 'host',
                        color: selectedColor,
                        traders: [],
                        coins: 10,
                        tradersCount: 0,
                        sectorsWithTraders: [],
                        position_in_game: 'hand',
                        eventCards: [],
                        isHost: true,
                        playerCount: numberOfPlayers
                    };

                    setPlayers([hostPlayer]);
                    setCurrentUserData(hostPlayer);

                    // Отправка данных о хосте всем соединениям
                    const initialPlayersMessage = {
                        type: 'initialPlayers',
                        players: [hostPlayer],
                    };
                    addLog('Sending initial player data to all connections: ' + JSON.stringify(initialPlayersMessage));
                    connections.forEach((connection) => {
                        connection.send(initialPlayersMessage);
                    });
                });

                newPeer.on('connection', (conn) => {
                    addLog('New player connected: ' + conn.peer);

                    if (players.length >= numberOfPlayers) {
                        addLog('Player connection denied: maximum number of players reached.');
                        conn.send({ type: 'connectionDenied', message: 'Maximum number of players reached.' });
                        conn.close();
                        return;
                    }

                    setConnections((prevConnections) => [...prevConnections, conn]);

                    conn.on('data', (data) => {
                        addLog('Received data from ' + conn.peer + ': ' + JSON.stringify(data));

                        if (data.type === 'join') {
                            // Проверка на занятость цвета
                            if (players.some(player => player.color === data.color)) {
                                conn.send({ type: 'colorTaken' });
                            } else {
                                const newPlayer = {
                                    user_id: conn.peer,
                                    name: data.playerName,
                                    className: 'player',
                                    color: data.color,
                                    traders: [],
                                    coins: 10,
                                    tradersCount: 0,
                                    sectorsWithTraders: [],
                                    position_in_game: 'hand',
                                    eventCards: []
                                };

                                setPlayers((prevPlayers) => {
                                    const updatedPlayers = [...prevPlayers, newPlayer];
                                    const updatedOtherUsers = updatedPlayers.filter(player => !player.isHost);
                                    setOtherUsers(updatedOtherUsers); // Обновляем otherUsers для Menu

                                    // Уведомление всех игроков о новом списке игроков
                                    const updatedPlayersMessage = {
                                        type: 'initialPlayers',
                                        players: updatedPlayers,
                                    };
                                    addLog('Sending updated player list to all connections: ' + JSON.stringify(updatedPlayersMessage));
                                    connections.forEach((connection) => {
                                        connection.send(updatedPlayersMessage);
                                    });

                                    // Отправка данных новому игроку
                                    conn.send(updatedPlayersMessage);
                                    return updatedPlayers;
                                });

                                // Уведомление о новом подключении
                                const newPlayerJoinMessage = {
                                    type: 'join',
                                    playerName: data.playerName,
                                    color: data.color,
                                };
                                addLog('Notifying all players of new player joining: ' + JSON.stringify(newPlayerJoinMessage));
                                connections.forEach((connection) => {
                                    connection.send(newPlayerJoinMessage);
                                });
                            }
                        }
                    });

                    conn.on('close', () => {
                        addLog(`Player ${conn.peer} disconnected`);
                        setPlayers((prevPlayers) =>
                            prevPlayers.map(player =>
                                player.user_id === conn.peer ? { ...player, disconnected: true } : player
                            )
                        );

                        // Уведомление о временном отключении игрока
                        const playerDisconnectedMessage = {
                            type: 'playerDisconnected',
                            peerId: conn.peer,
                        };
                        addLog('Notifying all players that player disconnected: ' + JSON.stringify(playerDisconnectedMessage));
                        connections.forEach((connection) => {
                            connection.send(playerDisconnectedMessage);
                        });
                    });
                });
            } catch (error) {
                addLog('Error starting PeerJS server: ' + error.message);
                console.error('Error starting PeerJS server:', error);
            }
        };

        setServerStarted(true);
        addLog('Server started for signaling...');
        startServer();
    };

    const handleStopAddingPlayers = () => {
        setGameStarted(true);
        addLog('Game started with players: ' + players.map(player => player.name).join(', '));

        // Уведомление всех подключенных игроков о начале игры с данными игроков
        const gameData = players.map(player => ({
            user_id: player.user_id,
            name: player.name,
            className: player.className,
            color: player.color,
            traders: player.traders || [],
            coins: player.coins || 10,
            tradersCount: player.tradersCount || 0,
            sectorsWithTraders: player.sectorsWithTraders || [],
            position_in_game: player.position_in_game || 'hand',
            eventCards: player.eventCards || []
        }));

        const startGameMessage = {
            type: 'start',
            message: 'The game has started!',
            players: gameData
        };
        addLog('Notifying all players that the game has started: ' + JSON.stringify(startGameMessage));
        connections.forEach((conn) => {
            conn.send(startGameMessage);
        });

        // Перенаправление хоста на страницу игры с данными игроков
        navigate(`/game/${peerId}`, {
            state: {
                currentUserData: currentUserData,
                otherUsers: otherUsers
            }
        });
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
                            {['red', 'green', 'blue', 'orange', 'purple', 'brown'].filter(color => !players.some(player => player.color === color)).map(color => (
                                <option key={color} value={color}>{color}</option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-3">


                        <label htmlFor="numberOfPlayers" className="form-label">Number of players:</label>
                        <select
                            className="form-select"
                            id="numberOfPlayers"
                            defaultValue={numberOfPlayers}
                            onChange={(e) => setNumberOfPlayers(parseInt(e.target.value))}
                        >
                            {[2, 3, 4, 5, 6].map((number) => (
                                <option key={number} value={number}>{number}</option>
                            ))}
                        </select>


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
                                        {player.isHost ? `${player.name} (Host - Game for ${numberOfPlayers} players)` : player.name} - <span style={{ color: player.color }}>{player.color}</span> {player.disconnected ? '(Temporarily Disconnected)' : ''}
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
                    <Menu currentUserData={currentUserData} otherUsers={otherUsers} />
                </div>
            </div>
        </div>
    );
};

export default CreateServerPage;
