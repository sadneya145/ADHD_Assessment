import React, { useState, useEffect } from "react";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import "./FocusTimer.css";

const FocusTimer = () => {

  const [time, setTime] = useState(1500);
  const [running, setRunning] = useState(false);

  useEffect(() => {

    let timer;

    if (running && time > 0) {
      timer = setInterval(() => {
        setTime((t) => t - 1);
      }, 1000);
    }

    return () => clearInterval(timer);

  }, [running, time]);

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  return (
    <div className="focus-page">

      <Header />

      <main className="focus-main">

        <section className="focus-card">

          <h1>🎯 Focus Timer</h1>

          <p>Work in short bursts to stay focused.</p>

          <div className="timer-display">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </div>

          <div className="timer-buttons">

            <button onClick={() => setRunning(true)}>Start</button>

            <button onClick={() => setRunning(false)}>Pause</button>

            <button
              onClick={() => {
                setTime(1500);
                setRunning(false);
              }}
            >
              Reset
            </button>

          </div>

        </section>

      </main>

      <Footer />

    </div>
  );
};

export default FocusTimer;