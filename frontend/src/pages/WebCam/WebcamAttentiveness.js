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
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setVideoStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
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
    return canvas.toDataURL('image/jpeg');
  };

  const sendFrameForPrediction = async (frame, taskData) => {
    try {
      const payload = { frame, taskData };
      const res = await fetch('https://adhd-assessment-backend.onrender.com/predict', {
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

  const goEndRound = useCallback(() => {
    if (signal === 'Go' && !userResponded.current) setScore(s => ({ ...s, misses: s.misses + 1 }));
    if (signal === 'No-Go' && !userResponded.current) setScore(s => ({ ...s, correctRejections: s.correctRejections + 1 }));

    setSignal('Wait');
    userResponded.current = false;

    if (currentRound + 1 >= GO_TOTAL_ROUNDS) setGameState('finished');
    else setCurrentRound(r => r + 1);
  }, [currentRound, signal]);

  useEffect(() => {
    if (taskType === 'goNoGo' && gameState === 'running' && currentRound < GO_TOTAL_ROUNDS) {
      const waitTime = Math.random() * (GO_MAX_WAIT - GO_MIN_WAIT) + GO_MIN_WAIT;
      gameLoopTimeout.current = setTimeout(async () => {
        const newSignal = Math.random() < GO_PROBABILITY ? 'Go' : 'No-Go';
        setSignal(newSignal);
        signalStartTime.current = Date.now();
        userResponded.current = false;

        const frame = captureFrame();
        const taskData = { signal: newSignal, round: currentRound };
        const pred = await sendFrameForPrediction(frame, taskData);
        console.log("Go/No-Go prediction:", pred);

        gameLoopTimeout.current = setTimeout(goEndRound, GO_SIGNAL_DURATION);
      }, waitTime);
    }
    return () => { if (gameLoopTimeout.current) clearTimeout(gameLoopTimeout.current); };
  }, [gameState, currentRound, goEndRound, taskType]);

  const goHandleResponse = () => {
    if (signal === 'Wait' || userResponded.current) return;
    userResponded.current = true;
    const rt = Date.now() - signalStartTime.current;
    if (signal === 'Go') setScore(s => ({ ...s, hits: s.hits + 1 }));
    if (signal === 'No-Go') setScore(s => ({ ...s, falseAlarms: s.falseAlarms + 1 }));
    setReactionTimes(rts => [...rts, rt]);
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
      if (!responded && isTarget) setScore(s => ({ ...s, misses: s.misses + 1 }));
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
    if (isTarget) setScore(s => ({ ...s, hits: s.hits + 1 }));
    else setScore(s => ({ ...s, falseAlarms: s.falseAlarms + 1 }));
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
    setScore({ hits: 0, misses: 0, falseAlarms: 0, correctRejections: 0, errors: 0 });
    setReactionTimes([]);
    setCurrentRound(0);
    setCurrentIndex(0);
    setStroopRound(0);
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

  // ------------------- Get Task Info -------------------
  const getTaskInfo = () => {
    if (taskType === 'goNoGo') {
      return {
        title: "Quick Reactions Game",
        emoji: "🎯",
        description: "Click fast when you see 'Go!' but wait when you see 'No-Go!'",
        instruction: "Get ready to test your super quick reflexes!"
      };
    } else if (taskType === 'nBack') {
      return {
        title: "Memory Challenge",
        emoji: "🧠",
        description: "Remember the letters and match them!",
        instruction: "Can you remember what you saw a few steps ago?"
      };
    } else if (taskType === 'stroop') {
      return {
        title: "Color Detective",
        emoji: "🎨",
        description: "Pick the COLOR of the word, not what it says!",
        instruction: "This one's tricky - focus on the colors!"
      };
    }
  };

  const taskInfo = getTaskInfo();

  // ------------------- Render -------------------
  const renderGame = () => {
    if (taskType === 'goNoGo') {
      if (gameState === 'idle') {
        return (
          <div className="game-start">
            <div className="game-instructions">
              <h3>How to Play:</h3>
              <div className="instruction-item">
                <span className="instruction-emoji">✅</span>
                <p>When you see <strong className="go-text">GO</strong>, click the button FAST!</p>
              </div>
              <div className="instruction-item">
                <span className="instruction-emoji">⛔</span>
                <p>When you see <strong className="no-go-text">NO-GO</strong>, DON'T click anything!</p>
              </div>
              <div className="instruction-item">
                <span className="instruction-emoji">👀</span>
                <p>Stay focused and be ready!</p>
              </div>
            </div>
            <button className="btn-start" onClick={startGame} disabled={!cameraReady}>
              <span className="btn-emoji">🚀</span>
              {cameraReady ? "Let's Play!" : "Waiting for camera..."}
            </button>
          </div>
        );
      }
      if (gameState === 'running') {
        const progress = ((currentRound + 1) / GO_TOTAL_ROUNDS) * 100;
        return (
          <div className="game-play">
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="progress-text">Round {currentRound + 1} of {GO_TOTAL_ROUNDS}</p>
            </div>
            <div className={`signal-display ${signal.toLowerCase()}`}>
              {signal === 'Go' && <span className="signal-emoji">✅</span>}
              {signal === 'No-Go' && <span className="signal-emoji">⛔</span>}
              {signal === 'Wait' && <span className="signal-emoji">⏳</span>}
              <span className="signal-text">{signal}</span>
            </div>
            <button 
              className={`btn-action ${signal === 'Go' ? 'pulse' : ''}`}
              onClick={goHandleResponse}
              disabled={signal === 'Wait'}
            >
              <span className="btn-emoji">👆</span>
              CLICK!
            </button>
          </div>
        );
      }
      if (gameState === 'finished') {
        return (
          <div className="game-finished">
            <div className="finish-emoji">🎉</div>
            <h3>Awesome Job!</h3>
            <p className="loading-text">Saving your results...</p>
            <div className="spinner"></div>
          </div>
        );
      }
    } else if (taskType === 'nBack') {
      if (gameState === 'idle') {
        return (
          <div className="game-start">
            <div className="game-instructions">
              <h3>How to Play:</h3>
              <div className="instruction-item">
                <span className="instruction-emoji">👀</span>
                <p>Watch the letters appear on screen</p>
              </div>
              <div className="instruction-item">
                <span className="instruction-emoji">🧠</span>
                <p>Remember the letter from {nBack} steps ago</p>
              </div>
              <div className="instruction-item">
                <span className="instruction-emoji">✨</span>
                <p>Click "Match!" if it's the same letter</p>
              </div>
              <div className="difficulty-selector">
                <label className="difficulty-label">
                  <span className="label-emoji">⚡</span>
                  Difficulty Level: {nBack}
                </label>
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  value={nBack} 
                  onChange={e => setNBack(parseInt(e.target.value))}
                  className="difficulty-slider"
                />
                <div className="difficulty-labels">
                  <span>Easy</span>
                  <span>Hard</span>
                </div>
              </div>
            </div>
            <button className="btn-start" onClick={startGame} disabled={!cameraReady}>
              <span className="btn-emoji">🚀</span>
              {cameraReady ? "Start Challenge!" : "Waiting for camera..."}
            </button>
          </div>
        );
      }
      if (gameState === 'running') {
        const progress = (Math.max(0, currentIndex - nBack + 1) / N_TOTAL_ROUNDS) * 100;
        const displayLetter = currentIndex >= nBack ? sequence[currentIndex] : "Get Ready...";
        return (
          <div className="game-play">
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="progress-text">Round {Math.max(0, currentIndex - nBack + 1)} of {N_TOTAL_ROUNDS}</p>
            </div>
            <div className="nback-display">
              <div className="nback-letter">{displayLetter}</div>
            </div>
            <button className="btn-action" onClick={nHandleResponse} disabled={currentIndex < nBack}>
              <span className="btn-emoji">✨</span>
              Match!
            </button>
          </div>
        );
      }
      if (gameState === 'finished') {
        return (
          <div className="game-finished">
            <div className="finish-emoji">🌟</div>
            <h3>Great Memory!</h3>
            <p className="loading-text">Saving your results...</p>
            <div className="spinner"></div>
          </div>
        );
      }
    } else if (taskType === 'stroop') {
      if (gameState === 'idle') {
        return (
          <div className="game-start">
            <div className="game-instructions">
              <h3>How to Play:</h3>
              <div className="instruction-item">
                <span className="instruction-emoji">🎨</span>
                <p>You'll see a word in color</p>
              </div>
              <div className="instruction-item">
                <span className="instruction-emoji">🤔</span>
                <p>Click the button that matches the COLOR (not the word!)</p>
              </div>
              <div className="instruction-item">
                <span className="instruction-emoji">💡</span>
                <p>Example: If you see <span style={{color: '#FF0000'}}>BLUE</span>, click RED!</p>
              </div>
            </div>
            <button className="btn-start" onClick={startGame} disabled={!cameraReady}>
              <span className="btn-emoji">🚀</span>
              {cameraReady ? "I'm Ready!" : "Waiting for camera..."}
            </button>
          </div>
        );
      }
      if (gameState === 'running') {
        const progress = ((stroopRound + 1) / STROOP_TOTAL_ROUNDS) * 100;
        return (
          <div className="game-play">
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="progress-text">Round {stroopRound + 1} of {STROOP_TOTAL_ROUNDS}</p>
            </div>
            <div className="stroop-display">
              <p className="stroop-hint">Pick the COLOR of this word:</p>
              <div className="stroop-word" style={{ color: stroopWord?.color }}>
                {stroopWord?.text}
              </div>
            </div>
            <div className="stroop-buttons">
              {STROOP_COLORS.map(c => (
                <button 
                  key={c.name} 
                  className="stroop-color-btn"
                  style={{ backgroundColor: c.hex }} 
                  onClick={() => stroopHandleResponse(c.hex)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        );
      }
      if (gameState === 'finished') {
        return (
          <div className="game-finished">
            <div className="finish-emoji">🎨</div>
            <h3>Color Master!</h3>
            <p className="loading-text">Saving your results...</p>
            <div className="spinner"></div>
          </div>
        );
      }
    }
  };

  return (
    <div className="webcam-page">
      <Header />
      
      <main className="webcam-main">
        <div className="game-header">
          <div className="game-title-section">
            <span className="game-emoji">{taskInfo.emoji}</span>
            <h1 className="game-title">{taskInfo.title}</h1>
          </div>
          <p className="game-description">{taskInfo.description}</p>
          <p className="game-instruction">{taskInfo.instruction}</p>
        </div>

        <div className="video-section">
          <div className="video-box">
            <video 
              ref={videoRef} 
              autoPlay 
              muted 
              className={`video ${!cameraReady ? 'hidden' : ''}`}
            />
            {!cameraReady && (
              <div className="video-placeholder">
                <span className="placeholder-emoji">📹</span>
                <p>Connecting to camera...</p>
              </div>
            )}
          </div>
          <p className="camera-notice">
            <span className="notice-emoji">👀</span>
            Make sure you're looking at the screen so we can track your attention!
          </p>
        </div>

        <div className="game-container">
          {renderGame()}
        </div>

        {apiMessage && (
          <div className="api-message">
            {apiMessage}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}