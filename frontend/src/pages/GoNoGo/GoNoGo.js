'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import './GoNoGo.css';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import { useNavigate } from 'react-router-dom';

const TOTAL_ROUNDS = 20;
const PRACTICE_ROUNDS = 3;   // 👈 added practice mode
const GO_PROBABILITY = 0.7;
const SIGNAL_DURATION = 800;
const MIN_WAIT_TIME = 500;
const MAX_WAIT_TIME = 1500;

export default function GoNoGoTask() {
  const [gameState, setGameState] = useState('intro'); // intro ➝ practice ➝ running ➝ finished
  const [signal, setSignal] = useState('Wait');
  const [round, setRound] = useState(0);
  const [score, setScore] = useState({
    hits: 0,
    misses: 0,
    falseAlarms: 0,
    correctRejections: 0,
  });
  const [reactionTimes, setReactionTimes] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const signalStartTime = useRef(0);
  const userResponded = useRef(false);
  const gameLoopTimeout = useRef(null);
  const navigate = useNavigate();

  // Scroll restoration
  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    return () => {
      if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'auto';
    };
  }, []);

  const endRound = useCallback(() => {
    const isPractice = gameState === 'practice';
    if (signal === 'Go' && !userResponded.current && !isPractice) {
      setScore(s => ({ ...s, misses: s.misses + 1 }));
    }
    if (signal === 'No-Go' && !userResponded.current && !isPractice) {
      setScore(s => ({ ...s, correctRejections: s.correctRejections + 1 }));
    }

    setSignal('Wait');
    userResponded.current = false;

    const maxRounds = gameState === 'practice' ? PRACTICE_ROUNDS : TOTAL_ROUNDS;

    if (round + 1 >= maxRounds) {
      if (gameState === 'practice') {
        setGameState('idle'); // 👈 move to real game start screen
        setRound(0);
      } else {
        setGameState('finished');
      }
    } else {
      setRound(r => r + 1);
    }
  }, [round, signal, gameState]);

  useEffect(() => {
    if ((gameState === 'running' || gameState === 'practice') && round < (gameState === 'practice' ? PRACTICE_ROUNDS : TOTAL_ROUNDS)) {
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

    const isPractice = gameState === 'practice';

    if (signal === 'Go') {
      if (!isPractice) {
        setScore(s => ({ ...s, hits: s.hits + 1 }));
        setReactionTimes(rts => [...rts, rt]);
      }
    } else if (signal === 'No-Go') {
      if (!isPractice) {
        setScore(s => ({ ...s, falseAlarms: s.falseAlarms + 1 }));
      }
    }
  };

  const startPractice = () => {
    setGameState('practice');
    setRound(0);
    setSignal('Wait');
    userResponded.current = false;
    setSaveMessage('');
  };

  const startGame = () => {
    setGameState('running');
    setRound(0);
    setScore({ hits: 0, misses: 0, falseAlarms: 0, correctRejections: 0 });
    setReactionTimes([]);
    setSignal('Wait');
    userResponded.current = false;
    setSaveMessage('');
  };

  const avgReactionTime =
    reactionTimes.length > 0
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
      : 0;

  const saveResultsToBackend = async (testData) => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token found');

      const res = await fetch('https://adhd-assessment-backend.onrender.com/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(testData),
      });

      const data = await res.json();
      if (res.ok) {
        setSaveMessage('✅ Results saved successfully!');
        setTimeout(() => navigate('/home/results'), 1000);
      } else {
        setSaveMessage(`❌ Error: ${data.error || 'Failed to save'}`);
      }
    } catch (error) {
      setSaveMessage(`❌ Network error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (gameState === 'finished') {
      const testData = { goNoGo: { ...score, avgReactionTime } };
      saveResultsToBackend(testData);
    }
  }, [gameState]);

  const getPerformanceMessage = () => {
    const totalCorrect = score.hits + score.correctRejections;
    const percentage = (totalCorrect / TOTAL_ROUNDS) * 100;
    if (percentage >= 90) return { emoji: '🌟', msg: 'Amazing! You\'re a superstar!', color: '#fbbf24' };
    if (percentage >= 75) return { emoji: '🎉', msg: 'Great job! You did awesome!', color: '#60a5fa' };
    if (percentage >= 60) return { emoji: '👍', msg: 'Good work! Keep practicing!', color: '#34d399' };
    return { emoji: '💪', msg: 'Nice try! You\'re getting better!', color: '#a78bfa' };
  };

  return (
    <div>
      <Header />
      <div className="gonogo-container">
        <div className="gonogo-screen">

          {/* INTRO SAMPLE EXAMPLE */}
          {gameState === 'intro' && (
            <div className="gonogo-card">
              <div className="gonogo-title-section">
                <span className="gonogo-game-icon">🚦</span>
                <h2 className="gonogo-game-title">Green Light, Red Light!</h2>
                <p className="gonogo-game-subtitle">Let's see how fast and focused you are.</p>
              </div>
              <div className="gonogo-instructions">
                <h3>📘 Sample Example</h3>
                <p>👉 When <span style={{ color: 'green', fontWeight: 'bold' }}>Green</span> appears — TAP the button quickly!</p>
                <p>✋ When <span style={{ color: 'red', fontWeight: 'bold' }}>Red</span> appears — DO NOT tap!</p>
                <p>⚡ You’ll get a short practice first, then the real test starts.</p>
              </div>
              <button onClick={startPractice} className="gonogo-btn gonogo-start-btn">
                🧪 Try Sample Practice
              </button>
            </div>
          )}

          {/* PRACTICE MODE */}
          {gameState === 'practice' && (
            <div className="gonogo-card">
              <h2 className="gonogo-practice-title">Practice Round {round + 1} of {PRACTICE_ROUNDS}</h2>
              <p className="gonogo-practice-subtitle">(This won’t affect your score)</p>
              <div className="gonogo-signal-container">
                {signal === 'Go' && <div className="gonogo-signal gonogo-go-signal"><span>😊</span></div>}
                {signal === 'No-Go' && <div className="gonogo-signal gonogo-nogo-signal"><span>✋</span></div>}
                {signal === 'Wait' && <div className="gonogo-signal gonogo-wait-signal"><span>👀</span></div>}
              </div>
              <button
                onClick={handleResponse}
                className="gonogo-btn gonogo-react-btn"
                disabled={signal === 'Wait'}
              >
                👆 TAP HERE
              </button>
            </div>
          )}

          {/* IDLE SCREEN (AFTER PRACTICE) */}
          {gameState === 'idle' && (
            <div className="gonogo-card">
              <h2>🚀 Ready for the Real Test?</h2>
              <p>You’ve seen how it works. Now let’s do it for real!</p>
              <button onClick={startGame} className="gonogo-btn gonogo-start-btn">
                🎮 Start Real Test
              </button>
            </div>
          )}

          {/* GAME SCREEN */}
          {gameState === 'running' && (
            <div className="gonogo-card">
              <div className="gonogo-progress-section">
                <span className="gonogo-round-text">Round {round + 1} of {TOTAL_ROUNDS}</span>
                <div className="gonogo-progress-bar">
                  <div
                    className="gonogo-progress-fill"
                    style={{ width: `${((round + 1) / TOTAL_ROUNDS) * 100}%` }}
                  />
                </div>
              </div>
              <div className="gonogo-signal-container">
                {signal === 'Go' && <div className="gonogo-signal gonogo-go-signal"><span>😊</span></div>}
                {signal === 'No-Go' && <div className="gonogo-signal gonogo-nogo-signal"><span>✋</span></div>}
                {signal === 'Wait' && <div className="gonogo-signal gonogo-wait-signal"><span>👀</span></div>}
              </div>
              <button
                onClick={handleResponse}
                className="gonogo-btn gonogo-react-btn"
                disabled={signal === 'Wait'}
              >
                👆 TAP HERE
              </button>
            </div>
          )}

          {/* FINISHED SCREEN */}
          {gameState === 'finished' && (
            <div className="gonogo-card">
              <div className="gonogo-celebration-header">
                <span className="gonogo-celebration-emoji">{getPerformanceMessage().emoji}</span>
                <h2 className="gonogo-celebration-title" style={{ color: getPerformanceMessage().color }}>
                  {getPerformanceMessage().msg}
                </h2>
              </div>

              <div className="gonogo-results-grid">
                <div className="gonogo-result-card gonogo-green-card">✅ Hits: {score.hits}</div>
                <div className="gonogo-result-card gonogo-blue-card">🛑 Correct Rejections: {score.correctRejections}</div>
                <div className="gonogo-result-card gonogo-orange-card">😴 Misses: {score.misses}</div>
                <div className="gonogo-result-card gonogo-red-card">⚠️ False Alarms: {score.falseAlarms}</div>
              </div>

              {avgReactionTime > 0 && (
                <div className="gonogo-speed-badge">
                  ⚡ Your Speed: {avgReactionTime} ms
                </div>
              )}

              <button
                disabled={isSaving}
                onClick={() => saveResultsToBackend({ goNoGo: { ...score, avgReactionTime } })}
                className="gonogo-btn gonogo-save-btn"
              >
                {isSaving ? 'Saving...' : '💾 Save Results'}
              </button>

              {saveMessage && <p>{saveMessage}</p>}

              <button onClick={() => setGameState('intro')} className="gonogo-btn gonogo-play-again-btn">
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
