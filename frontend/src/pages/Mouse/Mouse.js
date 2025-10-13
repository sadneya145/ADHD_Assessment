import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Circle, Square, Triangle, Star, Download } from 'lucide-react';
import './MouseAnalysis.css';

const BACKEND_URL = 'http://localhost:5000';

const shapeTypes = [
  { id: 'circle', color: '#FF6B6B', icon: Circle },
  { id: 'square', color: '#4ECDC4', icon: Square },
  { id: 'triangle', color: '#FFE66D', icon: Triangle },
  { id: 'star', color: '#95E1D3', icon: Star },
];

const ShapeGame = ({ token }) => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [mouseData, setMouseData] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [currentShapes, setCurrentShapes] = useState([]);
  const [draggedShape, setDraggedShape] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const startTimeRef = useRef(null);
  const gameAreaRef = useRef(null);

  // Generate shapes at start and after every complete match
  const generateShapes = useCallback(() => {
    const shapes = shapeTypes.map((type, idx) => ({
      ...type,
      sourcePos: { x: 50 + idx * 100, y: 450 },
      targetPos: { x: Math.random() * 400 + 100, y: Math.random() * 250 + 50 },
      matched: false,
    }));
    setCurrentShapes(shapes);
  }, []);

  // Track mouse movement
  const trackMouse = useCallback((e) => {
    if (!gameStarted || gameEnded) return;
    const currentTime = (Date.now() - startTimeRef.current) / 1000;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMouseData((prev) => [...prev, { time: currentTime, x, y }]);
  }, [gameStarted, gameEnded]);

  // Start game
  const startGame = () => {
    setGameStarted(true);
    setGameEnded(false);
    setScore(0);
    setTimeLeft(60);
    setMouseData([]);
    setAnalysisResult(null);
    startTimeRef.current = Date.now();
    generateShapes();
  };

  // Timer
  useEffect(() => {
    if (!gameStarted || gameEnded) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameEnded(true);
          analyzeData();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameStarted, gameEnded]);

  // Drag & Drop
  const handleDragStart = (shape, e) => {
    setDraggedShape(shape);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (targetShape, e) => {
    e.preventDefault();
    if (!draggedShape || draggedShape.id !== targetShape.id) return;

    setCurrentShapes((prev) =>
      prev.map((s) => (s.id === targetShape.id ? { ...s, matched: true } : s))
    );
    setScore((prev) => prev + 10);
    setDraggedShape(null);

    if (currentShapes.filter((s) => !s.matched).length === 1) {
      setTimeout(generateShapes, 500);
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  // Download mouse data
  const downloadData = () => {
    const dataStr = JSON.stringify(mouseData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mouse_tracking_data.json';
    a.click();
  };

const analyzeData = async () => {
  const token = localStorage.getItem('token'); // retrieve JWT
  if (!token) {
    console.warn('No auth token found. Cannot analyze mouse data.');
    setAnalysisResult({
      adhd_type: 'N/A',
      confidence: 0,
      classifications: { message: 'No auth token' },
    });
    return;
  }

  setLoadingAnalysis(true);
  try {
    const response = await fetch(`${BACKEND_URL}/api/analyze/mouse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(mouseData),
    });

    if (!response.ok) throw new Error('Server error');
    const result = await response.json();
    setAnalysisResult(result);
    localStorage.setItem('lastAnalysis', JSON.stringify(result));
  } catch (err) {
    console.warn('⚠ Backend failed:', err.message);
    setAnalysisResult({
      adhd_type: 'N/A',
      confidence: 0,
      classifications: { message: 'Backend not connected' },
    });
  } finally {
    setLoadingAnalysis(false);
  }
};

  return (
    <div className="game-container-mouse">
      {!gameStarted ? (
        <div className="start-screen">
          <h1 className="game-title">Shape Match Challenge</h1>
          <p className="game-subtitle">
            Drag shapes to their matching outlines as quickly as possible!
          </p>
          <button onClick={startGame} className="start-button">
            Start Game
          </button>
        </div>
      ) : (
        <div className="game-content">
          <div className="status-bar">
            <div className="status-text">Score: {score}</div>
            <div className="status-text">Time: {timeLeft}s</div>
          </div>

          <div
            ref={gameAreaRef}
            onMouseMove={trackMouse}
            className="game-area"
          >
            {currentShapes.map((shape) => {
              const Icon = shape.icon;
              return (
                <div
                  key={`target-${shape.id}`}
                  onDrop={(e) => handleDrop(shape, e)}
                  onDragOver={handleDragOver}
                  style={{
                    left: shape.targetPos.x,
                    top: shape.targetPos.y,
                    opacity: shape.matched ? 0.3 : 1,
                  }}
                  className="target-shape"
                >
                  <div
                    className="target-border"
                    style={{ borderColor: shape.color }}
                  >
                    <Icon size={48} color={shape.color} strokeWidth={1} />
                  </div>
                </div>
              );
            })}

            {currentShapes.map(
              (shape) =>
                !shape.matched && (
                  <div
                    key={`source-${shape.id}`}
                    draggable
                    onDragStart={(e) => handleDragStart(shape, e)}
                    style={{
                      left: shape.sourcePos.x,
                      top: shape.sourcePos.y,
                      backgroundColor: shape.color,
                    }}
                    className="draggable-shape"
                  >
                    <shape.icon size={48} color="white" />
                  </div>
                )
            )}
          </div>

          {gameEnded && (
            <div className="end-screen">
              <h2 className="end-title">Game Over!</h2>
              <p className="end-score">Final Score: {score}</p>
              <p className="end-moves">
                Mouse movements recorded: {mouseData.length}
              </p>
              <div className="end-buttons">
                <button onClick={startGame} className="play-again-button">
                  Play Again
                </button>
                <button onClick={downloadData} className="download-button">
                  <Download size={20} /> Download Data
                </button>
              </div>

              {loadingAnalysis && <p>Analyzing mouse data...</p>}

              {analysisResult && !loadingAnalysis && (
                <div className="analysis-box">
                  <h3>🧠 ADHD Analysis Result</h3>
                  <p>
                    <strong>Type:</strong> {analysisResult.adhd_type}
                  </p>
                  <p>
                    <strong>Confidence:</strong>{' '}
                    {analysisResult.confidence.toFixed(1)}%
                  </p>
                  <ul>
                    {Object.entries(analysisResult.classifications).map(
                      ([k, v]) => (
                        <li key={k}>
                          <strong>{k}:</strong> {v}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShapeGame;
