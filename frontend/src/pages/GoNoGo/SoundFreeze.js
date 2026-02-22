import React, { useState, useEffect, useRef } from "react";

const TOTAL_ROUNDS = 10;

const SoundFreeze = () => {
  const [screen, setScreen] = useState("instructions"); // instructions | play | results
  const [round, setRound] = useState(0);
  const [isFreeze, setIsFreeze] = useState(false);
  const [violations, setViolations] = useState(0);
  const [correctFreezes, setCorrectFreezes] = useState(0);
  const [reactionTimes, setReactionTimes] = useState([]);

  const freezeStartRef = useRef(null);
  const timerRef = useRef(null);

  //////////////////////////////////////////////////////
  // 🔊 Voice Guidance
  //////////////////////////////////////////////////////
  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 1.2;
    window.speechSynthesis.speak(utterance);
  };

  //////////////////////////////////////////////////////
  // ▶ Start Game
  //////////////////////////////////////////////////////
  const startGame = () => {
    setScreen("play");
    setRound(0);
    setViolations(0);
    setCorrectFreezes(0);
    setReactionTimes([]);
    speak("When you see green, tap the button. When you see red, do not tap.");
    nextRound(0);
  };

  //////////////////////////////////////////////////////
  // 🔁 Next Round
  //////////////////////////////////////////////////////
  const nextRound = (currentRound) => {
    if (currentRound >= TOTAL_ROUNDS) {
      finishGame();
      return;
    }

    const freezeRound = Math.random() > 0.5;
    setIsFreeze(freezeRound);

    if (freezeRound) {
      freezeStartRef.current = Date.now();
      speak("Freeze!");
    } else {
      speak("Go!");
    }

    timerRef.current = setTimeout(() => {
      setRound(currentRound + 1);
      nextRound(currentRound + 1);
    }, 2000);
  };

  //////////////////////////////////////////////////////
  // 👆 User Click
  //////////////////////////////////////////////////////
  const handleClick = () => {
    if (screen !== "play") return;

    if (isFreeze) {
      setViolations((v) => v + 1);
    } else {
      const rt = Date.now() - (freezeStartRef.current || Date.now());
      setReactionTimes((prev) => [...prev, rt]);
      setCorrectFreezes((c) => c + 1);
    }
  };

  //////////////////////////////////////////////////////
  // 🏁 Finish
  //////////////////////////////////////////////////////
  const finishGame = () => {
    clearTimeout(timerRef.current);
    setScreen("results");
    speak("Great job! Game finished!");
  };

  //////////////////////////////////////////////////////
  // ⭐ Star Rating
  //////////////////////////////////////////////////////
  const calculateStars = () => {
    const accuracy = correctFreezes / TOTAL_ROUNDS;
    if (accuracy > 0.8) return 3;
    if (accuracy > 0.5) return 2;
    return 1;
  };

  const avgRT =
    reactionTimes.length > 0
      ? Math.round(
          reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
        )
      : 0;

  //////////////////////////////////////////////////////

  return (
    <div className="gonogo-container">
      <div className="gonogo-screen">
        <div className="gonogo-card">
          {/* ================= INSTRUCTIONS ================= */}
          {screen === "instructions" && (
            <>
              <div className="gonogo-title-section">
                <span className="gonogo-game-icon">🎵</span>
                <h1 className="gonogo-game-title">Sound Freeze</h1>
                <p className="gonogo-game-subtitle">
                  Listen carefully and follow the rules!
                </p>
              </div>

              <div className="gonogo-instructions">
                <h2 className="gonogo-instructions-title">
                  How to Play
                </h2>

                <div className="gonogo-instruction-step">
                  <div className="gonogo-step-number">1</div>
                  <div className="gonogo-step-content">
                    <p className="gonogo-step-text">
                      When you see GREEN, tap the button.
                    </p>
                  </div>
                </div>

                <div className="gonogo-instruction-step">
                  <div className="gonogo-step-number">2</div>
                  <div className="gonogo-step-content">
                    <p className="gonogo-step-text">
                      When you see RED, do NOT tap.
                    </p>
                  </div>
                </div>
              </div>

              <button
                className="gonogo-btn gonogo-start-btn"
                onClick={startGame}
              >
                Start Game
              </button>
            </>
          )}

          {/* ================= PLAY SCREEN ================= */}
          {screen === "play" && (
            <>
              <div className="gonogo-progress-section">
                <span className="gonogo-round-text">
                  Round {round} / {TOTAL_ROUNDS}
                </span>
                <div className="gonogo-progress-bar">
                  <div
                    className="gonogo-progress-fill"
                    style={{
                      width: `${(round / TOTAL_ROUNDS) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="gonogo-signal-container">
                <div
                  className={`gonogo-signal ${
                    isFreeze
                      ? "gonogo-nogo-signal"
                      : "gonogo-go-signal"
                  }`}
                >
                  <span className="gonogo-signal-emoji">
                    {isFreeze ? "🛑" : "✅"}
                  </span>
                </div>
              </div>

              <button
                className="gonogo-btn gonogo-react-btn"
                onClick={handleClick}
              >
                TAP HERE
              </button>
            </>
          )}

          {/* ================= RESULTS ================= */}
          {screen === "results" && (
            <>
              <div className="gonogo-celebration-header">
                <span className="gonogo-celebration-emoji">🎉</span>
                <h2 className="gonogo-celebration-title">
                  Great Job!
                </h2>
              </div>

              <div className="gonogo-star-rating">
                {[1, 2, 3].map((star) => (
                  <span
                    key={star}
                    className={`gonogo-star ${
                      star <= calculateStars()
                        ? "gonogo-star-filled"
                        : "gonogo-star-empty"
                    }`}
                  >
                    ⭐
                  </span>
                ))}
              </div>

              <div className="gonogo-results-grid">
                <div className="gonogo-result-card gonogo-green-card">
                  <span className="gonogo-result-emoji">✅</span>
                  <span className="gonogo-result-number">
                    {correctFreezes}
                  </span>
                  <span className="gonogo-result-label">
                    Correct Taps
                  </span>
                </div>

                <div className="gonogo-result-card gonogo-red-card">
                  <span className="gonogo-result-emoji">❌</span>
                  <span className="gonogo-result-number">
                    {violations}
                  </span>
                  <span className="gonogo-result-label">
                    Wrong Taps
                  </span>
                </div>

                <div className="gonogo-result-card gonogo-blue-card">
                  <span className="gonogo-result-emoji">⚡</span>
                  <span className="gonogo-result-number">
                    {avgRT}
                  </span>
                  <span className="gonogo-result-label">
                    Avg Reaction (ms)
                  </span>
                </div>
              </div>

              <button
                className="gonogo-btn gonogo-play-again-btn"
                onClick={() => setScreen("instructions")}
              >
                Play Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SoundFreeze;