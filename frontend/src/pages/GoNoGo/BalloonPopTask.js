import React, { useState, useEffect, useRef } from "react";
import "./BalloonGame.css";

const BalloonGame = () => {
  const [stage, setStage] = useState("instructions");
  const [balloons, setBalloons] = useState([]);
  const [score, setScore] = useState(0);
  const [wrongTaps, setWrongTaps] = useState(0);
  const [missed, setMissed] = useState(0);
  const [reactionTimes, setReactionTimes] = useState([]);
  const spawnRef = useRef(null);
  const gameTimerRef = useRef(null);

  //////////////////////////////////////////////////
  // 🔊 VOICE FUNCTION (For 5–7 Kids)
  //////////////////////////////////////////////////

  const speak = (text) => {
    window.speechSynthesis.cancel(); // stop previous speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.75;
    utterance.pitch = 1.3;
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  //////////////////////////////////////////////////
  // 🎈 START GAME
  //////////////////////////////////////////////////

  const startGame = () => {
    setStage("game");
    setScore(0);
    setWrongTaps(0);
    setMissed(0);
    setReactionTimes([]);
    setBalloons([]);

    speak("Tap the blue balloons. Do not tap the red balloons. Ready? Go!");

    spawnRef.current = setInterval(spawnBalloons, 2000);

    gameTimerRef.current = setTimeout(() => {
      endGame();
    }, 60000);
  };

  //////////////////////////////////////////////////
  // 🎈 SPAWN BALLOONS
  //////////////////////////////////////////////////

  const spawnBalloons = () => {
    const isBlue = Math.random() > 0.4;

    const newBalloon = {
      id: Date.now() + Math.random(),
      color: isBlue ? "blue" : "red",
      left: Math.random() * 85,
      createdAt: Date.now(),
    };

    setBalloons((prev) => [...prev, newBalloon]);

    setTimeout(() => {
      setBalloons((prev) => {
        const exists = prev.find((b) => b.id === newBalloon.id);
        if (exists && newBalloon.color === "blue") {
          setMissed((m) => m + 1);
        }
        return prev.filter((b) => b.id !== newBalloon.id);
      });
    }, 4000);
  };

  //////////////////////////////////////////////////
  // 🎈 POP BALLOON
  //////////////////////////////////////////////////

  const popBalloon = (balloon) => {
    const reaction = Date.now() - balloon.createdAt;
    setReactionTimes((prev) => [...prev, reaction]);

    if (balloon.color === "blue") {
      setScore((s) => s + 1);
      speak("Good job!");
    } else {
      setWrongTaps((w) => w + 1);
      speak("Oops! That was red.");
    }

    setBalloons((prev) => prev.filter((b) => b.id !== balloon.id));
  };

  //////////////////////////////////////////////////
  // 🛑 END GAME
  //////////////////////////////////////////////////

  const endGame = () => {
    clearInterval(spawnRef.current);
    clearTimeout(gameTimerRef.current);
    setStage("result");

    speak("Great job! Game finished!");

    console.log({
      score,
      wrongTaps,
      missed,
      avgReactionTime:
        reactionTimes.length > 0
          ? reactionTimes.reduce((a, b) => a + b, 0) /
            reactionTimes.length
          : 0,
    });
  };

  //////////////////////////////////////////////////

  return (
    <div className="container">
      <h1 className="title">🎈 Balloon Tap Game</h1>

      {stage === "instructions" && (
        <div className="card">
          <h2>👋 Hello!</h2>
          <p className="instructions">
            🎈 Tap the <span className="blueText">BLUE</span> balloons!
            <br />
            🚫 Do NOT tap the <span className="redText">RED</span> balloons!
          </p>
          <button
            className="startBtn"
            onClick={() => {
              speak(
                "Hello! Tap the blue balloons. Do not tap the red balloons."
              );
              startGame();
            }}
          >
            Start Game
          </button>
        </div>
      )}

      {stage === "game" && (
        <>
          <div className="scoreBoard">
            ⭐ Score: {score} | ❌ Wrong: {wrongTaps} | ⏳ Missed: {missed}
          </div>

          <div className="gameArea">
            {balloons.map((balloon) => (
              <div
                key={balloon.id}
                onClick={() => popBalloon(balloon)}
                className={`balloon ${balloon.color}`}
                style={{ left: `${balloon.left}%` }}
              />
            ))}
          </div>
        </>
      )}

      {stage === "result" && (
        <div className="card">
          <h2>🌟 Great Job!</h2>
          <p>Blue Balloons Tapped: {score}</p>
          <p>Wrong Taps: {wrongTaps}</p>
          <p>Missed Blue Balloons: {missed}</p>

          <button className="startBtn" onClick={startGame}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};

export default BalloonGame;