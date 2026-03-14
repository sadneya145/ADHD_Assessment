import React, { useState } from "react";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import "./Breathing.css";

const Breathing = () => {

  const [breathing, setBreathing] = useState(false);

  return (
    <div className="focus-page">

      <Header />

      <main className="focus-main">

        <section className="focus-card">

          <h1>🧘 Calm Breathing</h1>

          <p>Follow the circle and breathe slowly.</p>

          <div className={`breathing-circle ${breathing ? "animate" : ""}`}></div>

          <button onClick={() => setBreathing(!breathing)}>
            {breathing ? "Stop" : "Start Breathing"}
          </button>

        </section>

      </main>

      <Footer />

    </div>
  );
};

export default Breathing;