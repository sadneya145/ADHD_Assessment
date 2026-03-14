import React, { useState } from "react";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import "./Mood.css";

const Mood = () => {

  const [mood, setMood] = useState("");

  const moods = [
    { emoji: "😊", label: "Happy" },
    { emoji: "😐", label: "Okay" },
    { emoji: "😟", label: "Sad" },
    { emoji: "😡", label: "Angry" }
  ];

  return (
    <div className="focus-page">

      <Header />

      <main className="focus-main">

        <section className="focus-card">

          <h1>😊 Mood Check-in</h1>

          <p>How are you feeling today?</p>

          <div className="mood-grid">

            {moods.map((m, i) => (

              <button
                key={i}
                className="mood-btn"
                onClick={() => setMood(m.label)}
              >
                {m.emoji}
                <span>{m.label}</span>
              </button>

            ))}

          </div>

          {mood && (
            <p className="mood-result">
              You selected: {mood}
            </p>
          )}

        </section>

      </main>

      <Footer />

    </div>
  );
};

export default Mood;