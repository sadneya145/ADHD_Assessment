"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import "./Nback.css";
import { useNavigate } from "react-router-dom";

export default function NBackTask() {
  // =================== 🎯 Game Constants ===================
  const STIMULI_SET = ["🐶", "🐱", "🐰", "🐸", "🦊", "🐻", "🐼", "🦁"];
  const TOTAL_ROUNDS = 20;
  const PRACTICE_ROUNDS = 5; // 🧪 Practice mode rounds
  const STIMULUS_DURATION = 1500;
  const INTER_STIMULUS_INTERVAL = 500;

  // =================== 🧠 States ===================
  const [gameState, setGameState] = useState("intro"); // intro ➝ practice ➝ instructions ➝ settings ➝ running ➝ finished
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
  const [showFeedback, setShowFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  // =================== 🧭 Scroll Management ===================
  useEffect(() => {
    window.scrollTo(0, 0);
    if ("scrollRestoration" in window.history)
      window.history.scrollRestoration = "manual";
    return () => {
      if ("scrollRestoration" in window.history)
        window.history.scrollRestoration = "auto";
    };
  }, []);

  // =================== 🧮 Sequence Generation ===================
  const generateSequence = useCallback(
    (rounds) => {
      const newSequence = [];
      for (let i = 0; i < rounds + nBack; i++) {
        const shouldMatch = i >= nBack && Math.random() < 0.3;
        if (shouldMatch) {
          newSequence.push(newSequence[i - nBack]);
        } else {
          let randomStimulus =
            STIMULI_SET[Math.floor(Math.random() * STIMULI_SET.length)];
          if (i >= nBack && randomStimulus === newSequence[i - nBack]) {
            randomStimulus =
              STIMULI_SET[
                (STIMULI_SET.indexOf(randomStimulus) + 1) % STIMULI_SET.length
              ];
          }
          newSequence.push(randomStimulus);
        }
      }
      setSequence(newSequence);
    },
    [nBack]
  );

  // =================== ⏩ Next Stimulus Logic ===================
  const nextStimulus = useCallback(() => {
    const rounds =
      gameState === "practice" ? PRACTICE_ROUNDS : TOTAL_ROUNDS;
    if (currentIndex >= nBack - 1 && currentIndex < rounds + nBack - 1) {
      const isTarget =
        sequence[currentIndex + 1] === sequence[currentIndex + 1 - nBack];
      if (!responded && isTarget && gameState !== "practice") {
        setScore((s) => ({ ...s, misses: s.misses + 1 }));
      }
    }
    setResponded(false);
    setShowFeedback(null);

    if (currentIndex < rounds + nBack - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      if (gameState === "practice") {
        setGameState("instructions"); // 👈 after practice go to real instructions
      } else {
        setGameState("finished");
      }
    }
  }, [currentIndex, nBack, responded, sequence, gameState]);

  // =================== 🕒 Stimulus Timer ===================
  useEffect(() => {
    if (gameState === "running" || gameState === "practice") {
      timerRef.current = setTimeout(
        nextStimulus,
        STIMULUS_DURATION + INTER_STIMULUS_INTERVAL
      );
    }
    return () => clearTimeout(timerRef.current);
  }, [gameState, currentIndex, nextStimulus]);

  // =================== ✨ Handle Response ===================
  const handleResponse = () => {
    if (responded) return;
    setResponded(true);
    const isTarget = sequence[currentIndex] === sequence[currentIndex - nBack];

    if (gameState === "practice") {
      setShowFeedback(isTarget ? "correct" : "incorrect");
      return; // ✅ No scoring during practice
    }

    if (isTarget) {
      setScore((s) => ({ ...s, hits: s.hits + 1 }));
      setShowFeedback("correct");
    } else {
      setScore((s) => ({ ...s, falseAlarms: s.falseAlarms + 1 }));
      setShowFeedback("incorrect");
    }
  };

  // =================== 👍 Correct Rejections ===================
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if ((gameState === "running" || gameState === "practice") && currentIndex >= nBack) {
        const isTarget = sequence[currentIndex] === sequence[currentIndex - nBack];
        if (!isTarget && !responded && gameState !== "practice") {
          setScore((s) => ({
            ...s,
            correctRejections: s.correctRejections + 1,
          }));
        }
      }
    }, STIMULUS_DURATION);
    return () => clearTimeout(timeoutId);
  }, [currentIndex, gameState, nBack, responded, sequence]);

  // =================== ▶️ Start Game ===================
  const startGame = () => {
    generateSequence(TOTAL_ROUNDS);
    setCurrentIndex(0);
    setScore({ hits: 0, misses: 0, falseAlarms: 0, correctRejections: 0 });
    setApiMessage(null);
    setGameState("running");
  };

  // =================== 🧪 Start Practice ===================
  const startPractice = () => {
    generateSequence(PRACTICE_ROUNDS);
    setCurrentIndex(0);
    setResponded(false);
    setShowFeedback(null);
    setGameState("practice");
  };

  // =================== 📨 Submit to Backend ===================
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
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No auth token found");

      const res = await fetch(
        "https://adhd-assessment-backend.onrender.com/api/assessments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (res.ok) {
        setApiMessage("✅ Results saved successfully!");
        setTimeout(() => navigate("/home/results"), 1000);
      } else {
        setApiMessage(`❌ Error: ${data.error || "Failed to save"}`);
      }
    } catch (error) {
      setApiMessage(`❌ Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (gameState === "finished") submitResultsToBackend();
  }, [gameState]);

  // =================== 🌟 Performance Message ===================
  const getPerformanceMessage = (accuracy) => {
    if (accuracy >= 90)
      return { emoji: "🌟", msg: "WOW! You're a SUPERSTAR!", color: "#FFD700" };
    if (accuracy >= 75)
      return { emoji: "⭐", msg: "Great Job! You're Amazing!", color: "#4CAF50" };
    if (accuracy >= 60)
      return { emoji: "✨", msg: "Good Work! Keep Practicing!", color: "#2196F3" };
    return {
      emoji: "💪",
      msg: "Nice Try! You'll Do Better Next Time!",
      color: "#FF9800",
    };
  };

  // =================== 🧾 UI SCREENS ===================

  // 📢 Intro with Sample
  if (gameState === "intro") {
    return (
      <div>
        <Header />
        <div className="instructions-container">
          <div className="instructions-card">
            <h1 className="fun-title">🧠 N-Back Memory Game!</h1>
            <p className="step-text">
              👉 When the same cute animal appears as it did <strong>n steps ago</strong>,
              press <strong>MATCH!</strong>
            </p>
            <p>✨ You'll try a short sample first before the real game.</p>
            <button className="btn start-btn" onClick={startPractice}>
              🧪 Try Sample Practice
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // 📜 Instructions after practice
  if (gameState === "instructions") {
    return (
      <div>
        <Header />
        <div className="instructions-container">
          <div className="instructions-card">
            <h1 className="fun-title">🎮 Memory Match Game! 🧠</h1>
            <p className="step-text">
              Press <strong>MATCH!</strong> if you see the same cute animal {nBack} step(s) ago!
            </p>
            <button
              className="btn start-btn"
              onClick={() => setGameState("settings")}
            >
              Let's Play! 🚀
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ⚙️ Settings
  if (gameState === "settings") {
    return (
      <div>
        <Header />
        <div className="settings-container">
          <h2 className="card-title">🎯 Choose Your Challenge!</h2>
          <div className="difficulty-container">
            <div className="difficulty-label">
              {nBack === 1 && "🌱 Easy"}
              {nBack === 2 && "⭐ Medium"}
              {nBack === 3 && "🔥 Hard"}
              {nBack === 4 && "💎 Expert"}
              {nBack === 5 && "🏆 Champion"}
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={nBack}
              onChange={(e) => setNBack(parseInt(e.target.value))}
              className="slider"
            />
          </div>
          <button className="btn play-btn" onClick={startGame}>
            Start Game 🎮
          </button>
          <button
            className="btn back-btn"
            onClick={() => setGameState("instructions")}
          >
            📖 Instructions
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  // 🏁 Finished
  if (gameState === "finished") {
    const totalTargets = score.hits + score.misses;
    const accuracy =
      totalTargets > 0 ? ((score.hits / totalTargets) * 100).toFixed(1) : 0;
    const performance = getPerformanceMessage(parseFloat(accuracy));
    return (
      <div>
        <Header />
        <div className="results-container">
          <div className="performance-badge" style={{ backgroundColor: performance.color }}>
            <div className="performance-emoji">{performance.emoji}</div>
            <h2 className="performance-title">{performance.msg}</h2>
          </div>
          <div className="accuracy-display">
            <div className="accuracy-number">{accuracy}%</div>
            <div className="accuracy-label">Accuracy</div>
          </div>
          <div className="stats-grid">
            <div className="stat-box hit-box">✅ Hits: {score.hits}</div>
            <div className="stat-box miss-box">😅 Misses: {score.misses}</div>
            <div className="stat-box false-box">⚠️ False Alarms: {score.falseAlarms}</div>
            <div className="stat-box correct-box">👍 Correct Rejections: {score.correctRejections}</div>
          </div>
          {apiMessage && <p>{apiMessage}</p>}
          <button
            className="btn play-again-btn"
            onClick={() => setGameState("settings")}
            disabled={loading}
          >
            {loading ? "⏳ Saving..." : "Play Again 🔄"}
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  // 🕹️ Game & Practice Running
  const totalRounds = gameState === "practice" ? PRACTICE_ROUNDS : TOTAL_ROUNDS;
  const progress = Math.max(0, currentIndex - nBack + 1);
  const progressPercent = (progress / totalRounds) * 100;

  return (
    <div>
      <Header />
      <div className="game-container">
        <div className="progress-section">
          <div className="progress-text">
            Round {progress} of {totalRounds}
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="stimulus-container">
          <div className="stimulus-box">
            {currentIndex >= nBack ? (
              <span className="stimulus">{sequence[currentIndex]}</span>
            ) : (
              <span className="get-ready">Get Ready! 🎯</span>
            )}
          </div>
          {showFeedback && (
            <div
              className={
                showFeedback === "correct"
                  ? "feedback-correct"
                  : "feedback-incorrect"
              }
            >
              {showFeedback === "correct" ? "✨ Great!" : "🤔 Not quite"}
            </div>
          )}
        </div>

        <button
          className={`btn match-button ${
            responded || currentIndex < nBack ? "disabled" : ""
          }`}
          onClick={handleResponse}
          disabled={responded || currentIndex < nBack}
        >
          {responded ? "⏳ Wait..." : "MATCH! 🎯"}
        </button>

        <div className="hint">
          💡 Remember: Look back {nBack} step{nBack > 1 ? "s" : ""}!
        </div>
      </div>
      <Footer />
    </div>
  );
}
