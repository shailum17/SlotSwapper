import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>SlotSwapper</h1>
          <p>Peer-to-peer time slot scheduling application</p>
        </header>
      </div>
    </Router>
  );
}

export default App;