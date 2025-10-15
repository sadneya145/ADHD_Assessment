import { useState, useEffect, useCallback, useRef } from 'react';
import './GoNoGo.css';

const TOTAL_ROUNDS = 20;
const GO_PROBABILITY = 0.7;
const SIGNAL_DURATION = 800;
const MIN_WAIT_TIME = 500;
const MAX_WAIT_TIME = 1500;

export default function GoNoGoTask() {
  const [gameState, setGameState] = useState('idle');
  const [signal, setSignal] = useState('Wait');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState({ hits: 0, misses: 0, falseAlarms: 0, correctRejections: 0 });
  const [reactionTimes, setReactionTimes] = useState([]);

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

  const signalStartTime = useRef(0);
  const userResponded = useRef(false);
  const gameLoopTimeout = useRef(null);

  const endRound = useCallback(() => {
    if (signal === 'Go' && !userResponded.current) {
      setScore(s => ({ ...s, misses: s.misses + 1 }));
    }
    if (signal === 'No-Go' && !userResponded.current) {
      setScore(s => ({ ...s, correctRejections: s.correctRejections + 1 }));
    }

    setSignal('Wait');
    userResponded.current = false;

    if (round + 1 >= TOTAL_ROUNDS) {
      setGameState('finished');
    } else {
      setRound(r => r + 1);
    }
  }, [round, signal]);

  useEffect(() => {
    if (gameState === 'running' && round < TOTAL_ROUNDS) {
      const waitTime = Math.random() * (MAX_WAIT_TIME - MIN_WAIT_TIME) + MIN_WAIT_TIME;
      gameLoopTimeout.current = setTimeout(() => {
        const newSignal = Math.random() < GO_PROBABILITY ? 'Go' : 'No-Go';
        setSignal(newSignal);
        signalStartTime.current = Date.now();
        userResponded.current = false;

        gameLoopTimeout.current = setTimeout(endRound, SIGNAL_DURATION);
      }, waitTime);
    }

    return () => {
      if (gameLoopTimeout.current) clearTimeout(gameLoopTimeout.current);
    };
  }, [gameState, round, endRound]);

  const handleResponse = () => {
    if (signal === 'Wait' || userResponded.current) return;

    userResponded.current = true;
    const rt = Date.now() - signalStartTime.current;

    if (signal === 'Go') {
      setScore(s => ({ ...s, hits: s.hits + 1 }));
      setReactionTimes(rts => [...rts, rt]);
    } else if (signal === 'No-Go') {
      setScore(s => ({ ...s, falseAlarms: s.falseAlarms + 1 }));
    }
  };

  const startGame = () => {
    setGameState('running');
    setRound(0);
    setScore({ hits: 0, misses: 0, falseAlarms: 0, correctRejections: 0 });
    setReactionTimes([]);
    setSignal('Wait');
    userResponded.current = false;
  };

  const avgReactionTime = reactionTimes.length > 0 
    ? (reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length).toFixed(0) 
    : 0;

  const getPerformanceMessage = () => {
    const totalCorrect = score.hits + score.correctRejections;
    const percentage = (totalCorrect / TOTAL_ROUNDS) * 100;
    
    if (percentage >= 90) return { emoji: '🌟', msg: 'Amazing! You\'re a superstar!', color: '#fbbf24' };
    if (percentage >= 75) return { emoji: '🎉', msg: 'Great job! You did awesome!', color: '#60a5fa' };
    if (percentage >= 60) return { emoji: '👍', msg: 'Good work! Keep practicing!', color: '#34d399' };
    return { emoji: '💪', msg: 'Nice try! You\'re getting better!', color: '#a78bfa' };
  };

  // Idle/Instructions Screen
  if (gameState === 'idle') {
    return (
      <div className="gonogo-container">
        <div className="gonogo-screen">
          <div className="gonogo-card">
            <div className="gonogo-title-section">
              <span className="gonogo-game-icon">🚦</span>
              <h2 className="gonogo-game-title">Green Light, Red Light!</h2>
              <p className="gonogo-game-subtitle">A fun reaction game to test your focus!</p>
            </div>

            <div className="gonogo-instructions">
              <h3 className="gonogo-instructions-title">How to Play 🎯</h3>
              
              <div className="gonogo-instruction-step">
                <div className="gonogo-step-number">1</div>
                <div className="gonogo-step-content">
                  <p className="gonogo-step-text">Watch the circle carefully!</p>
                </div>
              </div>

              <div className="gonogo-example-row">
                <div className="gonogo-example-card">
                  <div className="gonogo-example-signal gonogo-green-example">
                    😊
                  </div>
                  <p className="gonogo-example-label">GREEN = GO!</p>
                  <p className="gonogo-example-desc">Press the button fast!</p>
                </div>
                
                <div className="gonogo-example-card">
                  <div className="gonogo-example-signal gonogo-red-example">
                    ✋
                  </div>
                  <p className="gonogo-example-label">RED = STOP!</p>
                  <p className="gonogo-example-desc">Don't press anything!</p>
                </div>
              </div>

              <div className="gonogo-instruction-step">
                <div className="gonogo-step-number">2</div>
                <div className="gonogo-step-content">
                  <p className="gonogo-step-text">You'll play 20 rounds</p>
                </div>
              </div>

              <div className="gonogo-instruction-step">
                <div className="gonogo-step-number">3</div>
                <div className="gonogo-step-content">
                  <p className="gonogo-step-text">Try to be quick and accurate!</p>
                </div>
              </div>
            </div>

            <button onClick={startGame} className="gonogo-btn gonogo-start-btn">
              🎮 Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Results Screen
  if (gameState === 'finished') {
    const performance = getPerformanceMessage();
    const stars = Math.ceil((score.hits + score.correctRejections) / TOTAL_ROUNDS * 5);
    
    return (
      <div className="gonogo-container">
        <div className="gonogo-screen">
          <div className="gonogo-card">
            <div className="gonogo-celebration-header">
              <span className="gonogo-celebration-emoji">{performance.emoji}</span>
              <h2 className="gonogo-celebration-title" style={{color: performance.color}}>
                {performance.msg}
              </h2>
            </div>

            <div className="gonogo-star-rating">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`gonogo-star ${i < stars ? 'gonogo-star-filled' : 'gonogo-star-empty'}`}>
                  ⭐
                </span>
              ))}
            </div>

            <div className="gonogo-results-grid">
              <div className="gonogo-result-card gonogo-green-card">
                <span className="gonogo-result-emoji">✅</span>
                <span className="gonogo-result-number">{score.hits}</span>
                <span className="gonogo-result-label">Quick Catches!</span>
              </div>

              <div className="gonogo-result-card gonogo-blue-card">
                <span className="gonogo-result-emoji">🛑</span>
                <span className="gonogo-result-number">{score.correctRejections}</span>
                <span className="gonogo-result-label">Good Stops!</span>
              </div>

              <div className="gonogo-result-card gonogo-orange-card">
                <span className="gonogo-result-emoji">😴</span>
                <span className="gonogo-result-number">{score.misses}</span>
                <span className="gonogo-result-label">Too Slow</span>
              </div>

              <div className="gonogo-result-card gonogo-red-card">
                <span className="gonogo-result-emoji">⚠️</span>
                <span className="gonogo-result-number">{score.falseAlarms}</span>
                <span className="gonogo-result-label">Wrong Press</span>
              </div>
            </div>

            {avgReactionTime > 0 && (
              <div className="gonogo-speed-badge">
                <span className="gonogo-speed-icon">⚡</span>
                <span className="gonogo-speed-text">Your Speed: {avgReactionTime}ms</span>
              </div>
            )}

            <button onClick={startGame} className="gonogo-btn gonogo-play-again-btn">
              🔄 Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game Screen
  return (
    <div className="gonogo-container">
      <div className="gonogo-screen">
        <div className="gonogo-card">
          <div className="gonogo-progress-section">
            <span className="gonogo-round-text">Round {round + 1} of {TOTAL_ROUNDS}</span>
            <div className="gonogo-progress-bar">
              <div 
                className="gonogo-progress-fill" 
                style={{width: `${((round + 1) / TOTAL_ROUNDS) * 100}%`}} 
              />
            </div>
          </div>

          <div className="gonogo-signal-container">
            {signal === 'Go' && (
              <div className="gonogo-signal gonogo-go-signal">
                <span className="gonogo-signal-emoji">😊</span>
              </div>
            )}
            {signal === 'No-Go' && (
              <div className="gonogo-signal gonogo-nogo-signal">
                <span className="gonogo-signal-emoji">✋</span>
              </div>
            )}
            {signal === 'Wait' && (
              <div className="gonogo-signal gonogo-wait-signal">
                <span className="gonogo-signal-emoji">👀</span>
              </div>
            )}
          </div>

          <button 
            onClick={handleResponse} 
            className="gonogo-btn gonogo-react-btn"
            disabled={signal === 'Wait'}
          >
            👆 TAP HERE
          </button>
        </div>
      </div>
    </div>
  );
}