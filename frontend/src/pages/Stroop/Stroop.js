import React, { useState, useEffect, useCallback } from "react";
import "./Stroop.css";

const COLORS = [
  { name: "RED", hex: "#FF0000" },
  { name: "BLUE", hex: "#3399FF" },
  { name: "GREEN", hex: "#00C851" },
  { name: "YELLOW", hex: "#FFD600" },
];

const TOTAL_ROUNDS = 10;

export default function StroopTask() {
  const [gameState, setGameState] = useState("idle"); // idle | running | finished
  const [currentWord, setCurrentWord] = useState(null);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [reactionTimes, setReactionTimes] = useState([]);
  const [startTime, setStartTime] = useState(0);

  const generateNewWord = useCallback(() => {
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    let randomWord = COLORS[Math.floor(Math.random() * COLORS.length)];
    while (randomWord.name === randomColor.name) {
      randomWord = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
    setCurrentWord({ text: randomWord.name, color: randomColor.hex });
    setStartTime(Date.now());
  }, []);

  useEffect(() => {
    if (gameState === "running" && round < TOTAL_ROUNDS) {
      generateNewWord();
    } else if (round >= TOTAL_ROUNDS) {
      setGameState("finished");
    }
  }, [gameState, round, generateNewWord]);

  const handleColorClick = (colorHex) => {
    if (!currentWord) return;
    const reactionTime = Date.now() - startTime;
    setReactionTimes((prev) => [...prev, reactionTime]);
    if (colorHex === currentWord.color) {
      setScore((prev) => prev + 1);
    }
    setRound((prev) => prev + 1);
  };

  const startGame = () => {
    setGameState("running");
    setRound(0);
    setScore(0);
    setReactionTimes([]);
    setCurrentWord(null);
  };

  const avgReactionTime =
    reactionTimes.length > 0
      ? (reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length).toFixed(0)
      : 0;

  if (gameState === "idle") {
    return (
      <div className="stroop-container">
        <h2>Stroop Task Instructions</h2>
        <p>
          A word will appear on the screen in a specific color. <br />
          Your task is to click the button corresponding to the <b>color</b> of the word,
          <b> NOT the word itself.</b>
        </p>
        <button className="stroop-btn start" onClick={startGame}>
          Start Game
        </button>
      </div>
    );
  }

  if (gameState === "finished") {
    return (
      <div className="stroop-container">
        <h2>Results</h2>
        <div className="result-box">
          <p><b>Score:</b> {score} / {TOTAL_ROUNDS}</p>
          <p><b>Correct:</b> {score}</p>
          <p><b>Incorrect:</b> {TOTAL_ROUNDS - score}</p>
          <p><b>Avg. Reaction Time:</b> {avgReactionTime} ms</p>
        </div>
        <button className="stroop-btn restart" onClick={startGame}>
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="stroop-container">
      <div className="status">
        <p>Round {round + 1} of {TOTAL_ROUNDS}</p>
        <p>Score: {score}</p>
      </div>

      <div
        className="word-display"
        style={{ color: currentWord?.color }}
      >
        {currentWord?.text}
      </div>

      <div className="buttons-grid">
        {COLORS.map((color) => (
          <button
            key={color.name}
            onClick={() => handleColorClick(color.hex)}
            className="color-btn"
            style={{ backgroundColor: color.hex }}
          >
            {color.name}
          </button>
        ))}
      </div>
    </div>
  );
}
