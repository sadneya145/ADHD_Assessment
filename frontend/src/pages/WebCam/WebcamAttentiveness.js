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

  // ------------------- Render -------------------
  const renderGame = () => {
    if (taskType === 'goNoGo') {
      if (gameState === 'idle') return <button onClick={startGame}>Start Go/No-Go</button>;
      if (gameState === 'running') return (
        <>
          <p>Round {currentRound + 1} of {GO_TOTAL_ROUNDS}</p>
          <div>{signal}</div>
          <button onClick={goHandleResponse}>React</button>
        </>
      );
      if (gameState === 'finished') return <p>Finished! Saving...</p>;
    } else if (taskType === 'nBack') {
      if (gameState === 'idle') return (
        <>
          <label>N = {nBack}</label>
          <input type="range" min="1" max="5" value={nBack} onChange={e => setNBack(parseInt(e.target.value))} />
          <button onClick={startGame}>Start N-Back</button>
        </>
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
    <div>
      <Header />
      <video ref={videoRef} autoPlay muted width={320} height={240} />
      <div className="game-container">{renderGame()}</div>
      {apiMessage && <p>{apiMessage}</p>}
      <Footer />
    </div>
  );
}
