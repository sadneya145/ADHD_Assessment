"use client";
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import React, { useState, useEffect, useCallback, useRef } from "react";
import "./Nback.css";

export default function NBackTask() {
  // Cute animal emojis instead of letters
  const STIMULI_SET = ["🐶", "🐱", "🐰", "🐸", "🦊", "🐻", "🐼", "🦁"];
  const TOTAL_ROUNDS = 20;
  const STIMULUS_DURATION = 1500;
  const INTER_STIMULUS_INTERVAL = 500;

  const [gameState, setGameState] = useState("instructions");
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
  const [showFeedback, setShowFeedback] = useState(null);

  const timerRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    return () => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

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
    setShowFeedback(null);

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
      setShowFeedback("correct");
    } else {
      setScore((s) => ({ ...s, falseAlarms: s.falseAlarms + 1 }));
      setShowFeedback("incorrect");
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

  const getPerformanceMessage = (accuracy) => {
    if (accuracy >= 90) return { emoji: "🌟", msg: "WOW! You're a SUPERSTAR!", color: "#FFD700" };
    if (accuracy >= 75) return { emoji: "⭐", msg: "Great Job! You're Amazing!", color: "#4CAF50" };
    if (accuracy >= 60) return { emoji: "✨", msg: "Good Work! Keep Practicing!", color: "#2196F3" };
    return { emoji: "💪", msg: "Nice Try! You'll Do Better Next Time!", color: "#FF9800" };
  };

  // Instructions Screen
  if (gameState === "instructions") {
    return (
      <div>
        <Header />
        <div className="instructions-container">
          <div className="instructions-card">
            <div className="instructions-header">
              <h1 className="fun-title">🎮 Memory Match Game! 🧠</h1>
            </div>
            
            <div className="instructions-content">
              <div className="instruction-step">
                <div className="step-number">1</div>
                <p className="step-text">You'll see cute animals appear one by one! 🐶🐱🐰</p>
              </div>

              <div className="instruction-step">
                <div className="step-number">2</div>
                <p className="step-text">
                  Remember the animals you see! Try to remember if you saw the <strong>same animal</strong> a few steps ago.
                </p>
              </div>

              <div className="example-box">
                <p className="example-title">📖 Example:</p>
                <div className="example-sequence">
                  <div className="example-item">
                    <span className="example-emoji">🐶</span>
                    <span className="example-label">First</span>
                  </div>
                  <div className="example-item">
                    <span className="example-emoji">🐱</span>
                    <span className="example-label">Second</span>
                  </div>
                  <div className="example-item">
                    <span className="example-emoji match-highlight">🐶</span>
                    <span className="example-label">Third ✅</span>
                  </div>
                </div>
                <p className="example-explanation">
                  The 🐶 appears again! Press "MATCH!" when you see the same animal!
                </p>
              </div>

              <div className="instruction-step">
                <div className="step-number">3</div>
                <p className="step-text">
                  Press the <strong className="match-text">MATCH!</strong> button when you see a repeat!
                </p>
              </div>

              <div className="instruction-step">
                <div className="step-number">4</div>
                <p className="step-text">
                  Don't press anything if it's a <strong>new</strong> animal!
                </p>
              </div>

              <div className="tip-box">
                <span className="tip-emoji">💡</span>
                <p className="tip-text">
                  <strong>Tip:</strong> Focus and remember the order! The game gets trickier as you go!
                </p>
              </div>
            </div>

            <button className="btn start-btn" onClick={() => setGameState("settings")}>
              Let's Play! 🚀
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Settings Screen
  if (gameState === "settings") {
    return (
      <div>
        <Header />
        <div className="settings-container">
          <h2 className="card-title">🎯 Choose Your Challenge!</h2>
          <p className="subtitle">Pick how hard you want to play!</p>
          
          <div className="difficulty-container">
            <div className="difficulty-label">
              <span className="difficulty-text">
                {nBack === 1 && "🌱 Easy"}
                {nBack === 2 && "⭐ Medium"}
                {nBack === 3 && "🔥 Hard"}
                {nBack === 4 && "💎 Expert"}
                {nBack === 5 && "🏆 Champion"}
              </span>
            </div>
            
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={nBack}
              onChange={(e) => setNBack(parseInt(e.target.value))}
              className="slider"
            />
            
            <div className="slider-labels">
              <span>Easy</span>
              <span>Champion</span>
            </div>
          </div>

          <div className="info-box">
            <p className="info-text">
              You'll need to remember <strong>{nBack}</strong> step{nBack > 1 ? 's' : ''} back!
            </p>
          </div>

          <button className="btn play-btn" onClick={startGame}>
            Start Game! 🎮
          </button>
          
          <button className="btn back-btn" onClick={() => setGameState("instructions")}>
            📖 Instructions
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  // Finished Screen
  if (gameState === "finished") {
    const totalTargets = score.hits + score.misses;
    const accuracy =
      totalTargets > 0 ? ((score.hits / totalTargets) * 100).toFixed(1) : 0;
    const performance = getPerformanceMessage(parseFloat(accuracy));

    return (
      <div>
        <Header />
        <div className="results-container">
          <div className="performance-badge" style={{backgroundColor: performance.color}}>
            <div className="performance-emoji">{performance.emoji}</div>
            <h2 className="performance-title">{performance.msg}</h2>
          </div>

          <div className="accuracy-display">
            <div className="accuracy-number">{accuracy}%</div>
            <div className="accuracy-label">Accuracy</div>
          </div>

          <div className="stats-grid">
            <div className="stat-box hit-box">
              <div className="stat-emoji">✅</div>
              <div className="stat-number">{score.hits}</div>
              <div className="stat-label">Correct Matches</div>
            </div>
            <div className="stat-box miss-box">
              <div className="stat-emoji">😅</div>
              <div className="stat-number">{score.misses}</div>
              <div className="stat-label">Missed</div>
            </div>
            <div className="stat-box false-box">
              <div className="stat-emoji">⚠️</div>
              <div className="stat-number">{score.falseAlarms}</div>
              <div className="stat-label">Oops</div>
            </div>
            <div className="stat-box correct-box">
              <div className="stat-emoji">👍</div>
              <div className="stat-number">{score.correctRejections}</div>
              <div className="stat-label">Correct Skips</div>
            </div>
          </div>

          <button className="btn play-again-btn" onClick={() => setGameState("settings")}>
            Play Again! 🔄
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  // Game Screen
  const progress = Math.max(0, currentIndex - nBack + 1);
  const progressPercent = (progress / TOTAL_ROUNDS) * 100;

  return (
    <div>
      <Header />
      <div className="game-container">
        <div className="progress-section">
          <div className="progress-text">
            Round {progress} of {TOTAL_ROUNDS}
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{width: `${progressPercent}%`}} />
          </div>
        </div>

        <div className="stimulus-container">
          <div className="stimulus-box">
            {currentIndex >= nBack ? (
              <span className="stimulus">{sequence[currentIndex]}</span>
            ) : (
              <span className="get-ready">Get Ready! 🎯</span>
            )}
          </div>
          
          {showFeedback && (
            <div className={showFeedback === "correct" ? "feedback-correct" : "feedback-incorrect"}>
              {showFeedback === "correct" ? "✨ Great!" : "🤔 Not quite"}
            </div>
          )}
        </div>

        <button
          className={`btn match-button ${(responded || currentIndex < nBack) ? 'disabled' : ''}`}
          onClick={handleResponse}
          disabled={responded || currentIndex < nBack}
        >
          {responded ? "⏳ Wait..." : "MATCH! 🎯"}
        </button>

        <div className="hint">
          💡 Remember: Look back {nBack} step{nBack > 1 ? 's' : ''}!
        </div>
      </div>
      <Footer />
    </div>
  );
}