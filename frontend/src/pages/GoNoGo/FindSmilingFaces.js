import React, { useState } from "react";
import "./GoNoGo.css";

export default function FindSmilingFace() {
  const [stage, setStage] = useState("intro");
  const [score, setScore] = useState(0);

  const faces = ["😐", "😐", "😐", "🙂", "😐", "😐"];

  const shuffled = faces.sort(() => Math.random() - 0.5);

  return (
    <div className="gonogo-container">
      <div className="gonogo-card">
        {stage === "intro" && (
          <>
            <h2>🙂 Find the Happy Face</h2>
            <button
              className="gonogo-btn gonogo-start-btn"
              onClick={() => setStage("play")}
            >
              Start
            </button>
          </>
        )}

        {stage === "play" && (
          <>
            <h3>Score: {score}</h3>
            <div style={{ fontSize: 60 }}>
              {shuffled.map((face, i) => (
                <span
                  key={i}
                  style={{ margin: 20, cursor: "pointer" }}
                  onClick={() =>
                    face === "🙂"
                      ? setScore(score + 1)
                      : alert("Oops! Try again!")
                  }
                >
                  {face}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}