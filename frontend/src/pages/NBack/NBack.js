"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import "./Nback.css"; // import normal CSS

export default function NBackTask() {
  const STIMULI_SET = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const TOTAL_ROUNDS = 20;
  const STIMULUS_DURATION = 1500;
  const INTER_STIMULUS_INTERVAL = 500;

  const [gameState, setGameState] = useState("settings");
  const [nBack, setNBack] = useState(2);
  const [sequence, setSequence] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState({
    hits: 0,
    misses: 0,
    falseAlarms: 0,
    correctRejections: 0,
  });
  const [responded, setResponded] = useState(false);

  const timerRef = useRef(null);

  const generateSequence = useCallback(() => {
    const newSequence = [];
    for (let i = 0; i < TOTAL_ROUNDS + nBack; i++) {
      const shouldMatch = i >= nBack && Math.random() < 0.3;
      if (shouldMatch) {
        newSequence.push(newSequence[i - nBack]);
      } else {
        let randomStimulus =
          STIMULI_SET[Math.floor(Math.random() * STIMULI_SET.length)];
        if (i >= nBack && randomStimulus === newSequence[i - nBack]) {
          randomStimulus =
            STIMULI_SET[
              (STIMULI_SET.indexOf(randomStimulus) + 1) % STIMULI_SET.length
            ];
        }
        newSequence.push(randomStimulus);
      }
    }
    setSequence(newSequence);
  }, [nBack]);

  const nextStimulus = useCallback(() => {
    if (currentIndex >= nBack - 1 && currentIndex < TOTAL_ROUNDS + nBack - 1) {
      const isTarget =
        sequence[currentIndex + 1] === sequence[currentIndex + 1 - nBack];
      if (!responded && isTarget) {
        setScore((s) => ({ ...s, misses: s.misses + 1 }));
      }
    }
    setResponded(false);

    if (currentIndex < TOTAL_ROUNDS + nBack - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setGameState("finished");
    }
  }, [currentIndex, nBack, responded, sequence]);

  useEffect(() => {
    if (gameState === "running") {
      timerRef.current = setTimeout(
        nextStimulus,
        STIMULUS_DURATION + INTER_STIMULUS_INTERVAL
      );
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gameState, currentIndex, nextStimulus]);

  const handleResponse = () => {
    if (responded) return;
    setResponded(true);

    const isTarget = sequence[currentIndex] === sequence[currentIndex - nBack];
    if (isTarget) {
      setScore((s) => ({ ...s, hits: s.hits + 1 }));
    } else {
      setScore((s) => ({ ...s, falseAlarms: s.falseAlarms + 1 }));
    }
  };

  useEffect(() => {
    const checkCorrectRejection = () => {
      if (gameState === "running" && currentIndex >= nBack) {
        const isTarget =
          sequence[currentIndex] === sequence[currentIndex - nBack];
        if (!isTarget && !responded) {
          setScore((s) => ({ ...s, correctRejections: s.correctRejections + 1 }));
        }
      }
    };

    const timeoutId = setTimeout(checkCorrectRejection, STIMULUS_DURATION);

    return () => clearTimeout(timeoutId);
  }, [currentIndex, gameState, nBack, responded, sequence]);

  const startGame = () => {
    generateSequence();
    setCurrentIndex(0);
    setScore({ hits: 0, misses: 0, falseAlarms: 0, correctRejections: 0 });
    setGameState("running");
  };

  if (gameState === "settings") {
    return (
      <div className="settings-container">
        <h2>N-Back Task Settings</h2>
        <p>Set the value of N. A higher N is more challenging.</p>
        <div>
          <label>N = {nBack}</label>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={nBack}
            onChange={(e) => setNBack(parseInt(e.target.value))}
          />
        </div>
        <button onClick={startGame}>Start Game (N={nBack})</button>
      </div>
    );
  }

  if (gameState === "finished") {
    const totalTargets = score.hits + score.misses;
    const accuracy =
      totalTargets > 0 ? ((score.hits / totalTargets) * 100).toFixed(1) : 0;

    return (
      <div className="results-card">
        <h2>Results for N={nBack}</h2>
        <div className="results-grid">
          <div className="result-item">Hits: {score.hits}</div>
          <div className="result-item">Misses: {score.misses}</div>
          <div className="result-item">False Alarms: {score.falseAlarms}</div>
          <div className="result-item">
            Correct Rejections: {score.correctRejections}
          </div>
        </div>
        <div className="accuracy">Accuracy: {accuracy}%</div>
        <button onClick={() => setGameState("settings")}>Play Again</button>
      </div>
    );
  }

  return (
    <div className="game-container">
      <p>
        Round {Math.max(0, currentIndex - nBack + 1)} of {TOTAL_ROUNDS}
      </p>
      <div className="stimulus-box">
        {currentIndex >= nBack ? (
          <span className="stimulus">{sequence[currentIndex]}</span>
        ) : (
          <span>Get Ready...</span>
        )}
      </div>
      <button
        className="match-button"
        onClick={handleResponse}
        disabled={responded || currentIndex < nBack}
      >
        Match
      </button>
    </div>
  );
}
