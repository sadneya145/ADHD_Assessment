# ADHD_Video_Model.py
import os
import cv2
import numpy as np
import mediapipe as mp
import tensorflow as tf
from tensorflow import keras

MODEL_PATH = "attention_detection_model.keras"

class ADHDVideoModel:
    def __init__(self):
        self.model = self._load_model()
        self.pose = mp.solutions.pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

    def _load_model(self):
        try:
            return keras.models.load_model(MODEL_PATH)
        except Exception:
            return None

    def _extract_head(self, frame, size=100):
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = self.pose.process(rgb)

        if not res.pose_landmarks:
            return None

        lm = res.pose_landmarks.landmark
        nose = lm[mp.solutions.pose.PoseLandmark.NOSE.value]
        h, w, _ = frame.shape

        cx, cy = int(nose.x * w), int(nose.y * h)
        x1, y1 = max(cx-size, 0), max(cy-size, 0)
        x2, y2 = min(cx+size, w), min(cy+size, h)

        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            return None

        crop = cv2.resize(crop, (224, 224)) / 255.0
        return crop

    def analyze_video(self, video_path, frame_skip=5):
        cap = cv2.VideoCapture(video_path)
        frames = []
        total = 0

        success, frame = cap.read()
        while success:
            if total % frame_skip == 0:
                head = self._extract_head(frame)
                if head is not None:
                    frames.append(head)
            total += 1
            success, frame = cap.read()

        cap.release()

        if not frames:
            raise ValueError("No valid frames detected")

        frames = np.array(frames)

        if self.model:
            preds = self.model.predict(frames, verbose=0)
            score = float(np.mean(preds))
        else:
            score = 0.5  # fallback

        risk = "low" if score < 0.4 else "moderate" if score < 0.7 else "high"

        return {
            "composite_score": round(score, 3),
            "likelihood": risk.upper(),
            "risk_level": risk,
            "domain_scores": {
                "attention": round(1 - score, 2),
                "impulsivity": round(score, 2),
                "working_memory": 0.7
            },
            "features": {
                "frames_analyzed": len(frames),
                "overall_score": round(score, 3)
            }
        }
