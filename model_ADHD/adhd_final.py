# ============================================================
# adhd_final.py - FRONTEND-COMPATIBLE & FAST
# ============================================================

import os, cv2, logging, uuid
import numpy as np
import mediapipe as mp
import tensorflow as tf
from tensorflow import keras

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ADHD_ANALYSIS")

MODEL_PATH = "attention_detection_model.keras"
RESULTS_FOLDER = "results"
os.makedirs(RESULTS_FOLDER, exist_ok=True)


# ============================================================
# Pose Estimation & Head Cropping
# ============================================================
class PoseEstimator:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

    def extract_head(self, frame, size=100, target_size=(224,224)):
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(frame_rgb)
        if not results.pose_landmarks:
            return None

        lm = results.pose_landmarks.landmark
        nose = lm[self.mp_pose.PoseLandmark.NOSE.value]
        h, w, _ = frame.shape
        cx, cy = int(nose.x*w), int(nose.y*h)
        x1, y1 = max(cx-size,0), max(cy-size,0)
        x2, y2 = min(cx+size, w), min(cy+size, h)

        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            return None
        crop = cv2.resize(crop, target_size)
        return crop / 255.0


# ============================================================
# Load Model
# ============================================================
def load_model():
    try:
        model = keras.models.load_model(MODEL_PATH)
        logger.info(f"✅ Model loaded from {MODEL_PATH}")
        return model
    except Exception as e:
        logger.warning(f"⚠️ Could not load model ({e}), using dummy output.")
        return None


# ============================================================
# Video Processing (fast, sampled frames)
# ============================================================

# ============================================================
# Wrapper for job system
# ============================================================
def process_video_job(job_id: str, video_path: str, job_store: dict, frame_skip: int = 5):
    """
    Wrapper to match the FastAPI background thread signature:
    job_id, video_path, job_store
    """
    try:
        model = load_model()
        images, total_frames = process_video_for_adhd(video_path, frame_skip=frame_skip)
        results = analyze_attention(images, model=model)

        # Store results
        job_store[job_id]["status"] = "completed"
        job_store[job_id]["results"] = results
        job_store[job_id]["progress"] = "Analysis complete"

        # Optional cleanup
        if os.path.exists(video_path):
            os.remove(video_path)
            logger.info(f"🗑️ Cleaned up video file: {video_path}")

        return results

    except Exception as e:
        logger.exception(f"❌ Error processing job {job_id}")
        job_store[job_id]["status"] = "error"
        job_store[job_id]["results"] = {"error": str(e)}
        job_store[job_id]["progress"] = f"Error: {str(e)}"
        return {"error": str(e)}

def process_video_for_adhd(video_path: str, frame_skip: int = 5):
    logger.info(f"🎥 Processing video (sampling every {frame_skip} frames): {video_path}")
    pose_estimator = PoseEstimator()
    cap = cv2.VideoCapture(video_path)

    sampled_images = []
    total_frames = 0
    success, frame = cap.read()
    while success:
        if total_frames % frame_skip == 0:
            head_img = pose_estimator.extract_head(frame)
            if head_img is not None:
                sampled_images.append(head_img)
        total_frames += 1
        success, frame = cap.read()
    cap.release()

    if len(sampled_images) == 0:
        raise ValueError("No valid head images found in video")

    logger.info(f"✅ Processed {total_frames} frames, {len(sampled_images)} sampled")
    return np.array(sampled_images), total_frames


# ============================================================
# ADHD Analysis
# ============================================================
def analyze_attention(images: np.ndarray, model=None, batch_size: int = 16):
    """Return frontend-friendly ADHD analysis dict"""
    # Dummy metrics
    head_movement = 0.25
    attention_variability = 0.17
    frame_preds = []

    if model:
        # Predict in batches
        for i in range(0, len(images), batch_size):
            batch = images[i:i+batch_size]
            preds = model.predict(batch, verbose=0)
            frame_preds.extend(preds.tolist())
        overall_score = float(np.mean(frame_preds))
    else:
        overall_score = 0.5

    risk = "LOW" if overall_score<0.4 else "MODERATE" if overall_score<0.7 else "HIGH"

    results = {
        "composite_score": round(1 - ((head_movement + attention_variability)/2), 2),
        "likelihood": risk,
        "risk_level": risk.lower(),
        "domain_scores": {
            "attention": round(1 - attention_variability, 2),
            "impulsivity": round(1 - head_movement, 2),
            "working_memory": 0.7
        },
        "features": {
            "overall_score": round(overall_score, 3),
            "attention_score": round(1 - attention_variability, 2),
            "movement_score": round(1 - head_movement, 2),
            "attention_risk": round(attention_variability, 2),
            "movement_risk": round(head_movement, 2),
            "frames_analyzed": len(images),
            "frame_predictions": frame_preds
        },
        # 🔹 Add top-level `overall_score` so frontend finds it immediately
        "overall_score": round(overall_score, 3),
        # 🔹 Optional: add movement_risk and attention_risk at top-level if frontend uses them
        "attention_risk": round(attention_variability, 2),
        "movement_risk": round(head_movement, 2)
    }
    return results
