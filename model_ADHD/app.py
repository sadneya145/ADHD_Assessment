# app.py
import base64
import io
import time
import csv
from typing import Dict, Any

import cv2
import numpy as np
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

# If you want to run model prediction at the end:
try:
    import joblib
    from new import DomainSpecificEnsemble  # if you have this as a module
    MODEL = None
    SCALER = None
    # load your model/scaler here if you have serialized artifacts
    # MODEL = joblib.load("domain_ensemble.pkl")
    # SCALER = joblib.load("scaler.pkl")
except Exception:
    MODEL = None
    SCALER = None

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Haar cascades (OpenCV built-ins)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")
mouth_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_smile.xml")  # rough mouth detector

# Feature names expected by your model (from earlier)
FEATURE_NAMES = [
    'head_movement', 'head_movement_std', 'head_movement_max', 'head_movement_range',
    'neck_movement', 'neck_movement_std', 'shoulder_movement', 'shoulder_movement_std',
    'other_joints', 'torso_movement_variability', 'fidgeting_score', 'movement_consistency',
    'stroop_congruent_rt', 'stroop_incongruent_rt', 'stroop_effect',
    'stroop_error_incongruent', 'stroop_commission_errors',
    'nback_accuracy', 'nback_false_alarm', 'nback_latency', 'nback_load_sensitivity',
    'gonogo_commission', 'gonogo_omission', 'gonogo_rt_variability', 'gonogo_inhibition_score',
    'fixation_duration', 'num_regressions', 'saccade_fix_ratio', 'fixation_stability',
    'total_reading_time', 'reading_speed', 'attention_focus_mean', 'attention_variability',
    'attention_drops', 'blink_rate', 'behavioral_stability'
]

# In-memory session buffers for temporal aggregation
SESSIONS: Dict[str, Dict[str, Any]] = {}

# Defaults
FPS_ESTIMATE = 15.0  # used to convert frames -> ms for fixation estimates (adjust as needed)


def decode_base64_to_cv2(base64_str: str):
    # Accept strings like "data:image/jpeg;base64,/9j/..."
    if ',' in base64_str:
        base64_str = base64_str.split(',', 1)[1]
    img_data = base64.b64decode(base64_str)
    np_arr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return img


def init_session(session_id: str):
    now = time.time()
    SESSIONS[session_id] = {
        "created_at": now,
        "prev_gray": None,
        "prev_face_center": None,
        "movement_history": [],     # instantaneous movement magnitudes per frame
        "face_bbox_history": [],    # list of (x,y,w,h)
        "blink_count": 0,
        "frames_with_face": 0,
        "fixation_frames": 0,       # consecutive frames considered fixation
        "fixation_periods": [],     # durations in frames of fixation
        "rt_list": [],              # list of reaction times (ms) from taskData
        "gonogo": {
            "commission_count": 0,
            "omission_count": 0,
            "rt_values": []
        },
        "stroop": {
            "congruent_rts": [],
            "incongruent_rts": [],
            "errors_incongruent": 0,
            "commission_errors": 0
        },
        "nback": {
            "correct": 0,
            "false_alarms": 0,
            "latencies": []
        },
        # reading/oculomotor approximations
        "regressions": 0,
        "reading_time_frames": 0,
        "attention_drop_frames": 0,
        "blink_frames": 0,
        "last_fixation_small_movement_frames": 0
    }


def compute_optical_flow_magnitude(prev_gray, gray):
    # Use Farneback optical flow and return mean flow magnitude
    flow = cv2.calcOpticalFlowFarneback(prev_gray, gray, None,
                                        pyr_scale=0.5, levels=3, winsize=15,
                                        iterations=3, poly_n=5, poly_sigma=1.1, flags=0)
    mag, ang = cv2.cartToPolar(flow[..., 0], flow[..., 1])
    return float(np.mean(mag))


def is_fixation(movement_value, threshold_px=2.0):
    # If movement magnitude small -> fixation
    return movement_value < threshold_px


def extract_frame_level_features(img, session):
    """
    Returns instantaneous features computed from a single frame.
    Updates session state in-place.
    """
    features = {
        "face_detected": False,
        "head_movement_px": 0.0,
        "blink_now": False,
        "mouth_movement_intensity": 0.0,
        # We'll map to model names later
    }

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))

    # Optical flow-based motion magnitude (if prev frame exists)
    prev_gray = session.get("prev_gray")
    motion_mag = 0.0
    if prev_gray is not None:
        try:
            motion_mag = compute_optical_flow_magnitude(prev_gray, gray)
        except Exception:
            motion_mag = 0.0
    session["prev_gray"] = gray.copy()

    # Face & face-center
    if len(faces) > 0:
        x, y, w, h = faces[0]
        features["face_detected"] = True
        face_center = (int(x + w / 2), int(y + h / 2))

        # head movement using difference of face center in pixels
        prev_center = session.get("prev_face_center")
        if prev_center is not None:
            dx = face_center[0] - prev_center[0]
            dy = face_center[1] - prev_center[1]
            head_move = float(np.sqrt(dx * dx + dy * dy))
        else:
            head_move = 0.0

        session["prev_face_center"] = face_center
        session["movement_history"].append(head_move)
        session["face_bbox_history"].append((x, y, w, h))
        session["frames_with_face"] += 1
        features["head_movement_px"] = head_move

        # Eyes detection for blink approximation
        roi_gray = gray[y:y + int(h * 0.5), x:x + w]  # upper half for eyes
        eyes = eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.1, minNeighbors=3, minSize=(10, 10))
        # if fewer than two eye detections -> likely blink
        if len(eyes) < 2:
            features["blink_now"] = True
            session["blink_count"] += 1
            session["blink_frames"] += 1

        # Mouth movement approximation using lower-face intensity change
        lower_face = gray[y + int(h * 0.5):y + h, x:x + w]
        top_face = gray[y:y + int(h * 0.5), x:x + w]
        if lower_face.size > 0 and top_face.size > 0:
            mouth_intensity = float(np.mean(lower_face) - np.mean(top_face))
        else:
            mouth_intensity = 0.0
        features["mouth_movement_intensity"] = mouth_intensity

        # Fixation logic: small head move AND eyes detected -> count fixation frame
        if is_fixation(head_move, threshold_px=2.5) and len(eyes) >= 1:
            session["fixation_frames"] += 1
            session["last_fixation_small_movement_frames"] += 1
        else:
            if session["last_fixation_small_movement_frames"] > 0:
                # push a fixation period
                session["fixation_periods"].append(session["last_fixation_small_movement_frames"])
                session["last_fixation_small_movement_frames"] = 0

    else:
        # no face: increase attention drops
        session["attention_drop_frames"] += 1

    # Fidgeting estimate: variance of recent movement history
    recent = session["movement_history"][-10:] if len(session["movement_history"]) >= 1 else [0.0]
    fidgeting_score = float(np.std(recent))

    # Optical-flow overall motion as torso/other movement proxy
    optical_motion = motion_mag

    # Save computed quick features
    inst = {
        "motion_mag": optical_motion,
        "head_move_px": features["head_movement_px"],
        "blink_now": features["blink_now"],
        "mouth_movement": features["mouth_movement_intensity"],
        "fidgeting": fidgeting_score
    }

    # push a small buffer for optical motion
    session.setdefault("optical_motion_history", []).append(optical_motion)
    if len(session["optical_motion_history"]) > 300:
        session["optical_motion_history"].pop(0)

    return inst


def aggregate_session_features(session):
    """
    Converts accumulated session data into the feature vector expected by your model.
    Many fields are approximations because OpenCV-only can't compute exact joint angles or reading regressions.
    """
    # movement stats from head center movement
    mh = session.get("movement_history", [])
    if len(mh) == 0:
        head_mean = 0.0
        head_std = 0.0
        head_max = 0.0
        head_range = 0.0
    else:
        head_mean = float(np.mean(mh))
        head_std = float(np.std(mh))
        head_max = float(np.max(mh))
        head_range = float(np.max(mh) - np.min(mh))

    # approximate neck/shoulder movement using overall optical motion history
    om = session.get("optical_motion_history", [])
    if len(om) == 0:
        neck_mean = 0.0
        neck_std = 0.0
        shoulder_mean = 0.0
        shoulder_std = 0.0
    else:
        neck_mean = float(np.mean(om))
        neck_std = float(np.std(om))
        shoulder_mean = float(np.mean(om))  # same proxy
        shoulder_std = float(np.std(om))

    # movement consistency: low std -> consistent
    movement_consistency = 1.0 / (1.0 + head_std)

    # fidgeting score previously computed as std of last 10 frames
    fidgeting_score = float(np.mean([abs(x) for x in mh])) if mh else 0.0

    # executive task aggregates (stroop / nback / gonogo)
    stroop = session.get("stroop", {})
    gonogo = session.get("gonogo", {})
    nback = session.get("nback", {})

    # Stroop metrics
    try:
        stroop_congruent_rt = float(np.mean(stroop.get("congruent_rts", []) or [0.0]))
        stroop_incongruent_rt = float(np.mean(stroop.get("incongruent_rts", []) or [0.0]))
        stroop_effect = stroop_incongruent_rt - stroop_congruent_rt
        stroop_error_incongruent = int(stroop.get("errors_incongruent", 0))
        stroop_commission_errors = int(stroop.get("commission_errors", 0))
    except Exception:
        stroop_congruent_rt = stroop_incongruent_rt = stroop_effect = 0.0
        stroop_error_incongruent = stroop_commission_errors = 0

    # N-back metrics
    nback_accuracy = 0.0
    nback_false_alarm = int(nback.get("false_alarms", 0))
    nback_latency = float(np.mean(nback.get("latencies", []) or [0.0]))
    nback_load_sensitivity = 0.0  # needs experimental design; placeholder
    if "correct" in nback and "latencies" in nback:
        denom = (nback.get("correct", 0) + nback_false_alarm)
        if denom > 0:
            nback_accuracy = float(nback.get("correct", 0)) / denom

    # Go/No-Go metrics
    gonogo_commission = int(gonogo.get("commission_count", 0))
    gonogo_omission = int(gonogo.get("omission_count", 0))
    gonogo_rt_values = gonogo.get("rt_values", [])
    if len(gonogo_rt_values) > 0:
        gonogo_rt_variability = float(np.std(gonogo_rt_values))
        gonogo_inhibition_score = float(np.mean(gonogo_rt_values))
    else:
        gonogo_rt_variability = 0.0
        gonogo_inhibition_score = 0.0

    # Oculomotor features
    fixation_frames = session.get("fixation_frames", 0)
    fixation_duration_ms = (fixation_frames / FPS_ESTIMATE) * 1000.0
    num_regressions = int(session.get("regressions", 0))
    optical_motion_hist = session.get("optical_motion_history", [])
    saccade_fix_ratio = 0.0
    fixation_stability = 1.0 / (1.0 + np.std(optical_motion_hist)) if len(optical_motion_hist) else 0.0
    total_reading_time = float(session.get("reading_time_frames", 0) / FPS_ESTIMATE) * 1000.0
    reading_speed = 0.0  # can't estimate reading speed reliably without text/gaze
    attention_focus_mean = float(np.mean(optical_motion_hist) if optical_motion_hist else 0.0)
    attention_variability = float(np.std(optical_motion_hist) if optical_motion_hist else 0.0)
    attention_drops = int(session.get("attention_drop_frames", 0))
    blink_rate = float(session.get("blink_count", 0) / (max(1, (time.time() - session.get("created_at", time.time())) / 60.0)))  # blinks per minute
    behavioral_stability = movement_consistency

    # other joints, torso movement approximations (placeholders)
    other_joints = 0.0
    torso_movement_variability = float(np.std(optical_motion_hist) if optical_motion_hist else 0.0)

    # Build final dict mapping FEATURE_NAMES -> values
    features_map = {
        'head_movement': head_mean,
        'head_movement_std': head_std,
        'head_movement_max': head_max,
        'head_movement_range': head_range,
        'neck_movement': neck_mean,
        'neck_movement_std': neck_std,
        'shoulder_movement': shoulder_mean,
        'shoulder_movement_std': shoulder_std,
        'other_joints': other_joints,
        'torso_movement_variability': torso_movement_variability,
        'fidgeting_score': fidgeting_score,
        'movement_consistency': movement_consistency,
        'stroop_congruent_rt': stroop_congruent_rt,
        'stroop_incongruent_rt': stroop_incongruent_rt,
        'stroop_effect': stroop_effect,
        'stroop_error_incongruent': stroop_error_incongruent,
        'stroop_commission_errors': stroop_commission_errors,
        'nback_accuracy': nback_accuracy,
        'nback_false_alarm': nback_false_alarm,
        'nback_latency': nback_latency,
        'nback_load_sensitivity': nback_load_sensitivity,
        'gonogo_commission': gonogo_commission,
        'gonogo_omission': gonogo_omission,
        'gonogo_rt_variability': gonogo_rt_variability,
        'gonogo_inhibition_score': gonogo_inhibition_score,
        'fixation_duration': fixation_duration_ms,
        'num_regressions': num_regressions,
        'saccade_fix_ratio': saccade_fix_ratio,
        'fixation_stability': fixation_stability,
        'total_reading_time': total_reading_time,
        'reading_speed': reading_speed,
        'attention_focus_mean': attention_focus_mean,
        'attention_variability': attention_variability,
        'attention_drops': attention_drops,
        'blink_rate': blink_rate,
        'behavioral_stability': behavioral_stability
    }

    # Ensure order matches FEATURE_NAMES and fill missing -> 0.0
    final_vector = [float(features_map.get(k, 0.0)) for k in FEATURE_NAMES]
    return features_map, np.array(final_vector).reshape(1, -1)


@app.post("/predict")
async def predict(request: Request):
    """
    Expects JSON body:
    {
      "frame": "data:image/jpeg;base64,...",
      "taskData": { "taskType": "goNoGo", "signal": "Go", "round": 1, "response": true, "rt": 345, "gameState": "running" },
      "session_id": "user123"   # optional
    }
    """
    payload = await request.json()
    frame_b64 = payload.get("frame")
    task_data = payload.get("taskData", {}) or {}
    session_id = payload.get("session_id", "default")

    if session_id not in SESSIONS:
        init_session(session_id)
    session = SESSIONS[session_id]

    if not frame_b64:
        return {"error": "no frame provided"}

    # decode and extract per-frame instantaneous features
    try:
        img = decode_base64_to_cv2(frame_b64)
    except Exception as e:
        return {"error": f"frame decode error: {e}"}

    inst = extract_frame_level_features(img, session)

    # incorporate taskData into session-level counters (best-effort)
    # Expect taskData keys: taskType, signal, response (true/false), rt (ms), round, gameState
    task_type = task_data.get("taskType")
    game_state = task_data.get("gameState")
    rt = task_data.get("rt")

    # Runtimes for reaction-time tracking
    if rt is not None:
        try:
            session["rt_list"].append(float(rt))
        except Exception:
            pass

    # Go/No-Go bookkeeping
    if task_type == "goNoGo":
        sig = task_data.get("signal")
        responded = task_data.get("response")  # boolean: did user press?
        # Commission: responded on No-Go
        if sig == "No-Go":
            if responded:
                session["gonogo"]["commission_count"] += 1
            else:
                session["gonogo"]["omission_count"] += 1
        # Record RT if provided
        if rt is not None:
            session["gonogo"]["rt_values"].append(float(rt))

    # Stroop bookkeeping
    if task_type == "stroop":
        # assume taskData has 'incongruent' boolean and 'correct' boolean
        incongruent = task_data.get("incongruent", False)
        correct = task_data.get("correct", True)
        if incongruent:
            if rt is not None:
                session["stroop"]["incongruent_rts"].append(float(rt))
            if not correct:
                session["stroop"]["errors_incongruent"] += 1
        else:
            if rt is not None:
                session["stroop"]["congruent_rts"].append(float(rt))
        if not correct:
            session["stroop"]["commission_errors"] += 1

    # N-Back bookkeeping
    if task_type == "nBack":
        correct = task_data.get("correct", False)
        false_alarm = task_data.get("false_alarm", False)
        if correct:
            session["nback"]["correct"] += 1
        if false_alarm:
            session["nback"]["false_alarms"] += 1
        if rt is not None:
            session["nback"]["latencies"].append(float(rt))

    # Update reading/oculomotor placeholders if taskData informs it (optional)
    if task_data.get("reading", False):
        session["reading_time_frames"] += 1

    # compile aggregated features using current session data
    features_map, vector = aggregate_session_features(session)

    # Optionally: save per-frame extracted features to CSV for training/analysis
    # (appends one row per call)
    try:
        csv_row = {
            **{"session_id": session_id, "timestamp": time.time()},
            **{f"inst_{k}": v for k, v in inst.items()},
            **{k: features_map.get(k, 0.0) for k in FEATURE_NAMES}
        }
        csv_cols = list(csv_row.keys())
        # lazy append
        fn = "extracted_features_stream.csv"
        write_header = not os.path.exists(fn)
        with open(fn, "a", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=csv_cols)
            if write_header:
                writer.writeheader()
            writer.writerow(csv_row)
    except Exception:
        # silent failure for logging convenience
        pass

    # If the frontend indicated the session/game finished, optionally produce final prediction
    final_prediction = None
    final_probability = None
    if game_state == "finished":
        # scale and predict if MODEL & SCALER are available
        if MODEL is not None and SCALER is not None:
            try:
                x_scaled = SCALER.transform(vector)
                proba = MODEL.predict_proba(x_scaled, FEATURE_NAMES)[:, 1] if hasattr(MODEL, "predict_proba") else MODEL.predict_proba(x_scaled)[:, 1]
                final_probability = float(proba[0])
                final_prediction = int(final_probability > 0.5)
            except Exception as e:
                final_probability = None
                final_prediction = None

    # Return per-call features and optional final prediction
    return {
        "instantaneous": inst,
        "aggregated": features_map,
        "feature_vector": vector.tolist()[0],
        "prediction": final_prediction,
        "probability": final_probability,
        "session_id": session_id
    }
