"use client";
import React, { useEffect, useState } from "react";
import { User, Calendar, TrendingUp, Clock, Eye, ChevronRight, Trash2, Edit } from "lucide-react";
import "./Profile.css";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    age: ""
  });

  useEffect(() => {
    fetchProfile();
    fetchAssessmentHistory();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to view your profile");
        setLoading(false);
        return;
      }

      const res = await fetch("https://adhd-assessment-backend.onrender.com/api/profile", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Failed to fetch profile");
      
      const data = await res.json();
      setProfile(data);
      setFormData({
        displayName: data.user.displayName || "",
        age: data.user.age || ""
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchAssessmentHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("https://adhd-assessment-backend.onrender.com/api/assessments/history?limit=20", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Failed to fetch history");
      
      const data = await res.json();
      setAssessments(data.assessments);
    } catch (err) {
      console.error("History error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("https://adhd-assessment-backend.onrender.com/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error("Failed to update profile");
      
      await fetchProfile();
      setEditing(false);
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    }
  };

  const handleDeleteAssessment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this assessment?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`https://adhd-assessment-backend.onrender.com/api/assessments/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error("Failed to delete assessment");
      
      setAssessments(prev => prev.filter(a => a._id !== id));
      await fetchProfile(); // Refresh stats
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const getLikelihoodColor = (likelihood) => {
    const colors = {
      "Low": "#4CAF50",
      "Low-Moderate": "#8BC34A",
      "Moderate": "#FFD600",
      "Moderate-High": "#FF9800",
      "High": "#FF6B6B"
    };
    return colors[likelihood] || "#9E9E9E";
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="error-box">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>My Profile</h1>
      </div>

      {/* Profile Info Card */}
      <div className="profile-card">
        <div className="profile-card-header">
          <div className="profile-avatar">
            {profile?.user?.photoURL ? (
              <img src={profile.user.photoURL} alt="Profile" />
            ) : (
              <User size={48} />
            )}
          </div>
          <div className="profile-info">
            <h2>{profile?.user?.displayName || "User"}</h2>
            <p className="profile-email">{profile?.user?.email}</p>
            <p className="profile-joined">
              <Calendar size={16} />
              Joined {new Date(profile?.user?.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button 
            className="edit-btn"
            onClick={() => setEditing(!editing)}
          >
            <Edit size={18} />
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {editing && (
          <form className="edit-form" onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                placeholder="Enter your name"
              />
            </div>
            <div className="form-group">
              <label>Age</label>
              <input
                type="number"
                min="5"
                max="100"
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: e.target.value})}
                placeholder="Enter your age"
              />
            </div>
            <button type="submit" className="save-btn">Save Changes</button>
          </form>
        )}

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Total Assessments</p>
              <p className="stat-value">{profile?.stats?.totalAssessments || 0}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Last Assessment</p>
              <p className="stat-value">
                {profile?.stats?.lastAssessment 
                  ? new Date(profile.stats.lastAssessment).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">Average Score</p>
              <p className="stat-value">
                {profile?.stats?.averageCompositeScore 
                  ? profile.stats.averageCompositeScore.toFixed(1)
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment History */}
      <div className="history-section">
        <h2 className="history-title">Assessment History</h2>
        
        {assessments.length === 0 ? (
          <div className="empty-state">
            <p>No assessments yet. Take your first test!</p>
          </div>
        ) : (
          <div className="history-list">
            {assessments.map((assessment) => (
              <div key={assessment._id} className="history-item">
                <div className="history-date">
                  <Calendar size={18} />
                  {new Date(assessment.completedAt).toLocaleDateString()}
                  <span className="history-time">
                    {new Date(assessment.completedAt).toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="history-details">
                  <div className="history-score">
                    <span className="score-label">Composite Score</span>
                    <span className="score-value">
                      {assessment.modelResult?.composite_score?.toFixed(1) || "N/A"}
                    </span>
                  </div>
                  
                  <div 
                    className="history-likelihood"
                    style={{ 
                      backgroundColor: getLikelihoodColor(assessment.modelResult?.likelihood) + "20",
                      color: getLikelihoodColor(assessment.modelResult?.likelihood)
                    }}
                  >
                    {assessment.modelResult?.likelihood || "Unknown"}
                  </div>
                  
                  {assessment.modelResult?.age_group && (
                    <div className="history-age-group">
                      Age Group: {assessment.modelResult.age_group}
                    </div>
                  )}
                </div>
                
                <div className="history-actions">
                  <button 
                    className="view-btn"
                    onClick={() => window.location.href = `/results?id=${assessment._id}`}
                  >
                    <Eye size={18} />
                    View
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteAssessment(assessment._id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}