
import React, { useState, useRef, useEffect, useCallback } from "react";
import './WebcamAttentiveness.css';

const ANALYSIS_INTERVAL = 5000; // 5 seconds

export default function WebcamAttentiveness() {
  const [status, setStatus] = useState("idle"); // idle | initializing | running | processing | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const intervalRef = useRef(null);

  // 🔹 Dummy function (replace with your AI function)
  const detectAttentiveness = async ({ webcamDataUri }) => {
    // Fake AI result (random)
    const levels = ["High", "Medium", "Low"];
    return {
      attentivenessLevel: levels[Math.floor(Math.random() * levels.length)],
    };
  };

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const startCamera = async () => {
    setStatus("initializing");
    setError(null);
    setResult(null);

    if (mediaStreamRef.current) stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setStatus("running");
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Camera access was denied.");
      setStatus("error");
    }
  };

  const analyzeFrame = useCallback(async () => {
    if (status !== "running" || !videoRef.current || !canvasRef.current) return;

    setStatus("processing");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUri = canvas.toDataURL("image/jpeg");

    try {
      const analysis = await detectAttentiveness({ webcamDataUri: dataUri });
      setResult(analysis);
    } catch {
      setError("Analysis failed.");
      setStatus("error");
      return;
    }

    setStatus("running");
  }, [status]);

  // 🔹 Run analysis every 5s
  useEffect(() => {
    if (status === "running") {
      intervalRef.current = setInterval(() => {
        setProgress(0);
        analyzeFrame();
      }, ANALYSIS_INTERVAL);
    }
    return () => clearInterval(intervalRef.current);
  }, [status, analyzeFrame]);

  // 🔹 Progress bar animation
  useEffect(() => {
    let progressInterval = null;
    if (status === "running") {
      progressInterval = setInterval(() => {
        setProgress((p) => (p >= 100 ? 0 : p + 2));
      }, 100);
    } else {
      setProgress(0);
    }
    return () => clearInterval(progressInterval);
  }, [status]);

  // 🔹 Stop camera when leaving page
  useEffect(() => stopCamera, [stopCamera]);

  return (
    <div className="att-container">
      <div className="video-box">
        <video ref={videoRef} className="video" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
        {status === "idle" && <p className="placeholder">📷 Start Camera</p>}
        {status === "error" && <p className="error">❌ {error}</p>}
        {status === "initializing" && <p className="loading">⏳ Initializing...</p>}
      </div>

      {status === "running" && (
        <div className="progress-bar">
          <div className="progress" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="controls">
        <button onClick={startCamera} disabled={status === "running" || status === "initializing"}>
          ▶️ Start Camera
        </button>
        <button onClick={() => { stopCamera(); setStatus("idle"); }} disabled={status === "idle"}>
          ⏹ Stop Camera
        </button>
      </div>

      {result && (
        <div className="result">
          <p>Current Attentiveness Level:</p>
          <span className={`badge ${result.attentivenessLevel.toLowerCase()}`}>
            {result.attentivenessLevel}
          </span>
        </div>
      )}

      {status === "processing" && <p className="loading">🔍 Analyzing...</p>}
    </div>
  );
}
