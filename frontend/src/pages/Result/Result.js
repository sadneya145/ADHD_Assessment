"use client";
import React, { useEffect, useState } from "react";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import "./Result.css";

export default function ResultsPage() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setErrorMsg("❌ You must be logged in to view results.");
          setLoading(false);
          return;
        }

        const res = await fetch("https://adhd-assessment-backend.onrender.com/api/analysis/latest", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch results");
        const data = await res.json();
        setResult(data);
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  if (loading) {
    return (
      <div>
        <Header />
        <div className="results-container">
          <p>Loading results...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div>
        <Header />
        <div className="results-container">
          <p className="error">{errorMsg}</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!result) {
    return (
      <div>
        <Header />
        <div className="results-container">
          <p>No analysis results found. Please complete the tests first.</p>
        </div>
        <Footer />
      </div>
    );
  }

  // Safe values with defaults
  const compositeScore = result.composite_score ?? 0;
  const likelihood = result.likelihood ?? "Unknown";
  const riskLevel = (result.risk_level ?? "unknown").toLowerCase();

  const attentionScore = result.domain_scores?.attention ?? 0;
  const impulsivityScore = result.domain_scores?.impulsivity ?? 0;
  const workingMemoryScore = result.domain_scores?.working_memory ?? 0;

  const explanations = result.explanations || {};

  return (
    <div>
      <Header />
      <div className="results-container">
        <h2>Your ADHD Assessment Results</h2>

        {/* Overall risk summary */}
        <div className="summary-card">
          <h3>
            Overall Risk: <span className={`risk ${riskLevel}`}>{likelihood}</span>
          </h3>
          <p>
            Composite Score: <b>{compositeScore.toFixed(2)}</b> <br />
            ADHD Likelihood: <b>{likelihood}</b>
          </p>
        </div>

        {/* Domain breakdown */}
        <div className="domain-grid">
          <div className="domain-card">
            <h4>Attention</h4>
            <p>Score: {attentionScore}</p>
            <p>{explanations.attention}</p>
          </div>
          <div className="domain-card">
            <h4>Impulsivity</h4>
            <p>Score: {impulsivityScore}</p>
            <p>{explanations.impulsivity}</p>
          </div>
          <div className="domain-card">
            <h4>Working Memory</h4>
            <p>Score: {workingMemoryScore}</p>
            <p>{explanations.working_memory}</p>
          </div>
        </div>

        <div className="note">
          ⚠️ This assessment is <b>not a medical diagnosis</b>. Please consult a qualified professional for clinical evaluation.
        </div>

        <button className="download-btn" onClick={() => window.print()}>
          Download / Print Report
        </button>
      </div>
      <Footer />
    </div>
  );
}
