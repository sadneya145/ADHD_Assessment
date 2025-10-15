"use client";
import React, { useEffect, useState } from "react";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import "./Result.css";
import { AlertCircle, Brain, Eye, Zap, Download, CheckCircle, AlertTriangle, XCircle, Star, Target } from "lucide-react";

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
        <div className="results-wrapper">
          <div className="results-container">
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <h2 className="loading-text">Loading your results...</h2>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div>
        <Header />
        <div className="results-wrapper">
          <div className="results-container">
            <div className="error-state">
              <AlertCircle size={64} color="#ff6b6b" />
              <h2 className="error-title">Oops!</h2>
              <p className="error-message">{errorMsg}</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!result) {
    return (
      <div>
        <Header />
        <div className="results-wrapper">
          <div className="results-container">
            <div className="error-state">
              <span className="no-results-icon">📋</span>
              <h2 className="error-title">No Results Yet</h2>
              <p className="error-message">Please complete the tests first to see your results!</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const compositeScore = result.composite_score ?? 0;
  const likelihood = result.likelihood ?? "Unknown";
  const riskLevel = (result.risk_level ?? "unknown").toLowerCase();

  const attentionScore = result.domain_scores?.attention ?? 0;
  const impulsivityScore = result.domain_scores?.impulsivity ?? 0;
  const workingMemoryScore = result.domain_scores?.working_memory ?? 0;

  const explanations = result.explanations || {};

  const getRiskBadgeInfo = (risk) => {
    switch (risk) {
      case "low":
        return { icon: <CheckCircle size={24} />, bgColor: "#d4edda", textColor: "#155724" };
      case "moderate":
        return { icon: <AlertTriangle size={24} />, bgColor: "#fff3cd", textColor: "#856404" };
      case "high":
        return { icon: <XCircle size={24} />, bgColor: "#f8d7da", textColor: "#721c24" };
      default:
        return { icon: <AlertCircle size={24} />, bgColor: "#d1ecf1", textColor: "#0c5460" };
    }
  };

  const riskInfo = getRiskBadgeInfo(riskLevel);

  const getScoreColor = (score) => {
    if (score >= 80) return "#4CAF50";
    if (score >= 60) return "#FFD600";
    if (score >= 40) return "#FF9800";
    return "#FF6B6B";
  };

  const getPerformanceEmoji = (score) => {
    if (score >= 80) return "🌟";
    if (score >= 60) return "⭐";
    if (score >= 40) return "💫";
    return "✨";
  };

  return (
    <div>
      <Header />
      <div className="results-wrapper">
        <div className="results-container">
          {/* Header */}
          <div className="page-header">
            <h1 className="page-title">Your Assessment Results!</h1>
          </div>

          {/* Main Risk Card */}
          <div className="risk-card">
            <div className="risk-card-header">
              <div className="risk-title-section">
                <Target size={32} style={{ color: "#667eea" }} />
                <h2 className="risk-card-title">Overall Risk</h2>
              </div>
              <div 
                className="risk-badge"
                style={{ backgroundColor: riskInfo.bgColor, color: riskInfo.textColor }}
              >
                {riskInfo.icon}
                <span className="risk-badge-text">{likelihood}</span>
              </div>
            </div>

            <div className="risk-card-content">
              <div className="score-display">
                <div className="score-circle">
                  <div className="score-number">{compositeScore.toFixed(1)}</div>
                  <div className="score-label">Composite Score</div>
                </div>
                <div className="likelihood-box">
                  <div className="likelihood-label">ADHD Likelihood</div>
                  <div className="likelihood-value">{likelihood}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Fun Section Title */}
          <div className="section-header">
            
            <h2 className="section-title">Your Super Skills!</h2>
            
          </div>

          {/* Domain Cards - Side by Side */}
          <div className="domain-grid">
            {/* Attention Card */}
            <div className="domain-card">
              <div className="domain-icon-wrapper attention-gradient">
                <Eye size={40} color="white" />
              </div>
              <h3 className="domain-title">👁️ Attention</h3>
              
              <div className="progress-ring">
                <svg width="120" height="120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#f0f0f0" strokeWidth="10"/>
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke={getScoreColor(attentionScore)}
                    strokeWidth="10"
                    strokeDasharray={`${attentionScore * 3.14} 314`}
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                  />
                </svg>
                <div className="ring-score">
                  <span className="ring-score-emoji">{getPerformanceEmoji(attentionScore)}</span>
                  <span className="ring-score-number">{attentionScore}</span>
                </div>
              </div>

              <div className="domain-score-box">
                <div className="domain-score-line">
                  <span>Score:</span>
                  <strong>{attentionScore}</strong>
                </div>
                <div className="domain-score-line">
                  <span>Attention:</span>
                  <strong>{attentionScore}</strong>
                </div>
              </div>

              <p className="domain-explanation">
                {explanations.attention || "Your ability to focus and stay on task."}
              </p>
            </div>

            {/* Impulsivity Card */}
            <div className="domain-card">
              <div className="domain-icon-wrapper impulsivity-gradient">
                <Zap size={40} color="white" />
              </div>
              <h3 className="domain-title">⚡ Impulsivity</h3>
              
              <div className="progress-ring">
                <svg width="120" height="120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#f0f0f0" strokeWidth="10"/>
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke={getScoreColor(impulsivityScore)}
                    strokeWidth="10"
                    strokeDasharray={`${impulsivityScore * 3.14} 314`}
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                  />
                </svg>
                <div className="ring-score">
                  <span className="ring-score-emoji">{getPerformanceEmoji(impulsivityScore)}</span>
                  <span className="ring-score-number">{impulsivityScore}</span>
                </div>
              </div>

              <div className="domain-score-box">
                <div className="domain-score-line">
                  <span>Score:</span>
                  <strong>{impulsivityScore}</strong>
                </div>
                <div className="domain-score-line">
                  <span>Impulsivity:</span>
                  <strong>{impulsivityScore}</strong>
                </div>
              </div>

              <p className="domain-explanation">
                {explanations.impulsivity || "Your ability to control impulses and reactions."}
              </p>
            </div>

            {/* Working Memory Card */}
            <div className="domain-card">
              <div className="domain-icon-wrapper memory-gradient">
                <Brain size={40} color="white" />
              </div>
              <h3 className="domain-title">🧠 Memory</h3>
              
              <div className="progress-ring">
                <svg width="120" height="120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#f0f0f0" strokeWidth="10"/>
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke={getScoreColor(workingMemoryScore)}
                    strokeWidth="10"
                    strokeDasharray={`${workingMemoryScore * 3.14} 314`}
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                  />
                </svg>
                <div className="ring-score">
                  <span className="ring-score-emoji">{getPerformanceEmoji(workingMemoryScore)}</span>
                  <span className="ring-score-number">{workingMemoryScore}</span>
                </div>
              </div>

              <div className="domain-score-box">
                <div className="domain-score-line">
                  <span>Score:</span>
                  <strong>{workingMemoryScore}</strong>
                </div>
                <div className="domain-score-line">
                  <span>Memory:</span>
                  <strong>{workingMemoryScore}</strong>
                </div>
              </div>

              <p className="domain-explanation">
                {explanations.working_memory || "Your ability to remember and use information."}
              </p>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="disclaimer">
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <p className="disclaimer-text">
              <strong>Important:</strong> This assessment is not a medical diagnosis. Please consult a qualified healthcare professional for a complete evaluation.
            </p>
          </div>

          {/* Download Button */}
          <div className="actions">
            <button className="download-btn" onClick={() => window.print()}>
              <Download size={20} />
              <span>Download / Print Report</span>
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}