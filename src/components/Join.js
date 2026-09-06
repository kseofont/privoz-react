const JoinGamePage = () => {
    const [userName, setUserName] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [hostPeerId, setHostPeerId] = useState('');
    const [peer, setPeer] = useState(null);
    const [connection, setConnection] = useState(null);

    useEffect(() => {
        if (!peer) {
            // Создаем Peer для подключения к хосту
            const newPeer = new Peer();
            newPeer.on('open', (id) => {
                console.log('My Peer ID:', id);
            });
            setPeer(newPeer);
        }
    }, [peer]);

    const handleJoinGame = () => {
        if (!hostPeerId) {
            alert('Please enter the host Peer ID to join the game.');
            return;
        }

        // Подключаемся к хосту через его Peer ID
        const conn = peer.connect(hostPeerId);

        conn.on('open', () => {
            console.log('Connected to host:', hostPeerId);
            setConnection(conn);

            // Отправляем информацию о новом игроке на хост
            conn.send({
                type: 'join',
                playerName: userName,
                color: selectedColor,
            });
        });

        conn.on('data', (data) => {
            console.log('Received from host:', data);
            // Обрабатываем данные, полученные от хоста
        });
    };

    return (
        <div className="container mt-5">
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
        </div>
    );
};

export { CreateServerPage, JoinGamePage };