'use client';

import React, {useState, useEffect, useCallback, useRef} from 'react';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import './Nback.css';
import { useNavigate } from "react-router-dom";

export default function NBackTask() {
  const STIMULI_SET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const TOTAL_ROUNDS = 20;
  const STIMULUS_DURATION = 1500;
  const INTER_STIMULUS_INTERVAL = 500;

  const [gameState, setGameState] = useState('settings');
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
  const [loading, setLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState(null);

  const timerRef = useRef(null);

  const navigate = useNavigate();
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in window.history)
      window.history.scrollRestoration = 'manual';
    return () => {
      if ('scrollRestoration' in window.history)
        window.history.scrollRestoration = 'auto';
    };
  }, []);

  // Generate N-Back sequence
  const generateSequence = useCallback(() => {
    const newSequence = [];
    for (let i = 0; i < TOTAL_ROUNDS + nBack; i++) {
      const shouldMatch = i >= nBack && Math.random() < 0.3;
      if (shouldMatch) newSequence.push(newSequence[i - nBack]);
      else {
        let randomStimulus =
          STIMULI_SET[Math.floor(Math.random() * STIMULI_SET.length)];
        if (i >= nBack && randomStimulus === newSequence[i - nBack])
          randomStimulus =
            STIMULI_SET[
              (STIMULI_SET.indexOf(randomStimulus) + 1) % STIMULI_SET.length
            ];
        newSequence.push(randomStimulus);
      }
    }
    setSequence(newSequence);
  }, [nBack]);

  // Move to next stimulus
  const nextStimulus = useCallback(() => {
    if (currentIndex >= nBack - 1 && currentIndex < TOTAL_ROUNDS + nBack - 1) {
      const isTarget =
        sequence[currentIndex + 1] === sequence[currentIndex + 1 - nBack];
      if (!responded && isTarget) setScore(s => ({...s, misses: s.misses + 1}));
    }
    setResponded(false);

    if (currentIndex < TOTAL_ROUNDS + nBack - 1)
      setCurrentIndex(prev => prev + 1);
    else setGameState('finished');
  }, [currentIndex, nBack, responded, sequence]);

  // Stimulus timer
  useEffect(() => {
    if (gameState === 'running') {
      timerRef.current = setTimeout(
        nextStimulus,
        STIMULUS_DURATION + INTER_STIMULUS_INTERVAL
      );
    }
    return () => clearTimeout(timerRef.current);
  }, [gameState, currentIndex, nextStimulus]);

  // Handle user response
  const handleResponse = () => {
    if (responded) return;
    setResponded(true);

    const isTarget = sequence[currentIndex] === sequence[currentIndex - nBack];
    if (isTarget) setScore(s => ({...s, hits: s.hits + 1}));
    else setScore(s => ({...s, falseAlarms: s.falseAlarms + 1}));
  };

  // Correct rejection check
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (gameState === 'running' && currentIndex >= nBack) {
        const isTarget =
          sequence[currentIndex] === sequence[currentIndex - nBack];
        if (!isTarget && !responded)
          setScore(s => ({...s, correctRejections: s.correctRejections + 1}));
      }
    }, STIMULUS_DURATION);
    return () => clearTimeout(timeoutId);
  }, [currentIndex, gameState, nBack, responded, sequence]);

  // Start game
  const startGame = () => {
    generateSequence();
    setCurrentIndex(0);
    setScore({hits: 0, misses: 0, falseAlarms: 0, correctRejections: 0});
    setApiMessage(null);
    setGameState('running');
  };

// In your submitResultsToBackend, keep the same structure:
const submitResultsToBackend = async () => {
  const totalTargets = score.hits + score.misses;
  const accuracy = totalTargets > 0 ? (score.hits / totalTargets) * 100 : 0;

  const payload = {
    nBack: {
      nLevel: nBack,
      hits: score.hits,
      misses: score.misses,
      falseAlarms: score.falseAlarms,
      correctRejections: score.correctRejections,
      accuracy: accuracy.toFixed(1),
    },
  };

  try {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No auth token found');

    const res = await fetch('https://adhd-assessment-backend.onrender.com/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) setTimeout(() => navigate('/results'), 1000);
    else setApiMessage(`❌ Error: ${data.error || 'Failed to save'}`);
  } catch (error) {
    setApiMessage(`❌ Network error: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  if (gameState === 'finished') submitResultsToBackend();
}, [gameState]);


  // ================= UI =================
  if (gameState === 'settings') {
    return (
      <div>
        <Header />
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
              onChange={e => setNBack(parseInt(e.target.value))}
            />
          </div>
          <button onClick={startGame}>Start Game (N={nBack})</button>
        </div>
        <Footer />
      </div>
    );
  }

  if (gameState === 'finished') {
    const totalTargets = score.hits + score.misses;
    const accuracy =
      totalTargets > 0 ? ((score.hits / totalTargets) * 100).toFixed(1) : 0;

    return (
      <div>
        <Header />
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
          <button disabled={loading} onClick={submitResultsToBackend}>
            {loading ? 'Saving...' : 'Save Results'}
          </button>
          {apiMessage && <p>{apiMessage}</p>}
          <button onClick={() => setGameState('settings')}>Play Again</button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Header />
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
      <Footer />
    </div>
  );
}
