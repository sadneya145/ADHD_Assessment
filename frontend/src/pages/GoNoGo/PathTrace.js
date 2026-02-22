import React, { useState } from "react";
import "./GoNoGo.css";

export default function PathFollowGame() {
  const [score, setScore] = useState(0);

  return (
    <div className="gonogo-container">
      <div className="gonogo-card">
        <h2>🛤 Follow the Path</h2>
        <div
          style={{
            width: 300,
            height: 200,
            border: "3px dashed #10b981",
            margin: "20px auto",
          }}
          onMouseMove={() => setScore(score + 1)}
        ></div>
        <p>Movement Score: {score}</p>
      </div>
    </div>
  );
}