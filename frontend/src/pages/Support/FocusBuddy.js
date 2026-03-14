import React from "react";
import { Link } from "react-router-dom";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import "./FocusBuddy.css";

const FocusBuddy = () => {

  const features = [
    {
      title: "Focus Timer",
      description: "Work in short bursts to improve concentration.",
      icon: "🎯",
      link: "/home/focus-timer",
      color: "#95E1D3"
    },
     {
      title: "Talking Buddy",
      description: "Talk to your virtual focus assistant.",
      icon: "🤖",
      link: "/home/talking-buddy",
      color: "#FF6B6B"
    },
    {
      title: "Mood Check-in",
      description: "Tell us how you're feeling today.",
      icon: "😊",
      link: "/home/mood",
      color: "#FFE66D"
    },
    {
      title: "Calm Breathing",
      description: "Relax your mind with guided breathing.",
      icon: "🧘",
      link: "/home/breathing",
      color: "#FF6B6B"
    },
    {
      title: "Daily Timetable",
      description: "Plan your day step by step.",
      icon: "📅",
      link: "/home/timetable",
      color: "#4ECDC4"
    }
  ];

  return (
    <div className="focusbuddy-page">

      <Header />

      <main className="focusbuddy-main">

        {/* HERO */}
        <section className="focusbuddy-hero">

          <div className="hero-content">

            <h1 className="hero-title">
              Your Friendly Focus Buddy
            </h1>

            <p className="hero-subtitle">
              Tools to help kids manage focus, emotions, and daily tasks.
            </p>

          </div>

        </section>


        {/* FEATURES */}
        <section className="focusbuddy-features">

          <h2 className="section-title">
            Helpful Activities
          </h2>

          <div className="features-grid">

            {features.map((feature, index) => (

              <div
                key={index}
                className="feature-card"
                style={{ "--card-color": feature.color }}
              >

                <div className="feature-icon">
                  {feature.icon}
                </div>

                <h3 className="feature-title">
                  {feature.title}
                </h3>

                <p className="feature-description">
                  {feature.description}
                </p>

                {/* NAVIGATION FIX */}
                <Link to={feature.link} className="feature-btn">
                  Start
                </Link>

              </div>

            ))}

          </div>

        </section>

      </main>

      <Footer />

    </div>
  );
};

export default FocusBuddy;