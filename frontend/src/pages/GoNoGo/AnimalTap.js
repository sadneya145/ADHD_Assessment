'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import './GoNoGo.css';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';

const TOTAL_ROUNDS = 20;
const PRACTICE_ROUNDS = 3;
const TARGET_PROBABILITY = 0.7;
const SIGNAL_DURATION = 1000;

export default function AnimalTapTask() {
  const [gameState, setGameState] = useState('intro');
  const [animal, setAnimal] = useState('wait');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState({
    hits: 0,
    misses: 0,
    falseAlarms: 0,
    correctRejections: 0,
  });
  const [reactionTimes, setReactionTimes] = useState([]);

  const startTime = useRef(0);
  const responded = useRef(false);
  const timeoutRef = useRef(null);

  const endRound = useCallback(() => {
    const isPractice = gameState === 'practice';

    if (animal === 'dog' && !responded.current && !isPractice) {
      setScore(s => ({ ...s, misses: s.misses + 1 }));
    }

    if (animal === 'cat' && !responded.current && !isPractice) {
      setScore(s => ({ ...s, correctRejections: s.correctRejections + 1 }));
    }

    responded.current = false;
    setAnimal('wait');

    const max = gameState === 'practice' ? PRACTICE_ROUNDS : TOTAL_ROUNDS;

    if (round + 1 >= max) {
      if (gameState === 'practice') {
        setGameState('idle');
        setRound(0);
      } else {
        setGameState('finished');
      }
    } else {
      setRound(r => r + 1);
    }
  }, [round, animal, gameState]);

  useEffect(() => {
    if (gameState === 'running' || gameState === 'practice') {
      const isTarget = Math.random() < TARGET_PROBABILITY;
      const newAnimal = isTarget ? 'dog' : 'cat';
      setAnimal(newAnimal);
      startTime.current = Date.now();
      responded.current = false;

      timeoutRef.current = setTimeout(endRound, SIGNAL_DURATION);
    }

    return () => clearTimeout(timeoutRef.current);
  }, [round, gameState, endRound]);

  const handleTap = () => {
    if (animal === 'wait' || responded.current) return;
    responded.current = true;

    const rt = Date.now() - startTime.current;
    const isPractice = gameState === 'practice';

    if (animal === 'dog') {
      if (!isPractice) {
        setScore(s => ({ ...s, hits: s.hits + 1 }));
        setReactionTimes(r => [...r, rt]);
      }
    } else {
      if (!isPractice) {
        setScore(s => ({ ...s, falseAlarms: s.falseAlarms + 1 }));
      }
    }
  };

  const avgRT =
    reactionTimes.length > 0
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
      : 0;

  return (
    <div>
      <Header />
      <div className="gonogo-container">
        <div className="gonogo-screen">

          {gameState === 'intro' && (
            <div className="gonogo-card">
              <div className="gonogo-title-section">
                <span className="gonogo-game-icon">🐶</span>
                <h2 className="gonogo-game-title">Animal Tap Game</h2>
                <p className="gonogo-game-subtitle">Tap only when you see the Dog!</p>
              </div>

              <button onClick={() => setGameState('practice')} className="gonogo-btn gonogo-start-btn">
                🧪 Try Practice
              </button>
            </div>
          )}

          {(gameState === 'practice' || gameState === 'running') && (
            <div className="gonogo-card">
              <div className="gonogo-progress-section">
                <span className="gonogo-round-text">
                  Round {round + 1} of {gameState === 'practice' ? PRACTICE_ROUNDS : TOTAL_ROUNDS}
                </span>
              </div>

              <div className="gonogo-signal-container">
                {animal === 'dog' && (
                  <div className="gonogo-signal gonogo-go-signal">
                    <span className="gonogo-signal-emoji">🐶</span>
                  </div>
                )}
                {animal === 'cat' && (
                  <div className="gonogo-signal gonogo-nogo-signal">
                    <span className="gonogo-signal-emoji">🐱</span>
                  </div>
                )}
                {animal === 'wait' && (
                  <div className="gonogo-signal gonogo-wait-signal">
                    <span className="gonogo-signal-emoji">👀</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleTap}
                className="gonogo-btn gonogo-react-btn"
                disabled={animal === 'wait'}
              >
                👆 TAP
              </button>
            </div>
          )}

          {gameState === 'idle' && (
            <div className="gonogo-card">
              <h2>🚀 Ready for Real Game?</h2>
              <button onClick={() => setGameState('running')} className="gonogo-btn gonogo-start-btn">
                🎮 Start
              </button>
            </div>
          )}

          {gameState === 'finished' && (
            <div className="gonogo-card">
              <h2>🎉 Finished!</h2>

              <div className="gonogo-results-grid">
                <div className="gonogo-result-card gonogo-green-card">Hits: {score.hits}</div>
                <div className="gonogo-result-card gonogo-blue-card">Correct Rejections: {score.correctRejections}</div>
                <div className="gonogo-result-card gonogo-orange-card">Misses: {score.misses}</div>
                <div className="gonogo-result-card gonogo-red-card">False Alarms: {score.falseAlarms}</div>
              </div>

              {avgRT > 0 && (
                <div className="gonogo-speed-badge">
                  <span className="gonogo-speed-text">⚡ Avg Speed: {avgRT} ms</span>
                </div>
              )}

              <button
                onClick={() => setGameState('intro')}
                className="gonogo-btn gonogo-play-again-btn"
              >
                🔄 Play Again
              </button>
            </div>
          )}

        </div>
      </div>
      <Footer />
    </div>
  );
}