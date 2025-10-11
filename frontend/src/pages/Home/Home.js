import React from 'react';

function Home() {
  return (
    <div className="container home">
      <h1>🎉 Welcome, Friend! 🎉</h1>
      <p>Choose an activity:</p>
      <div className="activity-buttons">
        <button className="btn">Focus Game</button>
        <button className="btn">Breathing Exercise</button>
        <button className="btn">Daily Tips</button>
      </div>
    </div>
  );
}

export default Home;
