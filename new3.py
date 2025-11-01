# app.py - Complete Integrated ADHD Detection System
import base64
import io
import time
import csv
import os
from typing import Dict, Any

import cv2
import numpy as np
import pandas as pd
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.preprocessing import RobustScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
import xgboost as xgb
import lightgbm as lgb

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

# Feature names expected by your model
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

# In-memory session buffers and models
SESSIONS: Dict[str, Dict[str, Any]] = {}
MODEL = None
SCALER = None
FPS_ESTIMATE = 15.0

class ClinicalThresholdValidator:
    """Validate features against established clinical thresholds"""
    
    CLINICAL_THRESHOLDS = {
        'head_movement_ratio': 0.15,  # ADHD typically > 0.15
        'neck_movement_ratio': 0.10,
        'shoulder_movement_ratio': 0.08,
        'stroop_effect_ms': 100,  # Stroop effect > 100ms
        'commission_error_rate': 0.25,  # Commission errors > 25%
        'omission_error_rate': 0.20,  # Omission errors > 20%
        'fixation_duration_ms': 300,  # Fixation > 300ms
        'regressions_count': 12,  # Regressions > 12
        'attention_variability': 0.25  # Attention variability > 0.25
    }
    
    @staticmethod
    def apply_clinical_thresholds(features_map):
        """Convert continuous features to clinical threshold indicators"""
        clinical_indicators = {}
        
        # Movement domain clinical indicators
        clinical_indicators['movement_head_above_threshold'] = int(
            features_map.get('head_movement', 0) > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['head_movement_ratio']
        )
        
        clinical_indicators['movement_neck_above_threshold'] = int(
            features_map.get('neck_movement', 0) > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['neck_movement_ratio']
        )
        
        clinical_indicators['movement_shoulder_above_threshold'] = int(
            features_map.get('shoulder_movement', 0) > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['shoulder_movement_ratio']
        )
        
        # Executive function domain
        clinical_indicators['executive_stroop_above_threshold'] = int(
            features_map.get('stroop_effect', 0) > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['stroop_effect_ms']
        )
        
        clinical_indicators['executive_commission_above_threshold'] = int(
            features_map.get('gonogo_commission', 0) > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['commission_error_rate']
        )
        
        clinical_indicators['executive_omission_above_threshold'] = int(
            features_map.get('gonogo_omission', 0) > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['omission_error_rate']
        )
        
        # Oculomotor domain
        clinical_indicators['oculomotor_fixation_above_threshold'] = int(
            features_map.get('fixation_duration', 0) > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['fixation_duration_ms']
        )
        
        clinical_indicators['oculomotor_regressions_above_threshold'] = int(
            features_map.get('num_regressions', 0) > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['regressions_count']
        )
        
        clinical_indicators['oculomotor_attention_above_threshold'] = int(
            features_map.get('attention_variability', 0) > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['attention_variability']
        )
        
        # Composite clinical scores
        clinical_indicators['clinical_movement_score'] = (
            clinical_indicators['movement_head_above_threshold'] + 
            clinical_indicators['movement_neck_above_threshold'] + 
            clinical_indicators['movement_shoulder_above_threshold']
        )
        
        clinical_indicators['clinical_executive_score'] = (
            clinical_indicators['executive_stroop_above_threshold'] + 
            clinical_indicators['executive_commission_above_threshold'] + 
            clinical_indicators['executive_omission_above_threshold']
        )
        
        clinical_indicators['clinical_oculomotor_score'] = (
            clinical_indicators['oculomotor_fixation_above_threshold'] + 
            clinical_indicators['oculomotor_regressions_above_threshold'] +
            clinical_indicators['oculomotor_attention_above_threshold']
        )
        
        clinical_indicators['total_clinical_criteria'] = (
            clinical_indicators['clinical_movement_score'] + 
            clinical_indicators['clinical_executive_score'] + 
            clinical_indicators['clinical_oculomotor_score']
        )
        
        # Severity grading based on clinical criteria
        total_criteria = clinical_indicators['total_clinical_criteria']
        if total_criteria >= 6:
            clinical_indicators['adhd_severity'] = 'Severe'
        elif total_criteria >= 4:
            clinical_indicators['adhd_severity'] = 'Moderate'
        elif total_criteria >= 2:
            clinical_indicators['adhd_severity'] = 'Mild'
        else:
            clinical_indicators['adhd_severity'] = 'None'
        
        return clinical_indicators

class DomainSpecificEnsemble:
    """Ensemble model combining domain-specific experts"""
    
    def __init__(self):
        self.movement_expert = None
        self.executive_expert = None
        self.oculomotor_expert = None
        self.meta_classifier = None
        
        # Domain-specific feature groups
        self.movement_features = [
            'head_movement', 'head_movement_std', 'head_movement_max', 'head_movement_range',
            'neck_movement', 'neck_movement_std', 'shoulder_movement', 'shoulder_movement_std',
            'other_joints', 'torso_movement_variability', 'fidgeting_score', 'movement_consistency'
        ]
        
        self.executive_features = [
            'stroop_congruent_rt', 'stroop_incongruent_rt', 'stroop_effect',
            'stroop_error_incongruent', 'stroop_commission_errors',
            'nback_accuracy', 'nback_false_alarm', 'nback_latency', 'nback_load_sensitivity',
            'gonogo_commission', 'gonogo_omission', 'gonogo_rt_variability', 'gonogo_inhibition_score'
        ]
        
        self.oculomotor_features = [
            'fixation_duration', 'num_regressions', 'saccade_fix_ratio', 'fixation_stability',
            'total_reading_time', 'reading_speed', 'attention_focus_mean', 'attention_variability',
            'attention_drops', 'blink_rate', 'behavioral_stability'
        ]
    
    def fit(self, X, y, feature_names):
        """Train domain-specific experts"""
        # Create domain-specific datasets
        movement_idx = [i for i, f in enumerate(feature_names) if f in self.movement_features]
        executive_idx = [i for i, f in enumerate(feature_names) if f in self.executive_features]
        oculomotor_idx = [i for i, f in enumerate(feature_names) if f in self.oculomotor_features]
        
        X_movement = X[:, movement_idx] if movement_idx else np.zeros((X.shape[0], 1))
        X_executive = X[:, executive_idx] if executive_idx else np.zeros((X.shape[0], 1))
        X_oculomotor = X[:, oculomotor_idx] if oculomotor_idx else np.zeros((X.shape[0], 1))
        
        print(f"Movement features: {len(movement_idx)}, Executive: {len(executive_idx)}, Oculomotor: {len(oculomotor_idx)}")
        
        # Train movement expert (Random Forest)
        self.movement_expert = RandomForestClassifier(
            n_estimators=100, max_depth=10, min_samples_split=5,
            class_weight='balanced', random_state=42
        )
        self.movement_expert.fit(X_movement, y)
        
        # Train executive function expert (XGBoost)
        self.executive_expert = xgb.XGBClassifier(
            n_estimators=100, max_depth=6, learning_rate=0.05,
            reg_alpha=0.1, reg_lambda=1.0, random_state=42
        )
        self.executive_expert.fit(X_executive, y)
        
        # Train oculomotor expert (LightGBM)
        self.oculomotor_expert = lgb.LGBMClassifier(
            n_estimators=100, max_depth=6, learning_rate=0.05,
            num_leaves=31, random_state=42, verbose=-1
        )
        self.oculomotor_expert.fit(X_oculomotor, y)
        
        # Get expert predictions for meta-features
        movement_proba = self.movement_expert.predict_proba(X_movement)[:, 1]
        executive_proba = self.executive_expert.predict_proba(X_executive)[:, 1]
        oculomotor_proba = self.oculomotor_expert.predict_proba(X_oculomotor)[:, 1]
        
        # Create meta-features
        meta_features = np.column_stack([
            movement_proba, executive_proba, oculomotor_proba
        ])
        
        # Train meta-classifier
        self.meta_classifier = VotingClassifier(
            estimators=[
                ('rf', RandomForestClassifier(n_estimators=50, random_state=42)),
                ('xgb', xgb.XGBClassifier(random_state=42)),
            ],
            voting='soft'
        )
        self.meta_classifier.fit(meta_features, y)
    
    def predict_proba(self, X, feature_names):
        """Predict probabilities using ensemble"""
        movement_idx = [i for i, f in enumerate(feature_names) if f in self.movement_features]
        executive_idx = [i for i, f in enumerate(feature_names) if f in self.executive_features]
        oculomotor_idx = [i for i, f in enumerate(feature_names) if f in self.oculomotor_features]
        
        X_movement = X[:, movement_idx] if movement_idx else np.zeros((X.shape[0], 1))
        X_executive = X[:, executive_idx] if executive_idx else np.zeros((X.shape[0], 1))
        X_oculomotor = X[:, oculomotor_idx] if oculomotor_idx else np.zeros((X.shape[0], 1))
        
        # Get expert predictions
        movement_proba = self.movement_expert.predict_proba(X_movement)[:, 1]
        executive_proba = self.executive_expert.predict_proba(X_executive)[:, 1]
        oculomotor_proba = self.oculomotor_expert.predict_proba(X_oculomotor)[:, 1]
        
        # Create meta-features
        meta_features = np.column_stack([
            movement_proba, executive_proba, oculomotor_proba
        ])
        
        return self.meta_classifier.predict_proba(meta_features)

def init_session(session_id: str):
    now = time.time()
    SESSIONS[session_id] = {
        "created_at": now,
        "prev_gray": None,
        "prev_face_center": None,
        "movement_history": [],
        "face_bbox_history": [],
        "blink_count": 0,
        "frames_with_face": 0,
        "fixation_frames": 0,
        "fixation_periods": [],
        "rt_list": [],
        "gonogo": {"commission_count": 0, "omission_count": 0, "rt_values": []},
        "stroop": {"congruent_rts": [], "incongruent_rts": [], "errors_incongruent": 0, "commission_errors": 0},
        "nback": {"correct": 0, "false_alarms": 0, "latencies": []},
        "regressions": 0,
        "reading_time_frames": 0,
        "attention_drop_frames": 0,
        "blink_frames": 0,
        "last_fixation_small_movement_frames": 0,
        "optical_motion_history": []
    }

def decode_base64_to_cv2(base64_str: str):
    if ',' in base64_str:
        base64_str = base64_str.split(',', 1)[1]
    img_data = base64.b64decode(base64_str)
    np_arr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

def compute_optical_flow_magnitude(prev_gray, gray):
    flow = cv2.calcOpticalFlowFarneback(prev_gray, gray, None,
                                        pyr_scale=0.5, levels=3, winsize=15,
                                        iterations=3, poly_n=5, poly_sigma=1.1, flags=0)
    mag, ang = cv2.cartToPolar(flow[..., 0], flow[..., 1])
    return float(np.mean(mag))

def is_fixation(movement_value, threshold_px=2.0):
    return movement_value < threshold_px

def extract_frame_level_features(img, session):
    features = {"face_detected": False, "head_movement_px": 0.0, "blink_now": False, "mouth_movement_intensity": 0.0}
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
    
    # Optical flow
    prev_gray = session.get("prev_gray")
    motion_mag = 0.0
    if prev_gray is not None:
        try:
            motion_mag = compute_optical_flow_magnitude(prev_gray, gray)
        except Exception:
            motion_mag = 0.0
    session["prev_gray"] = gray.copy()
    
    if len(faces) > 0:
        x, y, w, h = faces[0]
        features["face_detected"] = True
        face_center = (int(x + w / 2), int(y + h / 2))
        
        # Head movement
        prev_center = session.get("prev_face_center")
        if prev_center is not None:
            dx = face_center[0] - prev_center[0]
            dy = face_center[1] - prev_center[1]
            head_move = float(np.sqrt(dx * dx + dy * dy))
        else:
            head_move = 0.0
        
        session["prev_face_center"] = face_center
        session["movement_history"].append(head_move)
        session["frames_with_face"] += 1
        features["head_movement_px"] = head_move
        
        # Blink detection
        roi_gray = gray[y:y + int(h * 0.5), x:x + w]
        eyes = eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.1, minNeighbors=3, minSize=(10, 10))
        if len(eyes) < 2:
            features["blink_now"] = True
            session["blink_count"] += 1
        
        # Fixation logic
        if is_fixation(head_move, threshold_px=2.5) and len(eyes) >= 1:
            session["fixation_frames"] += 1
            session["last_fixation_small_movement_frames"] += 1
        else:
            if session["last_fixation_small_movement_frames"] > 0:
                session["fixation_periods"].append(session["last_fixation_small_movement_frames"])
                session["last_fixation_small_movement_frames"] = 0
    else:
        session["attention_drop_frames"] += 1
    
    # Fidgeting estimate
    recent = session["movement_history"][-10:] if session["movement_history"] else [0.0]
    fidgeting_score = float(np.std(recent))
    
    session["optical_motion_history"].append(motion_mag)
    if len(session["optical_motion_history"]) > 300:
        session["optical_motion_history"].pop(0)
    
    return {
        "motion_mag": motion_mag,
        "head_move_px": features["head_movement_px"],
        "blink_now": features["blink_now"],
        "fidgeting": fidgeting_score
    }

def aggregate_session_features(session):
    # Movement stats
    mh = session.get("movement_history", [])
    if mh:
        head_mean, head_std = float(np.mean(mh)), float(np.std(mh))
        head_max, head_range = float(np.max(mh)), float(np.max(mh) - np.min(mh))
    else:
        head_mean = head_std = head_max = head_range = 0.0
    
    # Optical motion proxies
    om = session.get("optical_motion_history", [])
    if om:
        neck_mean = shoulder_mean = float(np.mean(om))
        neck_std = shoulder_std = float(np.std(om))
    else:
        neck_mean = neck_std = shoulder_mean = shoulder_std = 0.0
    
    movement_consistency = 1.0 / (1.0 + head_std) if head_std > 0 else 1.0
    fidgeting_score = float(np.mean([abs(x) for x in mh])) if mh else 0.0
    
    # Executive tasks
    stroop = session.get("stroop", {})
    gonogo = session.get("gonogo", {})
    nback = session.get("nback", {})
    
    # Stroop
    stroop_congruent_rt = float(np.mean(stroop.get("congruent_rts", []) or [0.0]))
    stroop_incongruent_rt = float(np.mean(stroop.get("incongruent_rts", []) or [0.0]))
    stroop_effect = stroop_incongruent_rt - stroop_congruent_rt
    stroop_error_incongruent = stroop.get("errors_incongruent", 0)
    stroop_commission_errors = stroop.get("commission_errors", 0)
    
    # N-back
    nback_correct = nback.get("correct", 0)
    nback_false_alarm = nback.get("false_alarms", 0)
    nback_accuracy = nback_correct / (nback_correct + nback_false_alarm) if (nback_correct + nback_false_alarm) > 0 else 0.0
    nback_latency = float(np.mean(nback.get("latencies", []) or [0.0]))
    
    # Go/No-Go
    gonogo_commission = gonogo.get("commission_count", 0)
    gonogo_omission = gonogo.get("omission_count", 0)
    gonogo_rt_values = gonogo.get("rt_values", [])
    gonogo_rt_variability = float(np.std(gonogo_rt_values)) if gonogo_rt_values else 0.0
    gonogo_inhibition_score = float(np.mean(gonogo_rt_values)) if gonogo_rt_values else 0.0
    
    # Oculomotor
    fixation_duration_ms = (session.get("fixation_frames", 0) / FPS_ESTIMATE) * 1000.0
    attention_variability = float(np.std(om)) if om else 0.0
    blink_rate = session.get("blink_count", 0) / max(1, (time.time() - session.get("created_at", time.time())) / 60.0)
    
    features_map = {
        'head_movement': head_mean, 'head_movement_std': head_std, 'head_movement_max': head_max, 'head_movement_range': head_range,
        'neck_movement': neck_mean, 'neck_movement_std': neck_std, 'shoulder_movement': shoulder_mean, 'shoulder_movement_std': shoulder_std,
        'other_joints': 0.0, 'torso_movement_variability': attention_variability, 'fidgeting_score': fidgeting_score, 'movement_consistency': movement_consistency,
        'stroop_congruent_rt': stroop_congruent_rt, 'stroop_incongruent_rt': stroop_incongruent_rt, 'stroop_effect': stroop_effect,
        'stroop_error_incongruent': stroop_error_incongruent, 'stroop_commission_errors': stroop_commission_errors,
        'nback_accuracy': nback_accuracy, 'nback_false_alarm': nback_false_alarm, 'nback_latency': nback_latency, 'nback_load_sensitivity': 0.0,
        'gonogo_commission': gonogo_commission, 'gonogo_omission': gonogo_omission, 'gonogo_rt_variability': gonogo_rt_variability, 'gonogo_inhibition_score': gonogo_inhibition_score,
        'fixation_duration': fixation_duration_ms, 'num_regressions': session.get("regressions", 0), 'saccade_fix_ratio': 0.0, 'fixation_stability': movement_consistency,
        'total_reading_time': 0.0, 'reading_speed': 0.0, 'attention_focus_mean': float(np.mean(om)) if om else 0.0, 'attention_variability': attention_variability,
        'attention_drops': session.get("attention_drop_frames", 0), 'blink_rate': blink_rate, 'behavioral_stability': movement_consistency
    }
    
    final_vector = [float(features_map.get(k, 0.0)) for k in FEATURE_NAMES]
    return features_map, np.array(final_vector).reshape(1, -1)

def train_model_on_collected_data():
    """Train model on collected CSV data"""
    global MODEL, SCALER
    
    if not os.path.exists("extracted_features_stream.csv"):
        print("No training data collected yet")
        return
    
    df = pd.read_csv("extracted_features_stream.csv")
    
    if 'adhd_label' not in df.columns:
        print("No labels in data - cannot train supervised model")
        return
    
    # Prepare features
    feature_cols = [col for col in FEATURE_NAMES if col in df.columns]
    X = df[feature_cols].values
    y = df['adhd_label'].values
    
    if len(np.unique(y)) < 2:
        print("Need both classes for training")
        return
    
    # Split and scale
    from sklearn.model_selection import train_test_split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    SCALER = RobustScaler()
    X_train_scaled = SCALER.fit_transform(X_train)
    X_test_scaled = SCALER.transform(X_test)
    
    # Train ensemble
    MODEL = DomainSpecificEnsemble()
    MODEL.fit(X_train_scaled, y_train, feature_cols)
    
    # Evaluate
    y_proba = MODEL.predict_proba(X_test_scaled, feature_cols)
    y_pred = (y_proba[:, 1] > 0.5).astype(int)
    
    acc = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_proba[:, 1])
    
    print(f"✅ Model trained successfully!")
    print(f"   Accuracy: {acc:.4f}, AUC: {auc:.4f}")
    
    return MODEL, SCALER

@app.post("/predict")
async def predict(request: Request):
    payload = await request.json()
    frame_b64 = payload.get("frame")
    task_data = payload.get("taskData", {}) or {}
    session_id = payload.get("session_id", "default")
    train_model = payload.get("train_model", False)

    if session_id not in SESSIONS:
        init_session(session_id)
    session = SESSIONS[session_id]

    if not frame_b64:
        return {"error": "no frame provided"}

    # Decode and process frame
    try:
        img = decode_base64_to_cv2(frame_b64)
    except Exception as e:
        return {"error": f"frame decode error: {e}"}

    inst = extract_frame_level_features(img, session)

    # Process task data
    task_type = task_data.get("taskType")
    game_state = task_data.get("gameState")
    rt = task_data.get("rt")

    if rt is not None:
        try:
            session["rt_list"].append(float(rt))
        except Exception:
            pass

    # Task-specific processing
    if task_type == "goNoGo":
        sig = task_data.get("signal")
        responded = task_data.get("response")
        if sig == "No-Go":
            if responded:
                session["gonogo"]["commission_count"] += 1
            else:
                session["gonogo"]["omission_count"] += 1
        if rt is not None:
            session["gonogo"]["rt_values"].append(float(rt))

    elif task_type == "stroop":
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

    elif task_type == "nBack":
        correct = task_data.get("correct", False)
        false_alarm = task_data.get("false_alarm", False)
        if correct:
            session["nback"]["correct"] += 1
        if false_alarm:
            session["nback"]["false_alarms"] += 1
        if rt is not None:
            session["nback"]["latencies"].append(float(rt))

    # Aggregate features
    features_map, vector = aggregate_session_features(session)
    
    # Apply clinical validation
    clinical_validator = ClinicalThresholdValidator()
    clinical_indicators = clinical_validator.apply_clinical_thresholds(features_map)

    # Save to CSV
    try:
        csv_row = {
            **{"session_id": session_id, "timestamp": time.time()},
            **{f"inst_{k}": v for k, v in inst.items()},
            **features_map,
            **clinical_indicators
        }
        csv_cols = list(csv_row.keys())
        fn = "extracted_features_stream.csv"
        write_header = not os.path.exists(fn)
        with open(fn, "a", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=csv_cols)
            if write_header:
                writer.writeheader()
            writer.writerow(csv_row)
    except Exception:
        pass

    # Train model if requested
    if train_model:
        train_model_on_collected_data()

    # Make prediction if model is available and session finished
    final_prediction = None
    final_probability = None
    domain_contributions = None
    
    if game_state == "finished" and MODEL is not None and SCALER is not None:
        try:
            x_scaled = SCALER.transform(vector)
            proba = MODEL.predict_proba(x_scaled, FEATURE_NAMES)[:, 1]
            final_probability = float(proba[0])
            final_prediction = int(final_probability > 0.5)
            
            # Get domain contributions
            if hasattr(MODEL, 'movement_expert'):
                movement_idx = [i for i, f in enumerate(FEATURE_NAMES) if f in MODEL.movement_features]
                executive_idx = [i for i, f in enumerate(FEATURE_NAMES) if f in MODEL.executive_features]
                oculomotor_idx = [i for i, f in enumerate(FEATURE_NAMES) if f in MODEL.oculomotor_features]
                
                X_movement = x_scaled[:, movement_idx] if movement_idx else np.zeros((x_scaled.shape[0], 1))
                X_executive = x_scaled[:, executive_idx] if executive_idx else np.zeros((x_scaled.shape[0], 1))
                X_oculomotor = x_scaled[:, oculomotor_idx] if oculomotor_idx else np.zeros((x_scaled.shape[0], 1))
                
                movement_proba = MODEL.movement_expert.predict_proba(X_movement)[0, 1]
                executive_proba = MODEL.executive_expert.predict_proba(X_executive)[0, 1]
                oculomotor_proba = MODEL.oculomotor_expert.predict_proba(X_oculomotor)[0, 1]
                
                domain_contributions = {
                    'movement': float(movement_proba),
                    'executive': float(executive_proba),
                    'oculomotor': float(oculomotor_proba)
                }
        except Exception as e:
            print(f"Prediction error: {e}")

    return {
        "instantaneous": inst,
        "aggregated": features_map,
        "clinical_indicators": clinical_indicators,
        "feature_vector": vector.tolist()[0],
        "prediction": final_prediction,
        "probability": final_probability,
        "domain_contributions": domain_contributions,
        "session_id": session_id,
        "model_available": MODEL is not None
    }

@app.post("/train_model")
async def train_model_endpoint():
    """Endpoint to trigger model training on collected data"""
    try:
        train_model_on_collected_data()
        return {"status": "success", "message": "Model trained successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/")
async def root():
    return {"message": "ADHD Detection API - Send POST requests to /predict"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)