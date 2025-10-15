'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import './WebcamAttentiveness.css';

// ------------------- Constants -------------------
const GO_TOTAL_ROUNDS = 20;
const GO_PROBABILITY = 0.7;
const GO_SIGNAL_DURATION = 800;
const GO_MIN_WAIT = 500;
const GO_MAX_WAIT = 1500;

const N_TOTAL_ROUNDS = 20;
const N_STIMULI_SET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const N_STIMULUS_DURATION = 1500;
const N_INTERVAL = 500;

const STROOP_TOTAL_ROUNDS = 10;
const STROOP_COLORS = [
  { name: 'RED', hex: '#FF0000' },
  { name: 'BLUE', hex: '#3399FF' },
  { name: 'GREEN', hex: '#00C851' },
  { name: 'YELLOW', hex: '#FFD600' },
];

// ------------------- Component -------------------
export default function ADHDTasks({ taskType = 'goNoGo' }) {
  const navigate = useNavigate();

  // ------------------- Video Stream -------------------
  const [videoStream, setVideoStream] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setVideoStream(stream);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Webcam access error: ", err);
      }
    };
    startVideo();

    return () => {
      if (videoStream) videoStream.getTracks().forEach(track => track.stop());
    };
  }, []);

  const captureFrame = () => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg'); // base64
  };

  const sendFrameForPrediction = async (frame, taskData) => {
    try {
      const payload = { frame, taskData };
      const res = await fetch('https://adhd-assessment-video-analysis.onrender.com/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      console.error("Prediction error:", err);
      return null;
    }
  };

  // ------------------- Shared State -------------------
  const [gameState, setGameState] = useState('idle');
  const [score, setScore] = useState({});
  const [reactionTimes, setReactionTimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState('');

  // ============ GO/NO-GO =====================
  const [currentRound, setCurrentRound] = useState(0);
  const [signal, setSignal] = useState('Wait');
  const signalStartTime = useRef(0);
  const userResponded = useRef(false);
  const gameLoopTimeout = useRef(null);

  // Initialize score with all required properties
  const initializeScore = () => ({
    hits: 0,
    misses: 0,
    falseAlarms: 0,
    correctRejections: 0,
    errors: 0
  });

  const goEndRound = useCallback(() => {
    console.log('Ending round:', currentRound + 1, 'Signal:', signal, 'Responded:', userResponded.current);
    
    // Safe score updates with fallbacks
    if (signal === 'Go' && !userResponded.current) {
      setScore(s => ({ ...s, misses: (s.misses || 0) + 1 }));
      console.log('Missed Go signal');
    }
    if (signal === 'No-Go' && !userResponded.current) {
      setScore(s => ({ ...s, correctRejections: (s.correctRejections || 0) + 1 }));
      console.log('Correctly rejected No-Go');
    }

    setSignal('Wait');
    userResponded.current = false;

    // Move to next round or finish
    if (currentRound + 1 >= GO_TOTAL_ROUNDS) {
      console.log('Game finished! Total rounds completed');
      setGameState('finished');
    } else {
      console.log('Moving to next round:', currentRound + 2);
      setCurrentRound(r => r + 1);
    }
  }, [currentRound, signal]);

  // Main game loop - FIXED VERSION
  useEffect(() => {
    if (taskType === 'goNoGo' && gameState === 'running' && currentRound < GO_TOTAL_ROUNDS) {
      console.log('🔄 Starting round:', currentRound + 1);
      
      const waitTime = Math.random() * (GO_MAX_WAIT - GO_MIN_WAIT) + GO_MIN_WAIT;
      console.log('Wait time:', waitTime);
      
      gameLoopTimeout.current = setTimeout(async () => {
        const newSignal = Math.random() < GO_PROBABILITY ? 'Go' : 'No-Go';
        console.log('🎯 Showing signal:', newSignal, 'in round', currentRound + 1);
        
        setSignal(newSignal);
        signalStartTime.current = Date.now();
        userResponded.current = false;

        // Capture frame for analysis
        try {
          const frame = captureFrame();
          const taskData = { signal: newSignal, round: currentRound };
          if (frame) {
            const pred = await sendFrameForPrediction(frame, taskData);
            console.log("Go/No-Go prediction:", pred);
          }
        } catch (err) {
          console.error("Frame capture error:", err);
        }

        // Schedule end of this signal
        gameLoopTimeout.current = setTimeout(() => {
          console.log('⏰ Auto-ending round', currentRound + 1);
          goEndRound();
        }, GO_SIGNAL_DURATION);
      }, waitTime);
    }

    return () => {
      if (gameLoopTimeout.current) {
        clearTimeout(gameLoopTimeout.current);
        gameLoopTimeout.current = null;
      }
    };
  }, [gameState, currentRound, goEndRound, taskType]);

  const goHandleResponse = () => {
    if (signal === 'Wait' || userResponded.current) {
      console.log('❌ Response ignored - signal:', signal, 'already responded:', userResponded.current);
      return;
    }
    
    userResponded.current = true;
    const rt = Date.now() - signalStartTime.current;
    console.log('✅ Response recorded - signal:', signal, 'RT:', rt, 'ms');
    
    // Safe score updates
    if (signal === 'Go') {
      setScore(s => ({ ...s, hits: (s.hits || 0) + 1 }));
      console.log('Hit recorded');
    } else if (signal === 'No-Go') {
      setScore(s => ({ ...s, falseAlarms: (s.falseAlarms || 0) + 1 }));
      console.log('False alarm recorded');
    }
    
    setReactionTimes(rts => [...rts, rt]);
    
    // Clear the timeout and end round immediately
    if (gameLoopTimeout.current) {
      clearTimeout(gameLoopTimeout.current);
      gameLoopTimeout.current = null;
    }
    
    // Short delay to ensure state updates before next round
    setTimeout(goEndRound, 50);
  };

  // ============ N-BACK =====================
  const [nBack, setNBack] = useState(2);
  const [sequence, setSequence] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responded, setResponded] = useState(false);
  const timerRef = useRef(null);

  const generateSequence = useCallback(() => {
    const newSeq = [];
    for (let i = 0; i < N_TOTAL_ROUNDS + nBack; i++) {
      const shouldMatch = i >= nBack && Math.random() < 0.3;
      if (shouldMatch) newSeq.push(newSeq[i - nBack]);
      else {
        let stim = N_STIMULI_SET[Math.floor(Math.random() * N_STIMULI_SET.length)];
        if (i >= nBack && stim === newSeq[i - nBack])
          stim = N_STIMULI_SET[(N_STIMULI_SET.indexOf(stim) + 1) % N_STIMULI_SET.length];
        newSeq.push(stim);
      }
    }
    setSequence(newSeq);
  }, [nBack]);

  const nNextStimulus = useCallback(() => {
    if (currentIndex >= nBack && currentIndex < N_TOTAL_ROUNDS + nBack - 1) {
      const isTarget = sequence[currentIndex + 1] === sequence[currentIndex + 1 - nBack];
      if (!responded && isTarget) setScore(s => ({ ...s, misses: (s.misses || 0) + 1 }));
    }
    setResponded(false);
    if (currentIndex < N_TOTAL_ROUNDS + nBack - 1) setCurrentIndex(prev => prev + 1);
    else setGameState('finished');
  }, [currentIndex, nBack, responded, sequence]);

  useEffect(() => {
    if (taskType === 'nBack' && gameState === 'running') {
      timerRef.current = setTimeout(async () => {
        const frame = captureFrame();
        const taskData = { currentStimulus: sequence[currentIndex], nBack, score };
        const pred = await sendFrameForPrediction(frame, taskData);
        console.log("N-Back prediction:", pred);
        nNextStimulus();
      }, N_STIMULUS_DURATION + N_INTERVAL);
    }
    return () => clearTimeout(timerRef.current);
  }, [taskType, currentIndex, gameState, nNextStimulus, sequence, nBack, score]);

  const nHandleResponse = () => {
    if (responded) return;
    setResponded(true);
    const isTarget = sequence[currentIndex] === sequence[currentIndex - nBack];
    if (isTarget) setScore(s => ({ ...s, hits: (s.hits || 0) + 1 }));
    else setScore(s => ({ ...s, falseAlarms: (s.falseAlarms || 0) + 1 }));
  };

  // ============ STROOP =====================
  const [stroopRound, setStroopRound] = useState(0);
  const [stroopWord, setStroopWord] = useState(null);
  const [stroopStartTime, setStroopStartTime] = useState(0);

  const generateStroopWord = useCallback(() => {
    const color = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
    let word = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
    while (word.name === color.name) {
      word = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
    }
    setStroopWord({ text: word.name, color: color.hex });
    setStroopStartTime(Date.now());
  }, []);

  useEffect(() => {
    if (taskType === 'stroop' && gameState === 'running' && stroopRound < STROOP_TOTAL_ROUNDS) {
      generateStroopWord();
    }
  }, [gameState, stroopRound, generateStroopWord, taskType]);

  const stroopHandleResponse = async (selectedColorHex) => {
    const rt = Date.now() - stroopStartTime;
    setReactionTimes(prev => [...prev, rt]);
    if (selectedColorHex === stroopWord.color) setScore(s => ({ ...s, hits: (s.hits || 0) + 1 }));
    else setScore(s => ({ ...s, errors: (s.errors || 0) + 1 }));

    const frame = captureFrame();
    const taskData = { word: stroopWord.text, color: stroopWord.color, response: selectedColorHex, rt };
    await sendFrameForPrediction(frame, taskData);

    if (stroopRound + 1 >= STROOP_TOTAL_ROUNDS) setGameState('finished');
    else setStroopRound(r => r + 1);
  };

  // ------------------- Start Game -------------------
  const startGame = () => {
    console.log('🚀 Starting game...');
    setScore(initializeScore());
    setReactionTimes([]);
    setCurrentRound(0);
    setCurrentIndex(0);
    setStroopRound(0);
    setSignal('Wait');
    userResponded.current = false;
    setGameState('running');

    if (taskType === 'nBack') generateSequence();
  };

  // ------------------- Submit Results -------------------
  const submitResults = async (taskData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token found');

      const res = await fetch('https://adhd-assessment-backend.onrender.com/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(taskData),
      });

      const data = await res.json();
      if (res.ok) setTimeout(() => navigate('/results'), 1000);
      else setApiMessage(`❌ Error: ${data.error || 'Failed to save'}`);
    } catch (err) {
      setApiMessage(`❌ Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gameState === 'finished') {
      const avgRT = reactionTimes.length > 0 ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) : 0;
      let taskData;
      if (taskType === 'goNoGo') taskData = { goNoGo: { ...score, avgReactionTime: avgRT } };
      else if (taskType === 'nBack') taskData = { nBack: { ...score, nLevel: nBack } };
      else if (taskType === 'stroop') taskData = { stroop: { ...score, avgReactionTime: avgRT } };
      submitResults(taskData);
    }
  }, [gameState]);

  // Add debugging useEffect
  useEffect(() => {
    console.log('📊 State Update - GameState:', gameState, 'Round:', currentRound + 1, 'Signal:', signal, 'Score:', score);
  }, [gameState, currentRound, signal, score]);

  useEffect(() => {
    console.log('🎮 Game Loop Effect Triggered - taskType:', taskType, 'gameState:', gameState, 'currentRound:', currentRound);
  }, [taskType, gameState, currentRound]);

  // ------------------- Render -------------------
  const renderGame = () => {
    if (taskType === 'goNoGo') {
      if (gameState === 'idle') return (
        <div className="game-start-container">
          <button className="start-button" onClick={startGame}>
            Start Go/No-Go
          </button>
          <p className="game-instructions">
            Click when you see <span style={{color: 'green', fontWeight: 'bold'}}>"Go"</span>, 
            don't click for <span style={{color: 'red', fontWeight: 'bold'}}>"No-Go"</span>
          </p>
        </div>
      );
      if (gameState === 'running') return (
        <div className="game-running-container">
          <p className="round-counter">Round {currentRound + 1} of {GO_TOTAL_ROUNDS}</p>
          <div 
            className={`signal ${signal.toLowerCase()}`}
            style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              color: signal === 'Go' ? 'green' : signal === 'No-Go' ? 'red' : 'gray',
              margin: '2rem 0',
              padding: '1rem',
              border: `3px solid ${signal === 'Go' ? 'green' : signal === 'No-Go' ? 'red' : 'gray'}`,
              borderRadius: '10px',
              backgroundColor: signal === 'Wait' ? '#f0f0f0' : 'white'
            }}
          >
            {signal}
          </div>
          <button 
            className="react-button"
            onClick={goHandleResponse} 
            disabled={signal === 'Wait'}
            style={{ 
              marginTop: '20px', 
              padding: '15px 30px',
              fontSize: '1.2rem',
              backgroundColor: signal === 'Wait' ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: signal === 'Wait' ? 'not-allowed' : 'pointer'
            }}
          >
            React
          </button>
          <div className="score-display" style={{ marginTop: '20px', fontSize: '1rem' }}>
            <div>Hits: {score.hits || 0}</div>
            <div>Misses: {score.misses || 0}</div>
            <div>False Alarms: {score.falseAlarms || 0}</div>
            <div>Correct Rejections: {score.correctRejections || 0}</div>
          </div>
        </div>
      );
      if (gameState === 'finished') return (
        <div className="game-finished-container">
          <p className="finished-message">✅ Finished! Saving results...</p>
          <div className="final-score">
            <h3>Final Score:</h3>
            <div>Hits: {score.hits || 0}</div>
            <div>Misses: {score.misses || 0}</div>
            <div>False Alarms: {score.falseAlarms || 0}</div>
            <div>Correct Rejections: {score.correctRejections || 0}</div>
            <div>Average Reaction Time: {reactionTimes.length > 0 ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length) : 0}ms</div>
          </div>
        </div>
      );
    } else if (taskType === 'nBack') {
      if (gameState === 'idle') return (
        <div className="nback-config">
          <label>N = {nBack}</label>
          <input 
            type="range" 
            min="1" 
            max="5" 
            value={nBack} 
            onChange={e => setNBack(parseInt(e.target.value))} 
          />
          <button onClick={startGame}>Start N-Back</button>
        </div>
      );
      if (gameState === 'running') return (
        <>
          <p>Round {Math.max(0, currentIndex - nBack + 1)} of {N_TOTAL_ROUNDS}</p>
          <div>{currentIndex >= nBack ? sequence[currentIndex] : "Get Ready..."}</div>
          <button onClick={nHandleResponse}>Match</button>
        </>
      );
      if (gameState === 'finished') return <p>Finished! Saving...</p>;
    } else if (taskType === 'stroop') {
      if (gameState === 'idle') return <button onClick={startGame}>Start Stroop</button>;
      if (gameState === 'running') return (
        <>
          <p>Round {stroopRound + 1} of {STROOP_TOTAL_ROUNDS}</p>
          <div style={{ fontSize: '2rem', color: stroopWord?.color }}>{stroopWord?.text}</div>
          <div className="stroop-buttons">
            {STROOP_COLORS.map(c => (
              <button key={c.name} style={{ backgroundColor: c.hex }} onClick={() => stroopHandleResponse(c.hex)}>
                {c.name}
              </button>
            ))}
          </div>
        </>
      );
      if (gameState === 'finished') return <p>Finished! Saving...</p>;
    }
  };

  return (
    <div className="adhd-tasks-container">
      <Header />
      <div className="video-container">
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          width={320} 
          height={240}
          style={{ borderRadius: '10px', margin: '20px 0' }}
        />
      </div>
      <div className="game-container">
        {renderGame()}
      </div>
      {loading && <p className="loading-message">Saving your results...</p>}
      {apiMessage && <p className="api-message">{apiMessage}</p>}
      <Footer />
    </div>
  );
}
