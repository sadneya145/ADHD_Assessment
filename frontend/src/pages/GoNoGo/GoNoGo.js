'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import './GoNoGo.css';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import { useNavigate } from 'react-router-dom';

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
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const signalStartTime = useRef(0);
  const userResponded = useRef(false);
  const gameLoopTimeout = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    return () => {
      if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'auto';
    };
  }, []);

  const endRound = useCallback(() => {
    if (signal === 'Go' && !userResponded.current) setScore(s => ({ ...s, misses: s.misses + 1 }));
    if (signal === 'No-Go' && !userResponded.current) setScore(s => ({ ...s, correctRejections: s.correctRejections + 1 }));

    setSignal('Wait');
    userResponded.current = false;

    if (round + 1 >= TOTAL_ROUNDS) setGameState('finished');
    else setRound(r => r + 1);
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
    setSaveMessage('');
  };

  const avgReactionTime = reactionTimes.length > 0
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
        setTimeout(() => navigate('/results'), 1000);
      } else setSaveMessage(`❌ Error: ${data.error || 'Failed to save'}`);
    } catch (error) {
      setSaveMessage(`❌ Network error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (gameState === 'finished') {
      const testData = {
        goNoGo: { ...score, avgReactionTime }
      };
      saveResultsToBackend(testData);
    }
  }, [gameState]);

  const renderSignal = () => {
    if (signal === 'Go') return <div className="signal go">▶</div>;
    if (signal === 'No-Go') return <div className="signal no-go">✖</div>;
    return <div className="signal wait">⏸</div>;
  };

  return (
    <div>
      <Header />
      <div className="screen">
        {gameState === 'idle' && (
          <div className="card">
            <h2>Go/No-Go Task Instructions</h2>
            <p>Click "React" for green signals. Do nothing for red signals.</p>
            <button onClick={startGame} className="btn start">Start Game</button>
          </div>
        )}
        {gameState === 'running' && (
          <div className="card">
            <p>Round {round + 1} of {TOTAL_ROUNDS}</p>
            {renderSignal()}
            <button onClick={handleResponse} className="btn react">React</button>
          </div>
        )}
        {gameState === 'finished' && (
          <div className="card">
            <h2>Results</h2>
            <p>Hits: {score.hits}</p>
            <p>Misses: {score.misses}</p>
            <p>False Alarms: {score.falseAlarms}</p>
            <p>Correct Rejections: {score.correctRejections}</p>
            <p>Avg. Reaction Time: {avgReactionTime} ms</p>
            <button disabled={isSaving} onClick={() => saveResultsToBackend({ goNoGo: { ...score, avgReactionTime } })}>
              {isSaving ? 'Saving...' : 'Save Results'}
            </button>
            {saveMessage && <p>{saveMessage}</p>}
            <button onClick={startGame}>Play Again</button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
