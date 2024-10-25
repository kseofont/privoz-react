import React, { useState } from 'react';
import Peer from 'peerjs';
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

    const handleJoinGame = () => {
        if (!hostPeerId) {
            alert('Please enter the host Peer ID to join the game.');
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

                // Отправляем имя игрока и цвет на хост
                conn.send({
                    type: 'join',
                    playerName: userName,
                    color: selectedColor
                });
            });

            conn.on('data', (data) => {
                console.log('Received from host:', data);
            });

            conn.on('error', (error) => {
                console.error('Connection error:', error);
                setErrorMessage(`Connection error: ${error.message || 'An error occurred while connecting to the host.'}`);
            });

            conn.on('close', () => {
                console.log('Disconnected from host.');
                setConnected(false);
                setErrorMessage('Disconnected unexpectedly from the host. Please try reconnecting.');
            });
        });

        newPeer.on('error', (error) => {
            console.error('Peer error:', error);
            setErrorMessage(`Peer error: ${error.message || 'An error occurred while initializing the peer connection.'}`);
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
                            <option value="red">Red</option>
                            <option value="green">Green</option>
                            <option value="blue">Blue</option>
                            <option value="orange">Orange</option>
                            <option value="purple">Purple</option>
                            <option value="brown">Brown</option>
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
                        </div>
                    )}

                    {errorMessage && (
                        <div className="mt-3 alert alert-danger">
                            <p>{errorMessage}</p>
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

export default JoinGamePage;
