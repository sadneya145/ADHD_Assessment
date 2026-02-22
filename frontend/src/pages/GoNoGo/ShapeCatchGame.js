import React, { useState, useEffect } from "react";
import "./GoNoGo.css";

export default function ShapeCatchGame() {
  const [stage, setStage] = useState("intro");
  const [items, setItems] = useState([]);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);

  useEffect(() => {
    if (stage === "play") {
      const interval = setInterval(() => {
        const isCircle = Math.random() > 0.4;
        setItems((prev) => [
          ...prev,
          { id: Date.now(), type: isCircle ? "circle" : "square" },
        ]);
      }, 1200);

      setTimeout(() => {
        clearInterval(interval);
        setStage("result");
      }, 20000);

      return () => clearInterval(interval);
    }
  }, [stage]);

  const clickItem = (item) => {
    if (item.type === "circle") setScore(score + 1);
    else setWrong(wrong + 1);

    setItems(items.filter((i) => i.id !== item.id));
  };

  return (
    <div className="gonogo-container">
      <div className="gonogo-screen">
        <div className="gonogo-card">
          {stage === "intro" && (
            <>
              <h2 className="gonogo-game-title">⭕ Shape Catch</h2>
              <p>Catch only circles. Ignore squares.</p>
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
              <h3>Score: {score} | Wrong: {wrong}</h3>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => clickItem(item)}
                    style={{
                      width: 80,
                      height: 80,
                      background: "#10b981",
                      borderRadius: item.type === "circle" ? "50%" : "0%",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {stage === "result" && (
            <>
              <h2>Finished!</h2>
              <p>Score: {score}</p>
              <p>Wrong: {wrong}</p>
              <button
                className="gonogo-btn gonogo-play-again-btn"
                onClick={() => window.location.reload()}
              >
                Play Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}