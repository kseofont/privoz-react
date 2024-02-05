import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Import the useNavigate hook
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/App.css';

const App = () => {
  const [userName, setUserName] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [numberOfPlayers, setNumberOfPlayers] = useState(2);

  // Access the navigate function
  const navigate = useNavigate();

  const handleStartGame = () => {
    // Check if the number of players is within the allowed range
    if (numberOfPlayers < 2 || numberOfPlayers > 6) {
      alert('Please enter a number of players between 2 and 6.');
      return;
    }

    // Make the API request with only the number_of_players
    axios.post('https://privoz-api.lavron.dev/game/new', null, {
      params: {
        number_of_players: numberOfPlayers,
      },
    })
      .then(response => {
        console.log('Server response:', response);
        // Handle the response as needed
        // Check if the response is successful (status code 200)
        if (response.status === 200) {
          // Redirect to the / route
          navigate('/');
        }
      })
      .catch(error => {
        console.error('Error submitting data to the server:', error);
        if (error.response) {
          console.log('Server response data:', error.response.data);
          console.log('Server response status:', error.response.status);
          console.log('Server response headers:', error.response.headers);

          // Handle specific validation error details
          if (error.response.data && error.response.data.detail && Array.isArray(error.response.data.detail)) {
            const validationErrors = error.response.data.detail.map(errorDetail => errorDetail.msg).join('\n');
            alert(`Validation Error:\n${validationErrors}`);
            console.log(`Validation Error:\n${validationErrors}`);
          } else {
            alert('An error occurred while processing the request.');
          }
        }
      });
  };



  return (
    <div className="container mt-5">
      <h1 className="hello-text">Hello in the game Privoz</h1>

      <div className="mb-3">
        <label htmlFor="userName" className="form-label">Enter your name:</label>
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            id="userName"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            required
          />
          {userName && (
            <span className={`input-group-text ${selectedColor}`}><i className="bi bi-shop-window"></i></span>
          )}
        </div>
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
      <p className="info-text">Let's start a new game and learn more about the game rules. Have fun!</p>
    </div>
  );
};

export default App;
