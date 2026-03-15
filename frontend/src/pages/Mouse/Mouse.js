import React, { useState, useRef, useEffect, useCallback } from "react";
import { Circle, Square, Triangle, Star, Download } from "lucide-react";
import "./MouseAnalysis.css";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";

const BACKEND_URL = "https://adhd-assessment-backend.onrender.com";

const shapeTypes = [
  { id: "circle", color: "#FF6B6B", icon: Circle },
  { id: "square", color: "#4ECDC4", icon: Square },
  { id: "triangle", color: "#FFE66D", icon: Triangle },
  { id: "star", color: "#95E1D3", icon: Star }
];

const ShapeGame = () => {

  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentShapes, setCurrentShapes] = useState([]);
  const [draggedShape, setDraggedShape] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const startTimeRef = useRef(null);
  const gameAreaRef = useRef(null);

  // IMPORTANT: store mouse data in ref
  const mouseDataRef = useRef([]);

  const shapeIcons = {
    circle: Circle,
    square: Square,
    triangle: Triangle,
    star: Star
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Generate shapes
  const generateShapes = useCallback(() => {

    const shapes = shapeTypes.map((type, i) => ({
      ...type,
      sourcePos: { x: 60 + i * 120, y: 430 },
      targetPos: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 250 + 50
      },
      matched: false
    }));

    setCurrentShapes(shapes);

  }, []);

  // Start game
  const startGame = () => {

    setGameStarted(true);
    setGameEnded(false);
    setScore(0);
    setTimeLeft(60);
    setAnalysisResult(null);

    mouseDataRef.current = [];

    startTimeRef.current = Date.now();

    generateShapes();

  };

  // Timer
  useEffect(() => {

    if (!gameStarted || gameEnded) return;

    const timer = setInterval(() => {

      setTimeLeft(prev => {

        if (prev <= 1) {
          clearInterval(timer);
          setGameEnded(true);
          return 0;
        }

        return prev - 1;

      });

    }, 1000);

    return () => clearInterval(timer);

  }, [gameStarted, gameEnded]);

  // Run analysis AFTER game ends
  useEffect(() => {

    if (gameEnded && mouseDataRef.current.length > 0) {

      console.log("🎯 Game ended. Mouse points:", mouseDataRef.current.length);
      analyzeData();

    }

  }, [gameEnded]);

  // Track mouse
  const trackMouse = useCallback((e) => {

    if (!gameStarted || gameEnded) return;
    if (!gameAreaRef.current) return;

    const rect = gameAreaRef.current.getBoundingClientRect();

    const point = {
      time: (Date.now() - startTimeRef.current) / 1000,
      x: Math.round((e.clientX - rect.left) * 10) / 10,
      y: Math.round((e.clientY - rect.top) * 10) / 10
    };

    mouseDataRef.current.push(point);

  }, [gameStarted, gameEnded]);

  // Drag start
  const handleDragStart = (shape, e) => {

    setDraggedShape(shape);
    e.dataTransfer.effectAllowed = "move";

  };

  // Drop
  const handleDrop = (targetShape, e) => {

    e.preventDefault();

    if (!draggedShape || draggedShape.id !== targetShape.id) return;

    setCurrentShapes(prev =>
      prev.map(s =>
        s.id === targetShape.id ? { ...s, matched: true } : s
      )
    );

    setScore(prev => prev + 10);
    setDraggedShape(null);

    if (currentShapes.filter(s => !s.matched).length === 1) {
      setTimeout(generateShapes, 500);
    }

  };

  const handleDragOver = e => e.preventDefault();

  // Validate mouse data
  const validateMouseData = (data) => {

    if (!Array.isArray(data)) return false;
    if (data.length < 10) return false;

    const invalid = data.some(
      p => !isFinite(p.x) || !isFinite(p.y) || !isFinite(p.time)
    );

    if (invalid) return false;

    return true;

  };

  // Send to backend
  const analyzeData = async () => {

    const token = localStorage.getItem("token");

    const mouseData = mouseDataRef.current;

    console.log("Sending points:", mouseData.length);

    if (!validateMouseData(mouseData)) {

      setAnalysisResult({
        adhd_type: "Invalid Data",
        confidence: 0,
        classifications: { message: "Mouse data validation failed" }
      });

      return;

    }

    setLoadingAnalysis(true);

    try {

      const response = await fetch(`${BACKEND_URL}/api/analyze/mouse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(mouseData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Server error");
      }

      setAnalysisResult(result);

    } catch (err) {

      console.error("Analysis error:", err);

      setAnalysisResult({
        adhd_type: "Error",
        confidence: 0,
        classifications: { error: err.message }
      });

    } finally {
      setLoadingAnalysis(false);
    }

  };

  // Download mouse data
  const downloadData = () => {

    const dataStr = JSON.stringify(mouseDataRef.current, null, 2);

    const blob = new Blob([dataStr], { type: "application/json" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = "mouse_tracking_data.json";

    a.click();

  };

  return (

    <div>

      <Header />

      <div className="game-container-mouse">

        <div className="game-inner">

          {!gameStarted ? (

            <div className="start-screen">

              <h1 className="game-title">Shape Match Challenge</h1>

              <p>Drag shapes to their matching outlines!</p>

              <button onClick={startGame} className="start-button">
                Start Game
              </button>

            </div>

          ) : (

            <div className="game-content">

              <div className="status-bar">

                <div>Score: {score}</div>

                <div>Time: {timeLeft}s</div>

              </div>

              <div
                ref={gameAreaRef}
                onMouseMove={trackMouse}
                className="game-area"
              >

                {currentShapes.map(shape => {

                  const Icon = shapeIcons[shape.id];

                  return (

                    <div
                      key={"target-" + shape.id}
                      onDrop={e => handleDrop(shape, e)}
                      onDragOver={handleDragOver}
                      style={{
                        left: shape.targetPos.x,
                        top: shape.targetPos.y,
                        opacity: shape.matched ? 0.3 : 1
                      }}
                      className="target-shape"
                    >

                      <div
                        className="target-border"
                        style={{ borderColor: shape.color }}
                      >

                        <Icon size={48} color={shape.color} />

                      </div>

                    </div>

                  );

                })}

                {currentShapes.map(shape => {

                  const Icon = shapeIcons[shape.id];

                  if (shape.matched) return null;

                  return (

                    <div
                      key={"source-" + shape.id}
                      draggable
                      onDragStart={e => handleDragStart(shape, e)}
                      style={{
                        left: shape.sourcePos.x,
                        top: shape.sourcePos.y,
                        backgroundColor: shape.color
                      }}
                      className="draggable-shape"
                    >

                      <Icon size={48} color="white" />

                    </div>

                  );

                })}

              </div>

              {gameEnded && (

                <div className="end-screen">

                  <h2>Game Over!</h2>

                  <p>Final Score: {score}</p>

                  <p>
                    Mouse movements recorded: {mouseDataRef.current.length}
                  </p>

                  <button onClick={startGame}>
                    Play Again
                  </button>

                  <button onClick={downloadData}>
                    <Download size={18} /> Download Data
                  </button>

                  {loadingAnalysis && <p>Analyzing mouse data...</p>}

                  {analysisResult && !loadingAnalysis && (

                    <div className="analysis-box">

                      <h3>🧠 ADHD Analysis Result</h3>

                      <p>
                        <strong>Type:</strong> {analysisResult.adhd_type}
                      </p>

                      <p>
                        <strong>Confidence:</strong>{" "}
                        {analysisResult.confidence.toFixed(1)}%
                      </p>

                    </div>

                  )}

                </div>

              )}

            </div>

          )}

        </div>

      </div>

      <Footer />

    </div>

  );

};

export default ShapeGame;