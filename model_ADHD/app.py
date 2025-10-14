from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
from new import DomainSpecificEnsemble
import pandas as pd
from sklearn.preprocessing import RobustScaler

app = FastAPI(title="ADHD Detection API")

# ----------------------------
# Model & Feature Setup
# ----------------------------
MODEL = DomainSpecificEnsemble()
SCALER = RobustScaler()
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

MODEL_READY = False

# ----------------------------
# Pydantic Schema
# ----------------------------
class InputData(BaseModel):
    data: dict  # feature name -> value

# ----------------------------
# Startup: Load & Train Model
# ----------------------------
@app.on_event("startup")
def load_model():
    global MODEL, SCALER, FEATURE_NAMES, MODEL_READY
    
    try:
        df = pd.read_csv("data.csv")
        X = df[FEATURE_NAMES].values
        y = df['adhd_label'].values

        # Scale features
        X_scaled = SCALER.fit_transform(X)
        
        # Fit ensemble
        MODEL.fit(X_scaled, y, FEATURE_NAMES)
        MODEL_READY = True
        print("✅ Model is loaded and ready.")
    except Exception as e:
        print(f"❌ Error loading model: {e}")

# ----------------------------
# Prediction Endpoint
# ----------------------------
@app.post("/predict")
def predict(input_data: InputData):
    if not MODEL_READY:
        raise HTTPException(status_code=503, detail="Model not ready")

    try:
        # Ensure all required features are provided
        missing_features = [f for f in FEATURE_NAMES if f not in input_data.data]
        if missing_features:
            raise HTTPException(
                status_code=422,
                detail=f"Missing features: {missing_features}"
            )
        
        # Convert input to array
        x = np.array([input_data.data[feat] for feat in FEATURE_NAMES]).reshape(1, -1)
        x_scaled = SCALER.transform(x)
        
        # Predict
        proba = MODEL.predict_proba(x_scaled, FEATURE_NAMES)
        prediction = int(proba[:, 1] > 0.5)
        
        return {
            "prediction": prediction,
            "probability": float(proba[:, 1])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {e}")
