'use client';

import React, {useState, useEffect, useCallback, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import Header from '../Header/Header';
import Footer from '../Footer/Footer';
import './WebcamAttentiveness.css';

// =================== CONSTANTS ===================
const GO_TOTAL_ROUNDS = 20;
const GO_PROBABILITY = 0.7;
const GO_SIGNAL_DURATION = 800;
const GO_MIN_WAIT = 500;
const GO_MAX_WAIT = 1500;

const N_TOTAL_ROUNDS = 20;
const N_STIMULI_SET = ['🐶', '🐱', '🐰', '🐸', '🦊', '🐻', '🐼', '🦁'];
const N_STIMULUS_DURATION = 1500;
const N_INTERVAL = 500;

const STROOP_TOTAL_ROUNDS = 10;
const STROOP_COLORS = [
  {name: 'RED', hex: '#FF0000'},
  {name: 'BLUE', hex: '#3399FF'},
  {name: 'GREEN', hex: '#00C851'},
  {name: 'YELLOW', hex: '#FFD600'},
];

// const FASTAPI_BASE_URL = 'http://localhost:10000';
const BACKEND_URL = 'https://adhd-assessment-backend.onrender.com';

export default function MultiGameAssessment() {
  const navigate = useNavigate();

  const [selectedGames, setSelectedGames] = useState([]);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [overallState, setOverallState] = useState('selection');
  const [allGameResults, setAllGameResults] = useState({});

  const [videoStream, setVideoStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const [gameState, setGameState] = useState('idle');
  const [score, setScore] = useState({});
  const [reactionTimes, setReactionTimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState('');

  const [currentRound, setCurrentRound] = useState(0);
  const [signal, setSignal] = useState('Wait');
  const signalStartTime = useRef(0);
  const userResponded = useRef(false);
  const gameLoopTimeout = useRef(null);

  const [nBack] = useState(2);
  const [sequence, setSequence] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responded, setResponded] = useState(false);
  const timerRef = useRef(null);

  const [stroopRound, setStroopRound] = useState(0);
  const [stroopWord, setStroopWord] = useState(null);
  const [stroopStartTime, setStroopStartTime] = useState(0);

  const availableGames = [
    {
      id: 'goNoGo',
      title: 'Quick Reactions Game',
      emoji: '🎯',
      description:
        "Click fast when you see 'Go!' but wait when you see 'No-Go!'",
      duration: '~4-6 min',
      color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      id: 'nBack',
      title: 'Memory Challenge',
      emoji: '🧠',
      description: 'Remember the animals and match them!',
      duration: '~5-8 min',
      color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      id: 'stroop',
      title: 'Color Detective',
      emoji: '🎨',
      description: 'Pick the COLOR of the word, not what it says!',
      duration: '~3-5 min',
      color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
  ];

  useEffect(() => {
    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: {ideal: 1280},
            height: {ideal: 720},
            facingMode: 'user',
          },
          audio: false,
        });
        setVideoStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
      } catch (err) {
        console.error('❌ Webcam access error:', err);
        alert('Please allow camera access to continue');
      }
    };
    startVideo();

    return () => {
      stopRecordingAndCleanup();
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = () => {
    if (!videoStream || isRecording) return;
    recordedChunksRef.current = [];

    try {
      let options = {mimeType: 'video/webm;codecs=vp9'};
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = {mimeType: 'video/webm;codecs=vp8'};
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = {mimeType: 'video/webm'};
        }
      }

      mediaRecorderRef.current = new MediaRecorder(videoStream, options);
      mediaRecorderRef.current.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current.start(100);
      setIsRecording(true);
      console.log('🎥 Recording started');
    } catch (err) {
      console.error('❌ Recording error:', err);
    }
  };

  const stopRecordingAndCleanup = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const stopRecording = () => {
    return new Promise(resolve => {
      if (
        !mediaRecorderRef.current ||
        mediaRecorderRef.current.state === 'inactive'
      ) {
        resolve(null);
        return;
      }
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {type: 'video/webm'});
        console.log(
          '🎥 Recording stopped, size:',
          (blob.size / 1024 / 1024).toFixed(2),
          'MB'
        );
        setIsRecording(false);
        resolve(blob);
      };
      mediaRecorderRef.current.stop();
    });
  };

  const toggleGameSelection = gameId => {
    setSelectedGames(prev =>
      prev.includes(gameId)
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    );
  };

  const startAllGames = () => {
    if (selectedGames.length === 0) {
      alert('Please select at least one game!');
      return;
    }
    console.log('🚀 Starting games:', selectedGames);
    setOverallState('playing');
    setCurrentGameIndex(0);
    startRecording();
    startCurrentGame(selectedGames[0]);
  };

  const initializeScore = () => ({
    hits: 0,
    misses: 0,
    falseAlarms: 0,
    correctRejections: 0,
  });

  const startCurrentGame = gameType => {
    console.log('▶️ Starting game:', gameType);
    setScore(initializeScore());
    setReactionTimes([]);
    setGameState('running');

    if (gameType === 'goNoGo') {
      setCurrentRound(0);
      setSignal('Wait');
      userResponded.current = false;
    } else if (gameType === 'nBack') {
      generateSequence();
      setCurrentIndex(0);
      setResponded(false);
    } else if (gameType === 'stroop') {
      setStroopRound(0);
      generateStroopWord();
    }
  };

  const goEndRound = useCallback(() => {
    if (signal === 'Go' && !userResponded.current) {
      setScore(s => ({...s, misses: (s.misses || 0) + 1}));
    }
    if (signal === 'No-Go' && !userResponded.current) {
      setScore(s => ({
        ...s,
        correctRejections: (s.correctRejections || 0) + 1,
      }));
    }

    setSignal('Wait');
    userResponded.current = false;

    if (currentRound + 1 >= GO_TOTAL_ROUNDS) {
      finishCurrentGame('goNoGo');
    } else {
      setCurrentRound(r => r + 1);
    }
  }, [currentRound, signal]);

  useEffect(() => {
    if (
      selectedGames[currentGameIndex] === 'goNoGo' &&
      gameState === 'running' &&
      currentRound < GO_TOTAL_ROUNDS
    ) {
      const waitTime =
        Math.random() * (GO_MAX_WAIT - GO_MIN_WAIT) + GO_MIN_WAIT;
      gameLoopTimeout.current = setTimeout(() => {
        const newSignal = Math.random() < GO_PROBABILITY ? 'Go' : 'No-Go';
        setSignal(newSignal);
        signalStartTime.current = Date.now();
        userResponded.current = false;
        gameLoopTimeout.current = setTimeout(goEndRound, GO_SIGNAL_DURATION);
      }, waitTime);
    }
    return () => {
      if (gameLoopTimeout.current) clearTimeout(gameLoopTimeout.current);
    };
  }, [gameState, currentRound, goEndRound, currentGameIndex, selectedGames]);

  const goHandleResponse = () => {
    if (signal === 'Wait' || userResponded.current) return;
    userResponded.current = true;
    const rt = Date.now() - signalStartTime.current;

    if (signal === 'Go') {
      setScore(s => ({...s, hits: (s.hits || 0) + 1}));
      setReactionTimes(rts => [...rts, rt]);
    } else if (signal === 'No-Go') {
      setScore(s => ({...s, falseAlarms: (s.falseAlarms || 0) + 1}));
    }

    if (gameLoopTimeout.current) clearTimeout(gameLoopTimeout.current);
    setTimeout(goEndRound, 50);
  };

  const generateSequence = useCallback(() => {
    const newSeq = [];
    for (let i = 0; i < N_TOTAL_ROUNDS + nBack; i++) {
      const shouldMatch = i >= nBack && Math.random() < 0.3;
      if (shouldMatch) {
        newSeq.push(newSeq[i - nBack]);
      } else {
        let stim =
          N_STIMULI_SET[Math.floor(Math.random() * N_STIMULI_SET.length)];
        if (i >= nBack && stim === newSeq[i - nBack]) {
          stim =
            N_STIMULI_SET[
              (N_STIMULI_SET.indexOf(stim) + 1) % N_STIMULI_SET.length
            ];
        }
        newSeq.push(stim);
      }
    }
    setSequence(newSeq);
  }, [nBack]);

  const nNextStimulus = useCallback(() => {
    if (currentIndex >= nBack && currentIndex < N_TOTAL_ROUNDS + nBack - 1) {
      const isTarget =
        sequence[currentIndex + 1] === sequence[currentIndex + 1 - nBack];
      if (!responded && isTarget) {
        setScore(s => ({...s, misses: (s.misses || 0) + 1}));
      }
    }
    setResponded(false);
    if (currentIndex < N_TOTAL_ROUNDS + nBack - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      finishCurrentGame('nBack');
    }
  }, [currentIndex, nBack, responded, sequence]);

  useEffect(() => {
    if (
      selectedGames[currentGameIndex] === 'nBack' &&
      gameState === 'running'
    ) {
      timerRef.current = setTimeout(
        nNextStimulus,
        N_STIMULUS_DURATION + N_INTERVAL
      );
    }
    return () => clearTimeout(timerRef.current);
  }, [currentIndex, gameState, nNextStimulus, currentGameIndex, selectedGames]);

  const nHandleResponse = () => {
    if (responded) return;
    setResponded(true);
    const isTarget = sequence[currentIndex] === sequence[currentIndex - nBack];
    if (isTarget) {
      setScore(s => ({...s, hits: (s.hits || 0) + 1}));
    } else {
      setScore(s => ({...s, falseAlarms: (s.falseAlarms || 0) + 1}));
    }
  };

  const generateStroopWord = useCallback(() => {
    const color =
      STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
    let word = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
    while (word.name === color.name) {
      word = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
    }
    setStroopWord({text: word.name, color: color.hex});
    setStroopStartTime(Date.now());
  }, []);

  useEffect(() => {
    if (
      selectedGames[currentGameIndex] === 'stroop' &&
      gameState === 'running' &&
      stroopRound < STROOP_TOTAL_ROUNDS
    ) {
      generateStroopWord();
    }
  }, [
    gameState,
    stroopRound,
    generateStroopWord,
    currentGameIndex,
    selectedGames,
  ]);

  const stroopHandleResponse = selectedColorHex => {
    const rt = Date.now() - stroopStartTime;
    setReactionTimes(prev => [...prev, rt]);
    if (selectedColorHex === stroopWord.color) {
      setScore(s => ({...s, hits: (s.hits || 0) + 1}));
    } else {
      setScore(s => ({...s, errors: (s.errors || 0) + 1}));
    }

    if (stroopRound + 1 >= STROOP_TOTAL_ROUNDS) {
      finishCurrentGame('stroop');
    } else {
      setStroopRound(r => r + 1);
    }
  };

  const finishCurrentGame = gameType => {
    console.log('✅ Finished game:', gameType);
    setGameState('idle');

    const avgRT =
      reactionTimes.length > 0
        ? Math.round(
            reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
          )
        : 0;

    let gameData = {};
    if (gameType === 'goNoGo') {
      gameData = {
        ...score,
        avgReactionTime: avgRT,
        totalRounds: GO_TOTAL_ROUNDS,
      };
    } else if (gameType === 'nBack') {
      gameData = {...score, nLevel: nBack, totalRounds: N_TOTAL_ROUNDS};
    } else if (gameType === 'stroop') {
      gameData = {
        ...score,
        avgReactionTime: avgRT,
        totalRounds: STROOP_TOTAL_ROUNDS,
      };
    }

    setAllGameResults(prev => ({...prev, [gameType]: gameData}));

    if (currentGameIndex + 1 < selectedGames.length) {
      setTimeout(() => {
        setCurrentGameIndex(prev => prev + 1);
        startCurrentGame(selectedGames[currentGameIndex + 1]);
      }, 2000);
    } else {
      completeAllGames();
    }
  };

  const completeAllGames = async () => {
    console.log('🏁 All games completed!');
    setOverallState('uploading');
    setApiMessage('⏳ Stopping recording and processing...');

    const videoBlob = await stopRecording();

    if (!videoBlob || videoBlob.size === 0) {
      setApiMessage('⚠️ No video recorded');
      await saveResults(null, null);
      return;
    }

    setApiMessage('💾 Saving assessment results...');
    await saveResults(null, videoBlob);
  };

  const saveResults = async (adhdResults, videoBlob) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No auth token found');

      const modelResult = adhdResults
        ? {
            composite_score: adhdResults.composite_score || 0,
            likelihood: adhdResults.likelihood || 'Unknown',
            risk_level: adhdResults.risk_level || 'unknown',
            domain_scores: {
              attention: adhdResults.domain_scores?.attention || 0,
              impulsivity: adhdResults.domain_scores?.impulsivity || 0,
              working_memory: adhdResults.domain_scores?.working_memory || 0,
            },
            features: adhdResults.features || {},
          }
        : {
            composite_score: 0,
            likelihood: 'Unknown',
            risk_level: 'unknown',
            domain_scores: {attention: 0, impulsivity: 0, working_memory: 0},
            features: {},
          };

      const combinedResults = {
        goNoGo: allGameResults.goNoGo || null,
        nBack: allGameResults.nBack || null,
        stroop: allGameResults.stroop || null,
        modelResult,
        timestamp: new Date().toISOString(),
      };

      console.log('💾 Saving combined results');

      const res = await fetch(`${BACKEND_URL}/api/assessments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(combinedResults),
      });

      const data = await res.json();
      console.log('📥 Backend response:', data);

      if (res.ok) {
        console.log('✅ Results saved successfully');

        // CRITICAL FIX: Use correct field name
        const assessmentId = data.assessment?._id;

        if (videoBlob && assessmentId) {
          setApiMessage('📤 Uploading video...');
          await uploadVideoToMongo(videoBlob, assessmentId);
        }

        setApiMessage('✅ All done! Redirecting...');
        setTimeout(() => navigate('/home/results'), 2000);
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err) {
      console.error('❌ Save error:', err);
      setApiMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==================== FRONTEND CHANGES NEEDED ====================

  // UPDATE YOUR uploadVideoToMongo function in the frontend:
  const uploadVideoToMongo = async (videoBlob, assessmentId) => {
    try {
      console.log('🎥 Converting video to base64...');
      const token = localStorage.getItem('token');

      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(videoBlob);
      });

      const videoBase64 = await base64Promise;
      console.log('📤 Uploading video for assessment:', assessmentId);

      const res = await fetch(`${BACKEND_URL}/api/assessments/upload-video`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessmentId,
          videoBase64,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log('✅ Video uploaded to UploadThing:', data.videoUrl);
      } else {
        const errorData = await res.json();
        console.error('❌ Video upload failed:', errorData.error);
      }
    } catch (err) {
      console.error('❌ Video upload error:', err);
    }
  };

  if (overallState === 'selection') {
    return (
      <div className="webcam-page">
        <Header />
        <main className="webcam-main">
          <div className="game-header">
            <h1 className="game-title">🎮 Multi-Game ADHD Assessment</h1>
            <p className="game-description">
              Select one or more cognitive tasks. You'll be recorded throughout
              all games!
            </p>
          </div>

          <div className="video-section">
            <div className="video-box">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={!cameraReady ? 'hidden' : ''}
              />
              {!cameraReady && (
                <div className="video-placeholder">
                  <span className="placeholder-emoji">📹</span>
                  <p>Connecting to camera...</p>
                </div>
              )}
            </div>
            <p className="camera-notice">
              <span className="notice-emoji">🎥</span>
              Your video will be recorded during all selected games
            </p>
          </div>

          <div className="game-selection-grid">
            {availableGames.map(game => (
              <div
                key={game.id}
                className={`game-select-card ${
                  selectedGames.includes(game.id) ? 'selected' : ''
                }`}
                onClick={() => toggleGameSelection(game.id)}
                style={{
                  background: selectedGames.includes(game.id)
                    ? game.color
                    : '#f5f5f5',
                }}
              >
                <div className="game-select-emoji">{game.emoji}</div>
                <h3>{game.title}</h3>
                <p>{game.description}</p>
                <div className="game-duration">{game.duration}</div>
                {selectedGames.includes(game.id) && (
                  <div className="check-mark">✓</div>
                )}
              </div>
            ))}
          </div>
          <div className="selection-info">
            <p>Selected: {selectedGames.length} game(s)</p>
            <p>Estimated time: ~{selectedGames.length * 5} minutes</p>
          </div>

          <button
            className="btn-start"
            onClick={startAllGames}
            disabled={!cameraReady || selectedGames.length === 0}
          >
            <span className="btn-emoji">🚀</span>
            {cameraReady ? 'Start Assessment!' : 'Waiting for camera...'}
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  const currentGame = selectedGames[currentGameIndex];

  if (overallState === 'playing') {
    return (
      <div className="webcam-page">
        <Header />
        <main className="webcam-main">
          <div className="multi-game-progress">
            <div className="progress-text">
              Game {currentGameIndex + 1} of {selectedGames.length}
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${
                    ((currentGameIndex + 1) / selectedGames.length) * 100
                  }%`,
                }}
              />
            </div>
          </div>

          {isRecording && (
            <div className="recording-indicator">
              <span className="recording-dot"></span>
              Recording in progress...
            </div>
          )}

          <div className="game-container">
            {currentGame === 'goNoGo' && (
              <div className="game-play">
                <h2>🎯 Quick Reactions Game</h2>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${
                          ((currentRound + 1) / GO_TOTAL_ROUNDS) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <p>
                    Round {currentRound + 1} of {GO_TOTAL_ROUNDS}
                  </p>
                </div>
                <div className={`signal-display ${signal.toLowerCase()}`}>
                  {signal === 'Go' && <span className="signal-emoji">✅</span>}
                  {signal === 'No-Go' && (
                    <span className="signal-emoji">⛔</span>
                  )}
                  {signal === 'Wait' && (
                    <span className="signal-emoji">⏳</span>
                  )}
                  <span className="signal-text">{signal}</span>
                </div>
                <button
                  className={`btn-action ${signal === 'Go' ? 'pulse' : ''}`}
                  onClick={goHandleResponse}
                  disabled={signal === 'Wait'}
                >
                  CLICK!
                </button>
              </div>
            )}

            {currentGame === 'nBack' && (
              <div className="game-play">
                <h2>🧠 Memory Challenge</h2>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${
                          (Math.max(0, currentIndex - nBack + 1) /
                            N_TOTAL_ROUNDS) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <p>
                    Round {Math.max(0, currentIndex - nBack + 1)} of{' '}
                    {N_TOTAL_ROUNDS}
                  </p>
                </div>
                <div className="stimulus-display">
                  {currentIndex >= nBack ? (
                    <span className="stimulus">{sequence[currentIndex]}</span>
                  ) : (
                    <span className="get-ready">Get Ready! 🎯</span>
                  )}
                </div>
                <button
                  className="btn-action"
                  onClick={nHandleResponse}
                  disabled={responded || currentIndex < nBack}
                >
                  MATCH!
                </button>
                <div className="hint">💡 Look back {nBack} steps!</div>
              </div>
            )}

            {currentGame === 'stroop' && (
              <div className="game-play">
                <h2>🎨 Color Detective</h2>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${
                          ((stroopRound + 1) / STROOP_TOTAL_ROUNDS) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <p>
                    Round {stroopRound + 1} of {STROOP_TOTAL_ROUNDS}
                  </p>
                </div>
                <div
                  className="word-display"
                  style={{color: stroopWord?.color}}
                >
                  {stroopWord?.text}
                </div>
                <div className="buttons-grid">
                  {STROOP_COLORS.map(color => (
                    <button
                      key={color.name}
                      onClick={() => stroopHandleResponse(color.hex)}
                      className="color-btn"
                      style={{backgroundColor: color.hex}}
                    >
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (overallState === 'uploading') {
    return (
      <div className="webcam-page">
        <Header />
        <main className="webcam-main">
          <div className="game-finished">
            <div className="finish-emoji">🎉</div>
            <h3>All Games Complete!</h3>
            <p className="loading-text">
              {apiMessage || 'Processing your results...'}
            </p>
            {loading && <div className="spinner"></div>}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return null;
}

// 'use client';

// import React, {useState, useEffect, useCallback, useRef} from 'react';
// import {useNavigate} from 'react-router-dom';
// import Header from '../Header/Header';
// import Footer from '../Footer/Footer';
// import './WebcamAttentiveness.css';

// // ------------------- Constants -------------------
// const GO_TOTAL_ROUNDS = 20;
// const GO_PROBABILITY = 0.7;
// const GO_SIGNAL_DURATION = 800;
// const GO_MIN_WAIT = 500;
// const GO_MAX_WAIT = 1500;

// const N_TOTAL_ROUNDS = 20;
// const N_STIMULI_SET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
// const N_STIMULUS_DURATION = 1500;
// const N_INTERVAL = 500;

// const STROOP_TOTAL_ROUNDS = 10;
// const STROOP_COLORS = [
//   {name: 'RED', hex: '#FF0000'},
//   {name: 'BLUE', hex: '#3399FF'},
//   {name: 'GREEN', hex: '#00C851'},
//   {name: 'YELLOW', hex: '#FFD600'},
// ];

// // ------------------- FastAPI Backend URL -------------------
// const FASTAPI_BASE_URL = 'http://localhost:10000'; // Change to your deployed URL
// // const FASTAPI_BASE_URL = 'https://adhd-assessment-video-analysis.onrender.com';

// // ------------------- Component -------------------
// export default function ADHDTasks({taskType = 'goNoGo'}) {
//   const navigate = useNavigate();

//   // ------------------- Video Recording State -------------------
//   const [videoStream, setVideoStream] = useState(null);
//   const [cameraReady, setCameraReady] = useState(false);
//   const [isRecording, setIsRecording] = useState(false);
//   const videoRef = useRef(null);
//   const mediaRecorderRef = useRef(null);
//   const recordedChunksRef = useRef([]);

//   // ------------------- Initialize Camera -------------------
//   useEffect(() => {
//     const startVideo = async () => {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: {
//             width: {ideal: 1280},
//             height: {ideal: 720},
//             facingMode: 'user',
//           },
//           audio: false,
//         });
//         setVideoStream(stream);
//         if (videoRef.current) {
//           videoRef.current.srcObject = stream;
//           setCameraReady(true);
//         }
//       } catch (err) {
//         console.error('Webcam access error:', err);
//         alert('Please allow camera access to continue');
//       }
//     };
//     startVideo();

//     return () => {
//       stopRecordingAndCleanup();
//       if (videoStream) {
//         videoStream.getTracks().forEach(track => track.stop());
//       }
//     };
//   }, []);

//   // ------------------- Video Recording Functions -------------------
//   const startRecording = () => {
//     if (!videoStream || isRecording) return;

//     recordedChunksRef.current = [];

//     try {
//       // Try different codecs based on browser support
//       let options = {mimeType: 'video/webm;codecs=vp9'};
//       if (!MediaRecorder.isTypeSupported(options.mimeType)) {
//         options = {mimeType: 'video/webm;codecs=vp8'};
//         if (!MediaRecorder.isTypeSupported(options.mimeType)) {
//           options = {mimeType: 'video/webm'};
//         }
//       }

//       mediaRecorderRef.current = new MediaRecorder(videoStream, options);

//       mediaRecorderRef.current.ondataavailable = event => {
//         if (event.data && event.data.size > 0) {
//           recordedChunksRef.current.push(event.data);
//         }
//       };

//       mediaRecorderRef.current.onerror = event => {
//         console.error('MediaRecorder error:', event);
//       };

//       mediaRecorderRef.current.start(100); // Collect data every 100ms
//       setIsRecording(true);
//       console.log('🎥 Recording started');
//     } catch (err) {
//       console.error('Recording start error:', err);
//       alert('Failed to start recording');
//     }
//   };

//   const stopRecordingAndCleanup = () => {
//     if (
//       mediaRecorderRef.current &&
//       mediaRecorderRef.current.state !== 'inactive'
//     ) {
//       mediaRecorderRef.current.stop();
//     }
//     setIsRecording(false);
//   };

//   const stopRecording = () => {
//     return new Promise(resolve => {
//       if (
//         !mediaRecorderRef.current ||
//         mediaRecorderRef.current.state === 'inactive'
//       ) {
//         resolve(null);
//         return;
//       }

//       mediaRecorderRef.current.onstop = () => {
//         const blob = new Blob(recordedChunksRef.current, {
//           type: 'video/webm',
//         });
//         console.log(
//           '🎥 Recording stopped, blob size:',
//           (blob.size / 1024 / 1024).toFixed(2),
//           'MB'
//         );
//         setIsRecording(false);
//         resolve(blob);
//       };

//       mediaRecorderRef.current.stop();
//     });
//   };

//   // / ------------------- Upload Video (WITH BETTER LOGGING) -------------------
//   const uploadAndAnalyzeVideo = async videoBlob => {
//     if (!videoBlob || videoBlob.size === 0) {
//       console.error('❌ Invalid video blob');
//       setApiMessage('❌ No video data recorded');
//       return null;
//     }

//     try {
//       setLoading(true);
//       const fileSizeMB = (videoBlob.size / 1024 / 1024).toFixed(2);

//       console.log('📤 Uploading video:', {
//         size: `${fileSizeMB} MB`,
//         type: videoBlob.type,
//         url: `${FASTAPI_BASE_URL}/analyze/video`,
//       });

//       setApiMessage(`📤 Uploading ${fileSizeMB} MB video...`);

//       const formData = new FormData();
//       formData.append(
//         'file',
//         videoBlob,
//         `adhd_test_${taskType}_${Date.now()}.webm`
//       );

//       const uploadPromise = fetch(`${FASTAPI_BASE_URL}/analyze/video`, {
//         method: 'POST',
//         body: formData,
//       });

//       const timeoutPromise = new Promise((_, reject) =>
//         setTimeout(() => reject(new Error('Upload timeout (120s)')), 120000)
//       );

//       const response = await Promise.race([uploadPromise, timeoutPromise]);

//       if (!response.ok) {
//         const error = await response.text();
//         throw new Error(`Upload failed (${response.status}): ${error}`);
//       }

//       const result = await response.json();
//       console.log('✅ Upload successful:', result);

//       setApiMessage(`⏳ Analyzing video (Job: ${result.job_id})...`);

//       // Poll for results
//       const adhdResults = await pollForResults(result.job_id);
//       return adhdResults;
//     } catch (err) {
//       console.error('❌ Upload error:', err);
//       setApiMessage(`❌ Upload failed: ${err.message}`);
//       return null;
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Poll for video analysis results
//   // ------------------- Poll for Results (IMPROVED VERSION) -------------------
//   // ------------------- Poll for Results (IMPROVED) -------------------
//   const pollForResults = async (jobId, maxAttempts = 80) => {
//     // 2 minutes max
//     setApiMessage('🔍 Analyzing your attention patterns...');
//     console.log(`🔄 Starting polling for job: ${jobId}`);

//     for (let attempt = 0; attempt < maxAttempts; attempt++) {
//       try {
//         const response = await fetch(`${FASTAPI_BASE_URL}/results/${jobId}`);

//         if (!response.ok) {
//           if (attempt < 3) {
//             // Retry first few failures
//             console.log(`⚠️  Attempt ${attempt + 1} failed, retrying...`);
//             await new Promise(resolve => setTimeout(resolve, 4000));
//             continue;
//           }
//           throw new Error(`Failed to fetch results: ${response.status}`);
//         }

//         const data = await response.json();
//         console.log(`📊 Poll attempt ${attempt + 1}:`, {
//           status: data.status,
//           hasResults: !!data.results,
//           resultsKeys: data.results ? Object.keys(data.results) : [],
//         });

//         if (data.status === 'completed' && data.results) {
//           // *** CRITICAL: Verify results have required fields ***
//           if (
//             data.results.overall_score !== undefined &&
//             data.results.risk_level !== undefined
//           ) {
//             setApiMessage('✅ ADHD Analysis complete!');
//             console.log('✅ Valid results received:', data.results);
//             return data.results;
//           } else {
//             console.error('⚠️  Results missing required fields:', data.results);
//             setApiMessage('⚠️  Analysis complete but data is incomplete');
//             return null;
//           }
//         } else if (data.status === 'error') {
//           console.error('❌ Analysis error:', data.results);
//           setApiMessage(
//             `❌ Analysis error: ${data.results?.error || 'Unknown error'}`
//           );
//           return null;
//         }

//         // Still processing
//         if (attempt % 5 === 0 && attempt > 0) {
//           const elapsed = attempt * 2;
//           setApiMessage(`⏳ Still analyzing... (${elapsed}s elapsed)`);
//           console.log(`⏳ Still waiting... ${elapsed}s elapsed`);
//         }

//         await new Promise(resolve => setTimeout(resolve, 2000));
//       } catch (err) {
//         console.error(`❌ Polling error (attempt ${attempt + 1}):`, err);

//         if (attempt >= maxAttempts - 1) {
//           setApiMessage('❌ Analysis timeout - please try again');
//           return null;
//         }

//         await new Promise(resolve => setTimeout(resolve, 2000));
//       }
//     }

//     console.error('❌ Polling timeout after', maxAttempts * 2, 'seconds');
//     setApiMessage('❌ Analysis took too long - please try again');
//     return null;
//   };

//   // ------------------- Shared State -------------------
//   const [gameState, setGameState] = useState('idle');
//   const [score, setScore] = useState({});
//   const [reactionTimes, setReactionTimes] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [apiMessage, setApiMessage] = useState('');
//   const [adhdAnalysisResults, setAdhdAnalysisResults] = useState(null);

//   // ============ GO/NO-GO =====================
//   const [currentRound, setCurrentRound] = useState(0);
//   const [signal, setSignal] = useState('Wait');
//   const signalStartTime = useRef(0);
//   const userResponded = useRef(false);
//   const gameLoopTimeout = useRef(null);

//   const initializeScore = () => ({
//     hits: 0,
//     misses: 0,
//     falseAlarms: 0,
//     correctRejections: 0,
//     errors: 0,
//   });

//   const goEndRound = useCallback(() => {
//     console.log(
//       'Ending round:',
//       currentRound + 1,
//       'Signal:',
//       signal,
//       'Responded:',
//       userResponded.current
//     );

//     if (signal === 'Go' && !userResponded.current) {
//       setScore(s => ({...s, misses: (s.misses || 0) + 1}));
//     }
//     if (signal === 'No-Go' && !userResponded.current) {
//       setScore(s => ({
//         ...s,
//         correctRejections: (s.correctRejections || 0) + 1,
//       }));
//     }

//     setSignal('Wait');
//     userResponded.current = false;

//     if (currentRound + 1 >= GO_TOTAL_ROUNDS) {
//       console.log('🏁 Test completed!');
//       setGameState('finished');
//     } else {
//       setCurrentRound(r => r + 1);
//     }
//   }, [currentRound, signal]);

//   useEffect(() => {
//     if (
//       taskType === 'goNoGo' &&
//       gameState === 'running' &&
//       currentRound < GO_TOTAL_ROUNDS
//     ) {
//       const waitTime =
//         Math.random() * (GO_MAX_WAIT - GO_MIN_WAIT) + GO_MIN_WAIT;

//       gameLoopTimeout.current = setTimeout(() => {
//         const newSignal = Math.random() < GO_PROBABILITY ? 'Go' : 'No-Go';
//         setSignal(newSignal);
//         signalStartTime.current = Date.now();
//         userResponded.current = false;

//         gameLoopTimeout.current = setTimeout(() => {
//           goEndRound();
//         }, GO_SIGNAL_DURATION);
//       }, waitTime);
//     }

//     return () => {
//       if (gameLoopTimeout.current) {
//         clearTimeout(gameLoopTimeout.current);
//         gameLoopTimeout.current = null;
//       }
//     };
//   }, [gameState, currentRound, goEndRound, taskType]);

//   const goHandleResponse = () => {
//     if (signal === 'Wait' || userResponded.current) return;

//     userResponded.current = true;
//     const rt = Date.now() - signalStartTime.current;

//     if (signal === 'Go') {
//       setScore(s => ({...s, hits: (s.hits || 0) + 1}));
//     } else if (signal === 'No-Go') {
//       setScore(s => ({...s, falseAlarms: (s.falseAlarms || 0) + 1}));
//     }

//     setReactionTimes(rts => [...rts, rt]);

//     if (gameLoopTimeout.current) {
//       clearTimeout(gameLoopTimeout.current);
//       gameLoopTimeout.current = null;
//     }

//     setTimeout(goEndRound, 50);
//   };

//   // ============ N-BACK =====================
//   const [nBack, setNBack] = useState(2);
//   const [sequence, setSequence] = useState([]);
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [responded, setResponded] = useState(false);
//   const timerRef = useRef(null);

//   const generateSequence = useCallback(() => {
//     const newSeq = [];
//     for (let i = 0; i < N_TOTAL_ROUNDS + nBack; i++) {
//       const shouldMatch = i >= nBack && Math.random() < 0.3;
//       if (shouldMatch) newSeq.push(newSeq[i - nBack]);
//       else {
//         let stim =
//           N_STIMULI_SET[Math.floor(Math.random() * N_STIMULI_SET.length)];
//         if (i >= nBack && stim === newSeq[i - nBack])
//           stim =
//             N_STIMULI_SET[
//               (N_STIMULI_SET.indexOf(stim) + 1) % N_STIMULI_SET.length
//             ];
//         newSeq.push(stim);
//       }
//     }
//     setSequence(newSeq);
//   }, [nBack]);

//   const nNextStimulus = useCallback(() => {
//     if (currentIndex >= nBack && currentIndex < N_TOTAL_ROUNDS + nBack - 1) {
//       const isTarget =
//         sequence[currentIndex + 1] === sequence[currentIndex + 1 - nBack];
//       if (!responded && isTarget)
//         setScore(s => ({...s, misses: (s.misses || 0) + 1}));
//     }
//     setResponded(false);
//     if (currentIndex < N_TOTAL_ROUNDS + nBack - 1)
//       setCurrentIndex(prev => prev + 1);
//     else setGameState('finished');
//   }, [currentIndex, nBack, responded, sequence]);

//   useEffect(() => {
//     if (taskType === 'nBack' && gameState === 'running') {
//       timerRef.current = setTimeout(() => {
//         nNextStimulus();
//       }, N_STIMULUS_DURATION + N_INTERVAL);
//     }
//     return () => clearTimeout(timerRef.current);
//   }, [taskType, currentIndex, gameState, nNextStimulus]);

//   const nHandleResponse = () => {
//     if (responded) return;
//     setResponded(true);
//     const isTarget = sequence[currentIndex] === sequence[currentIndex - nBack];
//     if (isTarget) setScore(s => ({...s, hits: (s.hits || 0) + 1}));
//     else setScore(s => ({...s, falseAlarms: (s.falseAlarms || 0) + 1}));
//   };

//   // ============ STROOP =====================
//   const [stroopRound, setStroopRound] = useState(0);
//   const [stroopWord, setStroopWord] = useState(null);
//   const [stroopStartTime, setStroopStartTime] = useState(0);

//   const generateStroopWord = useCallback(() => {
//     const color =
//       STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
//     let word = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
//     while (word.name === color.name) {
//       word = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
//     }
//     setStroopWord({text: word.name, color: color.hex});
//     setStroopStartTime(Date.now());
//   }, []);

//   useEffect(() => {
//     if (
//       taskType === 'stroop' &&
//       gameState === 'running' &&
//       stroopRound < STROOP_TOTAL_ROUNDS
//     ) {
//       generateStroopWord();
//     }
//   }, [gameState, stroopRound, generateStroopWord, taskType]);

//   const stroopHandleResponse = selectedColorHex => {
//     const rt = Date.now() - stroopStartTime;
//     setReactionTimes(prev => [...prev, rt]);
//     if (selectedColorHex === stroopWord.color)
//       setScore(s => ({...s, hits: (s.hits || 0) + 1}));
//     else setScore(s => ({...s, errors: (s.errors || 0) + 1}));

//     if (stroopRound + 1 >= STROOP_TOTAL_ROUNDS) setGameState('finished');
//     else setStroopRound(r => r + 1);
//   };

//   // ------------------- Start Game with Recording -------------------
//   const startGame = () => {
//     console.log('🚀 Starting game and recording...');
//     setScore(initializeScore());
//     setReactionTimes([]);
//     setCurrentRound(0);
//     setCurrentIndex(0);
//     setStroopRound(0);
//     setSignal('Wait');
//     userResponded.current = false;
//     setAdhdAnalysisResults(null);
//     setApiMessage('');

//     // Start video recording
//     startRecording();

//     setGameState('running');

//     if (taskType === 'nBack') generateSequence();
//   };

//   // ------------------- Handle Game Finish -------------------
//   useEffect(() => {
//     if (gameState === 'finished') {
//       handleGameFinish();
//     }
//   }, [gameState]);

//   // ------------------- Handle Game Finish (FIXED VERSION) -------------------
//   // WebcamAttentiveness.js - COMPLETE FIXED VERSION
//   // This fixes the "showing zeros" issue

//   // ------------------- Handle Game Finish (COMPLETE FIX) -------------------
//   const handleGameFinish = async () => {
//     console.log('🏁 Game finished, stopping recording...');

//     const videoBlob = await stopRecording();

//     if (!videoBlob) {
//       setApiMessage('❌ Failed to record video');
//       setLoading(false);
//       return;
//     }

//     // Calculate task scores
//     const avgRT =
//       reactionTimes.length > 0
//         ? Math.round(
//             reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
//           )
//         : 0;

//     let taskData;
//     if (taskType === 'goNoGo') {
//       taskData = {
//         goNoGo: {
//           ...score,
//           avgReactionTime: avgRT,
//           totalRounds: GO_TOTAL_ROUNDS,
//         },
//       };
//     } else if (taskType === 'nBack') {
//       taskData = {
//         nBack: {
//           ...score,
//           nLevel: nBack,
//           totalRounds: N_TOTAL_ROUNDS,
//         },
//       };
//     } else if (taskType === 'stroop') {
//       taskData = {
//         stroop: {
//           ...score,
//           avgReactionTime: avgRT,
//           totalRounds: STROOP_TOTAL_ROUNDS,
//         },
//       };
//     }

//     console.log('📊 Task Results:', taskData);

//     // Upload video for ADHD analysis
//     setApiMessage('📤 Uploading video for analysis...');
//     setLoading(true);

//     const adhdResults = await uploadAndAnalyzeVideo(videoBlob);

//     if (adhdResults && adhdResults.features) {
//       console.log('✅ ADHD Analysis completed:', adhdResults);
//       setAdhdAnalysisResults(adhdResults);

//       // Map Python model_result to backend schema
//       const modelResult = {
//         composite_score: adhdResults.composite_score || 0,
//         likelihood: adhdResults.likelihood || 'Unknown',
//         risk_level: adhdResults.risk_level || 'unknown',
//         domain_scores: {
//           attention: adhdResults.domain_scores?.attention || 0,
//           impulsivity: adhdResults.domain_scores?.impulsivity || 0,
//           working_memory: adhdResults.domain_scores?.working_memory || 0,
//         },
//         features: adhdResults.features || {},
//       };

//       const combinedResults = {
//         taskPerformance: taskData,
//         modelResult,
//         timestamp: new Date().toISOString(),
//       };

//       console.log('💾 Saving combined results:', combinedResults);

//       setApiMessage('💾 Saving your results to database...');
//       const saveSuccess = await submitResults(combinedResults);

//       if (saveSuccess) {
//         setApiMessage('✅ All done! Redirecting to results...');
//         console.log('✅ Results saved successfully, navigating...');
//         await new Promise(resolve => setTimeout(resolve, 2000));
//         navigate('/home/results');
//       } else {
//         setApiMessage(
//           '⚠️ Analysis complete but save failed. Please check your connection.'
//         );
//         setLoading(false);
//         console.error('❌ Failed to save results to database');
//       }
//     } else {
//       console.error('❌ ADHD analysis failed or returned no data');
//       setApiMessage('⚠️ Video analysis failed. Saving task results only...');

//       const taskOnlyResults = {
//         taskPerformance: taskData,
//         modelResult: {
//           composite_score: 0,
//           likelihood: 'Unknown',
//           risk_level: 'unknown',
//           domain_scores: {attention: 0, impulsivity: 0, working_memory: 0},
//           features: {},
//         },
//         timestamp: new Date().toISOString(),
//       };

//       const saveSuccess = await submitResults(taskOnlyResults);
//       if (saveSuccess) {
//         setApiMessage('⚠️ Task results saved (video analysis unavailable)');
//         await new Promise(resolve => setTimeout(resolve, 2000));
//         navigate('/home/results');
//       } else {
//         setApiMessage('❌ Failed to save results. Please try again.');
//         setLoading(false);
//       }
//     }
//   };

//   // ------------------- Submit Combined Results -------------------
//   // ------------------- Submit Results (FIXED WITH RETURN VALUE) -------------------
//   const submitResults = async combinedData => {
//     try {
//       setLoading(true);
//       const token = localStorage.getItem('token');

//       if (!token) {
//         console.error('❌ No auth token found');
//         throw new Error('No auth token found');
//       }

//       console.log('💾 Submitting to backend:', {
//         url: 'https://adhd-assessment-backend.onrender.com/api/assessments',
//         dataKeys: Object.keys(combinedData),
//         composite_score: combinedData.modelResult?.composite_score,
//         risk_level: combinedData.modelResult?.risk_level,
//       });

//       const res = await fetch(
//         'https://adhd-assessment-backend.onrender.com/api/assessments',
//         {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify(combinedData),
//         }
//       );

//       const data = await res.json();

//       console.log('📥 Backend response:', {
//         status: res.status,
//         ok: res.ok,
//         data: data,
//       });

//       if (res.ok) {
//         console.log('✅ Results saved successfully:', data);
//         setApiMessage('✅ Results saved successfully!');
//         return true; // *** CRITICAL: Return success ***
//       } else {
//         console.error('❌ Save failed:', {
//           status: res.status,
//           error: data.error,
//           details: data,
//         });
//         setApiMessage(`❌ Error: ${data.error || 'Failed to save'}`);
//         return false; // *** Return failure ***
//       }
//     } catch (err) {
//       console.error('❌ Network error during save:', err);
//       setApiMessage(`❌ Network error: ${err.message}`);
//       return false; // *** Return failure ***
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ------------------- Get Task Info -------------------
//   const getTaskInfo = () => {
//     if (taskType === 'goNoGo') {
//       return {
//         title: 'Quick Reactions Game',
//         emoji: '🎯',
//         description:
//           "Click fast when you see 'Go!' but wait when you see 'No-Go!'",
//         instruction:
//           'Your video will be recorded to analyze your attention patterns!',
//       };
//     } else if (taskType === 'nBack') {
//       return {
//         title: 'Memory Challenge',
//         emoji: '🧠',
//         description: 'Remember the letters and match them!',
//         instruction:
//           "We'll record you to understand how you focus during memory tasks!",
//       };
//     } else if (taskType === 'stroop') {
//       return {
//         title: 'Color Detective',
//         emoji: '🎨',
//         description: 'Pick the COLOR of the word, not what it says!',
//         instruction: "Stay focused - we're watching your concentration!",
//       };
//     }
//   };

//   const taskInfo = getTaskInfo();

//   // ------------------- Render Game -------------------
//   const renderGame = () => {
//     if (taskType === 'goNoGo') {
//       if (gameState === 'idle') {
//         return (
//           <div className="game-start">
//             <div className="game-instructions">
//               <h3>How to Play:</h3>
//               <div className="instruction-item">
//                 <span className="instruction-emoji">✅</span>
//                 <p>
//                   When you see <strong className="go-text">GO</strong>, click
//                   the button FAST!
//                 </p>
//               </div>
//               <div className="instruction-item">
//                 <span className="instruction-emoji">⛔</span>
//                 <p>
//                   When you see <strong className="no-go-text">NO-GO</strong>,
//                   DON'T click anything!
//                 </p>
//               </div>
//               <div className="instruction-item">
//                 <span className="instruction-emoji">🎥</span>
//                 <p>
//                   <strong>We'll record your video</strong> to analyze attention
//                   patterns!
//                 </p>
//               </div>
//             </div>
//             <button
//               className="btn-start"
//               onClick={startGame}
//               disabled={!cameraReady}
//             >
//               <span className="btn-emoji">🚀</span>
//               {cameraReady ? 'Start Test & Record!' : 'Waiting for camera...'}
//             </button>
//           </div>
//         );
//       }
//       if (gameState === 'running') {
//         const progress = ((currentRound + 1) / GO_TOTAL_ROUNDS) * 100;
//         return (
//           <div className="game-play">
//             {isRecording && (
//               <div className="recording-indicator">
//                 <span className="recording-dot"></span>
//                 Recording in progress...
//               </div>
//             )}
//             <div className="progress-container">
//               <div className="progress-bar">
//                 <div
//                   className="progress-fill"
//                   style={{width: `${progress}%`}}
//                 ></div>
//               </div>
//               <p className="progress-text">
//                 Round {currentRound + 1} of {GO_TOTAL_ROUNDS}
//               </p>
//             </div>
//             <div className={`signal-display ${signal.toLowerCase()}`}>
//               {signal === 'Go' && <span className="signal-emoji">✅</span>}
//               {signal === 'No-Go' && <span className="signal-emoji">⛔</span>}
//               {signal === 'Wait' && <span className="signal-emoji">⏳</span>}
//               <span className="signal-text">{signal}</span>
//             </div>
//             <button
//               className={`btn-action ${signal === 'Go' ? 'pulse' : ''}`}
//               onClick={goHandleResponse}
//               disabled={signal === 'Wait'}
//             >
//               <span className="btn-emoji">👆</span>
//               CLICK!
//             </button>
//           </div>
//         );
//       }
//       if (gameState === 'finished') {
//         return (
//           <div className="game-finished">
//             <div className="finish-emoji">🎉</div>
//             <h3>Test Complete!</h3>
//             {adhdAnalysisResults && (
//               <div className="adhd-results-preview">
//                 <h4>ADHD Analysis Results:</h4>
//                 <p>
//                   Risk Level:{' '}
//                   <strong>
//                     {adhdAnalysisResults.adhd_assessment?.risk_level}
//                   </strong>
//                 </p>
//                 <p>
//                   Overall Score:{' '}
//                   <strong>
//                     {(
//                       adhdAnalysisResults.adhd_assessment?.overall_score * 100
//                     ).toFixed(1)}
//                     %
//                   </strong>
//                 </p>
//               </div>
//             )}
//             <p className="loading-text">
//               {apiMessage || 'Processing your results...'}
//             </p>
//             {loading && <div className="spinner"></div>}
//           </div>
//         );
//       }
//     }

//     // Similar structure for nBack and stroop...
//     // (keeping the same pattern with recording indicator)

//     return <div>Task type: {taskType}</div>;
//   };

//   return (
//     <div className="webcam-page">
//       <Header />

//       <main className="webcam-main">
//         <div className="game-header">
//           <div className="game-title-section">
//             <span className="game-emoji">{taskInfo.emoji}</span>
//             <h1 className="game-title">{taskInfo.title}</h1>
//           </div>
//           <p className="game-description">{taskInfo.description}</p>
//           <p className="game-instruction">{taskInfo.instruction}</p>
//         </div>

//         <div className="video-section">
//           <div className="video-box">
//             <video
//               ref={videoRef}
//               autoPlay
//               muted
//               playsInline
//               className={`video ${!cameraReady ? 'hidden' : ''}`}
//             />
//             {!cameraReady && (
//               <div className="video-placeholder">
//                 <span className="placeholder-emoji">📹</span>
//                 <p>Connecting to camera...</p>
//               </div>
//             )}
//             {isRecording && <div className="recording-badge">🔴 REC</div>}
//           </div>
//           <p className="camera-notice">
//             <span className="notice-emoji">🎥</span>
//             Your video is being recorded during the test for ADHD analysis
//           </p>
//         </div>

//         <div className="game-container">{renderGame()}</div>

//         {apiMessage && <div className="api-message">{apiMessage}</div>}
//       </main>

//       <Footer />
//     </div>
//   );
// }
