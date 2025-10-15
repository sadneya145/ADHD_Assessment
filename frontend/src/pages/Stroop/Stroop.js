import React, { useState, useEffect, useCallback } from "react";
import "./Stroop.css";
import { Star, Trophy, Zap, ArrowRight } from "lucide-react";

const COLORS = [
  { name: "RED", hex: "#FF0000" },
  { name: "BLUE", hex: "#3399FF" },
  { name: "GREEN", hex: "#00C851" },
  { name: "YELLOW", hex: "#FFD600" },
];

const TOTAL_ROUNDS = 10;

export default function StroopTask() {
  const [gameState, setGameState] = useState("instructions"); // instructions | running | finished
  const [instructionStep, setInstructionStep] = useState(0);
  const [currentWord, setCurrentWord] = useState(null);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [reactionTimes, setReactionTimes] = useState([]);
  const [startTime, setStartTime] = useState(0);

  const generateNewWord = useCallback(() => {
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    let randomWord = COLORS[Math.floor(Math.random() * COLORS.length)];
    while (randomWord.name === randomColor.name) {
      randomWord = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
    setCurrentWord({ text: randomWord.name, color: randomColor.hex });
    setStartTime(Date.now());
  }, []);

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

  useEffect(() => {
    if (gameState === "running" && round < TOTAL_ROUNDS) {
      generateNewWord();
    } else if (round >= TOTAL_ROUNDS) {
      setGameState("finished");
    }
  }, [gameState, round, generateNewWord]);

  const handleColorClick = (colorHex) => {
    if (!currentWord) return;
    const reactionTime = Date.now() - startTime;
    setReactionTimes((prev) => [...prev, reactionTime]);
    
    const isCorrect = colorHex === currentWord.color;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    
    setRound((prev) => prev + 1);
  };

  const startGame = () => {
    setGameState("running");
    setRound(0);
    setScore(0);
    setReactionTimes([]);
    setCurrentWord(null);
  };

  const avgReactionTime =
    reactionTimes.length > 0
      ? (reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length).toFixed(0)
      : 0;

  const instructionSteps = [
    {
      title: "Welcome to the Stroop Test! 🎨",
      content: "This is a fun game to test how fast you can think!",
      visual: (
        <div className="visual-demo">
          <div className="demo-word" style={{ color: "#FF0000" }}>BLUE</div>
        </div>
      )
    },
    {
      title: "Here's How to Play:",
      content: "You'll see a COLOR WORD on the screen, but it will be written in a DIFFERENT color.",
      visual: (
        <div className="visual-demo">
          <div className="example-label">The word says:</div>
          <div className="demo-word demo-word-small" style={{ color: "#000" }}>GREEN</div>
          <div className="example-label">But it's colored:</div>
          <div className="demo-word demo-word-small" style={{ color: "#3399FF" }}>GREEN</div>
        </div>
      )
    },
    {
      title: "Your Mission:",
      content: "Click the button that matches the COLOR you see, NOT the word you read!",
      visual: (
        <div className="visual-demo">
          <div className="demo-word" style={{ color: "#FFD600", marginBottom: "20px" }}>RED</div>
          <div className="example-label">✓ Click YELLOW (the color!)</div>
          <div className="example-label">✗ Don't click RED (the word!)</div>
        </div>
      )
    },
    {
      title: "Let's Practice!",
      content: "What COLOR is this word?",
      visual: (
        <div className="visual-demo">
          <div className="demo-word" style={{ color: "#00C851" }}>BLUE</div>
          <div className="practice-buttons">
            {COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => {
                  if (color.hex === "#00C851") {
                    alert("🎉 Correct! You clicked GREEN! Ready to start?");
                    startGame();
                  } else {
                    alert("Not quite! Look at the COLOR, not the word. Try again!");
                  }
                }}
                className="practice-btn"
                style={{ backgroundColor: color.hex }}
              >
                {color.name}
              </button>
            ))}
          </div>
        </div>
      )
    }
  ];

  if (gameState === "instructions") {
    const currentStep = instructionSteps[instructionStep];
    
    return (
      <div className="stroop-container">
        <div className="instruction-card">
          <div className="progress-dots">
            {instructionSteps.map((_, index) => (
              <div
                key={index}
                className={`progress-dot ${index === instructionStep ? 'active' : ''}`}
              />
            ))}
          </div>
          
          <h2 className="instruction-title">{currentStep.title}</h2>
          <p className="instruction-text">{currentStep.content}</p>
          
          {currentStep.visual}
          
          <div className="button-group">
            {instructionStep > 0 && (
              <button
                onClick={() => setInstructionStep(instructionStep - 1)}
                className="nav-btn back-btn"
              >
                ← Back
              </button>
            )}
            
            {instructionStep < instructionSteps.length - 1 && (
              <button
                onClick={() => setInstructionStep(instructionStep + 1)}
                className="nav-btn next-btn"
              >
                Next <ArrowRight size={20} className="arrow-icon" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "finished") {
    const percentage = Math.round((score / TOTAL_ROUNDS) * 100);
    let message = "";
    let emoji = "";
    
    if (percentage >= 90) {
      message = "Amazing! You're a Color Champion!";
      emoji = "🏆";
    } else if (percentage >= 70) {
      message = "Great job! You did awesome!";
      emoji = "⭐";
    } else if (percentage >= 50) {
      message = "Good effort! Keep practicing!";
      emoji = "👍";
    } else {
      message = "Nice try! Want to play again?";
      emoji = "🎮";
    }

    return (
      <div className="stroop-container">
        <div className="result-card">
          <div className="trophy-icon">{emoji}</div>
          <h2 className="result-title">{message}</h2>
          
          <div className="score-circle">
            <div className="score-number">{score}</div>
            <div className="score-label">out of {TOTAL_ROUNDS}</div>
          </div>
          
          <div className="stats-grid">
            <div className="stat-box">
              <Star color="#FFD600" fill="#FFD600" size={32} />
              <div className="stat-number">{score}</div>
              <div className="stat-label">Correct</div>
            </div>
            
            <div className="stat-box">
              <Zap color="#FF6B6B" fill="#FF6B6B" size={32} />
              <div className="stat-number">{avgReactionTime}ms</div>
              <div className="stat-label">Avg Speed</div>
            </div>
          </div>
          
          <button onClick={startGame} className="play-again-btn">
            <Trophy size={20} className="trophy-btn-icon" />
            Play Again
          </button>
        </div>
      </div>
    );
  }

  const progress = ((round + 1) / TOTAL_ROUNDS) * 100;

  return (
    <div className="stroop-container">
      <div className="game-card">
        <div className="game-header">
          <div className="round-info">
            Round {round + 1} of {TOTAL_ROUNDS}
          </div>
          <div className="score-info">
            <Star color="#FFD600" fill="#FFD600" size={20} />
            <span className="score-number-inline">{score}</span>
          </div>
        </div>
        
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="word-display" style={{ color: currentWord?.color }}>
          {currentWord?.text}
        </div>

        <div className="buttons-grid">
          {COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => handleColorClick(color.hex)}
              className="color-btn"
              style={{ backgroundColor: color.hex }}
            >
              {color.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}