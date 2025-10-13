"""
ADHD Detection System - Integrated with Clinical Metrics
Optimized for the provided CSV data structure
"""

import os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, classification_report
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.svm import SVC
from sklearn.calibration import CalibratedClassifierCV
import xgboost as xgb
import lightgbm as lgb
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

class ClinicalThresholdValidator:
    """Validate features against established clinical thresholds"""
    
    CLINICAL_THRESHOLDS = {
        # Movement thresholds
        'head_movement_ratio': 0.15,  # ADHD typically > 0.15
        'neck_movement_ratio': 0.10,
        'shoulder_movement_ratio': 0.08,
        
        # Executive function thresholds
        'stroop_effect_ms': 100,  # Stroop effect > 100ms
        'commission_error_rate': 0.25,  # Commission errors > 25%
        'omission_error_rate': 0.20,  # Omission errors > 20%
        
        # Oculomotor thresholds
        'fixation_duration_ms': 300,  # Fixation > 300ms
        'regressions_count': 12,  # Regressions > 12
        'attention_variability': 0.25  # Attention variability > 0.25
    }
    
    @staticmethod
    def apply_clinical_thresholds(features_df):
        """Convert continuous features to clinical threshold indicators"""
        clinical_features = features_df.copy()
        
        # Movement domain clinical indicators
        clinical_features['movement_head_above_threshold'] = (
            clinical_features['head_movement'] > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['head_movement_ratio']
        ).astype(int)
        
        clinical_features['movement_neck_above_threshold'] = (
            clinical_features['neck_movement'] > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['neck_movement_ratio']
        ).astype(int)
        
        clinical_features['movement_shoulder_above_threshold'] = (
            clinical_features['shoulder_movement'] > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['shoulder_movement_ratio']
        ).astype(int)
        
        # Executive function domain
        clinical_features['executive_stroop_above_threshold'] = (
            clinical_features['stroop_effect'] > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['stroop_effect_ms']
        ).astype(int)
        
        clinical_features['executive_commission_above_threshold'] = (
            clinical_features['gonogo_commission'] > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['commission_error_rate']
        ).astype(int)
        
        clinical_features['executive_omission_above_threshold'] = (
            clinical_features['gonogo_omission'] > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['omission_error_rate']
        ).astype(int)
        
        # Oculomotor domain
        clinical_features['oculomotor_fixation_above_threshold'] = (
            clinical_features['fixation_duration'] > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['fixation_duration_ms']
        ).astype(int)
        
        clinical_features['oculomotor_regressions_above_threshold'] = (
            clinical_features['num_regressions'] > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['regressions_count']
        ).astype(int)
        
        clinical_features['oculomotor_attention_above_threshold'] = (
            clinical_features['attention_variability'] > ClinicalThresholdValidator.CLINICAL_THRESHOLDS['attention_variability']
        ).astype(int)
        
        # Composite clinical scores
        clinical_features['clinical_movement_score'] = (
            clinical_features['movement_head_above_threshold'] + 
            clinical_features['movement_neck_above_threshold'] + 
            clinical_features['movement_shoulder_above_threshold']
        )
        
        clinical_features['clinical_executive_score'] = (
            clinical_features['executive_stroop_above_threshold'] + 
            clinical_features['executive_commission_above_threshold'] + 
            clinical_features['executive_omission_above_threshold']
        )
        
        clinical_features['clinical_oculomotor_score'] = (
            clinical_features['oculomotor_fixation_above_threshold'] + 
            clinical_features['oculomotor_regressions_above_threshold'] +
            clinical_features['oculomotor_attention_above_threshold']
        )
        
        clinical_features['total_clinical_criteria'] = (
            clinical_features['clinical_movement_score'] + 
            clinical_features['clinical_executive_score'] + 
            clinical_features['clinical_oculomotor_score']
        )
        
        # Severity grading based on clinical criteria
        clinical_features['adhd_severity'] = clinical_features['total_clinical_criteria'].apply(
            lambda x: 'Mild' if 2 <= x <= 3 else 'Moderate' if 4 <= x <= 5 else 'Severe' if x >= 6 else 'None'
        )
        
        return clinical_features

class DomainSpecificEnsemble:
    """Ensemble model combining domain-specific experts"""
    
    def __init__(self):
        self.movement_expert = None
        self.executive_expert = None
        self.oculomotor_expert = None
        self.meta_classifier = None
        
        # Domain-specific feature groups based on your CSV
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

class ADHDModelTrainer:
    """Main trainer class optimized for your CSV data"""
    
    def __init__(self, features_csv):
        self.features_csv = features_csv
        self.models = {}
        self.results = {}
        self.scaler = RobustScaler()
        self.clinical_validator = ClinicalThresholdValidator()
    
    def load_and_prepare_data(self):
        """Load and prepare the data from CSV"""
        print(f"\n{'='*80}")
        print("LOADING DATA FROM CSV")
        print(f"{'='*80}")
        
        # Load the data
        df = pd.read_csv(self.features_csv)
        
        print(f"Dataset shape: {df.shape}")
        print(f"Columns: {list(df.columns)}")
        print(f"\nClass distribution:")
        print(f"ADHD (1): {(df['adhd_label'] == 1).sum()}")
        print(f"Control (0): {(df['adhd_label'] == 0).sum()}")
        
        # Apply clinical thresholds
        df_clinical = self.clinical_validator.apply_clinical_thresholds(df)
        
        print(f"\nClinical Criteria Summary:")
        print(f"Movement domain above threshold: {df_clinical['clinical_movement_score'].mean():.2f}")
        print(f"Executive domain above threshold: {df_clinical['clinical_executive_score'].mean():.2f}")
        print(f"Oculomotor domain above threshold: {df_clinical['clinical_oculomotor_score'].mean():.2f}")
        print(f"Total criteria met: {df_clinical['total_clinical_criteria'].mean():.2f}")
        
        # Prepare features
        exclude_cols = ['clip_name', 'video_id', 'adhd_label', 'adhd_severity']
        feature_cols = [col for col in df_clinical.columns if col not in exclude_cols]
        
        X = df_clinical[feature_cols].values
        y = df_clinical['adhd_label'].values
        
        # Handle missing values
        X = np.nan_to_num(X, nan=0.0, posinf=1e6, neginf=-1e6)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        self.X_train = X_train_scaled
        self.X_test = X_test_scaled
        self.y_train = y_train
        self.y_test = y_test
        self.feature_names = feature_cols
        self.df_clinical = df_clinical
        
        print(f"\nFinal dataset: {X_train.shape[0]} train, {X_test.shape[0]} test")
        print(f"Total features: {len(feature_cols)}")
        
        return X_train_scaled, X_test_scaled, y_train, y_test, feature_cols
    
    def train_random_forest(self):
        """Random Forest Classifier"""
        print(f"\n{'='*80}")
        print("MODEL 1: Random Forest")
        print(f"{'='*80}")
        
        model = RandomForestClassifier(
            n_estimators=200,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            max_features='sqrt',
            random_state=42,
            class_weight='balanced'
        )
        
        model.fit(self.X_train, self.y_train)
        self.models['Random Forest'] = model
        
        y_pred = model.predict(self.X_test)
        y_proba = model.predict_proba(self.X_test)[:, 1]
        
        self._eval_model('Random Forest', y_pred, y_proba)
        self._plot_feature_importance(model.feature_importances_, 'Random_Forest')
    
    def train_xgboost(self):
        """XGBoost Classifier"""
        print(f"\n{'='*80}")
        print("MODEL 2: XGBoost")
        print(f"{'='*80}")
        
        model = xgb.XGBClassifier(
            n_estimators=150,
            max_depth=8,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_alpha=0.1,
            reg_lambda=1.0,
            random_state=42,
            eval_metric='logloss'
        )
        
        model.fit(self.X_train, self.y_train, verbose=False)
        self.models['XGBoost'] = model
        
        y_pred = model.predict(self.X_test)
        y_proba = model.predict_proba(self.X_test)[:, 1]
        
        self._eval_model('XGBoost', y_pred, y_proba)
        self._plot_feature_importance(model.feature_importances_, 'XGBoost')
    
    def train_lightgbm(self):
        """LightGBM Classifier"""
        print(f"\n{'='*80}")
        print("MODEL 3: LightGBM")
        print(f"{'='*80}")
        
        model = lgb.LGBMClassifier(
            n_estimators=150,
            max_depth=8,
            learning_rate=0.05,
            num_leaves=31,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            verbose=-1
        )
        
        model.fit(self.X_train, self.y_train)
        self.models['LightGBM'] = model
        
        y_pred = model.predict(self.X_test)
        y_proba = model.predict_proba(self.X_test)[:, 1]
        
        self._eval_model('LightGBM', y_pred, y_proba)
    
    def train_domain_ensemble(self):
        """Domain-Specific Ensemble"""
        print(f"\n{'='*80}")
        print("MODEL 4: Domain-Specific Ensemble")
        print(f"{'='*80}")
        
        ensemble = DomainSpecificEnsemble()
        ensemble.fit(self.X_train, self.y_train, self.feature_names)
        self.models['Domain Ensemble'] = ensemble
        
        y_proba = ensemble.predict_proba(self.X_test, self.feature_names)
        y_pred = (y_proba[:, 1] > 0.5).astype(int)
        
        self._eval_model('Domain Ensemble', y_pred, y_proba[:, 1])
        
        # Domain analysis
        self._analyze_domain_contributions(ensemble)
    
    def train_svm(self):
        """Support Vector Machine"""
        print(f"\n{'='*80}")
        print("MODEL 5: SVM")
        print(f"{'='*80}")
        
        model = SVC(
            kernel='rbf',
            C=1.0,
            gamma='scale',
            probability=True,
            random_state=42,
            class_weight='balanced'
        )
        
        model.fit(self.X_train, self.y_train)
        self.models['SVM'] = model
        
        y_pred = model.predict(self.X_test)
        y_proba = model.predict_proba(self.X_test)[:, 1]
        
        self._eval_model('SVM', y_pred, y_proba)
    
    def _analyze_domain_contributions(self, ensemble):
        """Analyze domain contributions"""
        print(f"\nDomain Contribution Analysis:")
        
        # Get domain feature indices
        movement_idx = [i for i, f in enumerate(self.feature_names) if f in ensemble.movement_features]
        executive_idx = [i for i, f in enumerate(self.feature_names) if f in ensemble.executive_features]
        oculomotor_idx = [i for i, f in enumerate(self.feature_names) if f in ensemble.oculomotor_features]
        
        # Calculate domain-specific performance
        if movement_idx:
            X_movement = self.X_test[:, movement_idx]
            movement_pred = ensemble.movement_expert.predict(X_movement)
            movement_acc = accuracy_score(self.y_test, movement_pred)
            print(f"  Movement Domain Accuracy: {movement_acc:.4f}")
        
        if executive_idx:
            X_executive = self.X_test[:, executive_idx]
            executive_pred = ensemble.executive_expert.predict(X_executive)
            executive_acc = accuracy_score(self.y_test, executive_pred)
            print(f"  Executive Domain Accuracy: {executive_acc:.4f}")
        
        if oculomotor_idx:
            X_oculomotor = self.X_test[:, oculomotor_idx]
            oculomotor_pred = ensemble.oculomotor_expert.predict(X_oculomotor)
            oculomotor_acc = accuracy_score(self.y_test, oculomotor_pred)
            print(f"  Oculomotor Domain Accuracy: {oculomotor_acc:.4f}")
    
    def _eval_model(self, name, y_pred, y_proba):
        """Evaluate model performance"""
        acc = accuracy_score(self.y_test, y_pred)
        prec = precision_score(self.y_test, y_pred, zero_division=0)
        rec = recall_score(self.y_test, y_pred, zero_division=0)
        f1 = f1_score(self.y_test, y_pred, zero_division=0)
        
        try:
            auc = roc_auc_score(self.y_test, y_proba)
        except:
            auc = 0.5
        
        self.results[name] = {
            'accuracy': acc, 'precision': prec, 'recall': rec, 
            'f1': f1, 'auc': auc
        }
        
        print(f"\nPerformance Metrics:")
        print(f"  Accuracy:  {acc:.4f}")
        print(f"  Precision: {prec:.4f}")
        print(f"  Recall:    {rec:.4f}")
        print(f"  F1-Score:  {f1:.4f}")
        print(f"  ROC-AUC:   {auc:.4f}")
        
        # Clinical significance
        if auc >= 0.80:
            print("  ✅ EXCELLENT - Strong clinical utility")
        elif auc >= 0.70:
            print("  ✅ GOOD - Clinically significant")
        else:
            print("  ⚠️  MODERATE - Limited clinical utility")
        
        # Confusion matrix
        cm = confusion_matrix(self.y_test, y_pred)
        print(f"\nConfusion Matrix:")
        print(f"  TN: {cm[0,0]:<3} FP: {cm[0,1]}")
        print(f"  FN: {cm[1,0]:<3} TP: {cm[1,1]}")
    
    def _plot_feature_importance(self, importances, model_name):
        """Plot feature importance"""
        if len(importances) == 0:
            return
            
        indices = np.argsort(importances)[-15:]
        plt.figure(figsize=(10, 8))
        plt.barh(range(len(indices)), importances[indices], color='steelblue')
        plt.yticks(range(len(indices)), [self.feature_names[i] for i in indices])
        plt.xlabel('Importance Score')
        plt.title(f'Top 15 Features - {model_name}')
        plt.tight_layout()
        plt.savefig(f'feature_importance_{model_name}.png', dpi=300, bbox_inches='tight')
        plt.close()
        print(f"Saved: feature_importance_{model_name}.png")
    
    def compare_all_models(self):
        """Compare all trained models"""
        print(f"\n{'='*80}")
        print("FINAL MODEL COMPARISON")
        print(f"{'='*80}\n")
        
        df_results = pd.DataFrame(self.results).T.round(4)
        print(df_results.to_string())
        
        # Find best model
        best_model = df_results['auc'].idxmax()
        best_auc = df_results['auc'].max()
        
        print(f"\n🏆 BEST MODEL: {best_model}")
        print(f"   AUC Score: {best_auc:.4f}")
        print(f"   Accuracy: {df_results.loc[best_model, 'accuracy']:.4f}")
        print(f"   F1-Score: {df_results.loc[best_model, 'f1']:.4f}")
        
        # Plot comparison
        self._plot_model_comparison(df_results)
        
        return best_model, best_auc
    
    def _plot_model_comparison(self, df_results):
        """Plot model comparison"""
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        metrics = ['accuracy', 'precision', 'recall', 'f1']
        
        for idx, metric in enumerate(metrics):
            ax = axes[idx // 2, idx % 2]
            data = df_results[metric].sort_values(ascending=True)
            colors = ['gold' if x == data.max() else 'steelblue' for x in data.values]
            ax.barh(range(len(data)), data.values, color=colors)
            ax.set_yticks(range(len(data)))
            ax.set_yticklabels(data.index)
            ax.set_xlabel('Score')
            ax.set_title(metric.upper())
            ax.set_xlim([0, 1])
            
            for i, v in enumerate(data.values):
                ax.text(v + 0.02, i, f'{v:.3f}', va='center', fontsize=9)
        
        plt.tight_layout()
        plt.savefig('model_comparison.png', dpi=300, bbox_inches='tight')
        plt.close()
        print(f"Saved: model_comparison.png")
    
    def run_complete_training(self):
        """Run complete training pipeline"""
        print("🚀 STARTING COMPLETE ADHD DETECTION TRAINING")
        print("WITH CLINICAL VALIDATION AND MULTI-MODAL MODELS")
        
        # Load and prepare data
        self.load_and_prepare_data()
        
        # Train all models
        print(f"\n{'='*80}")
        print("TRAINING ALL MODELS")
        print(f"{'='*80}")
        
        self.train_random_forest()
        self.train_xgboost()
        self.train_lightgbm()
        self.train_domain_ensemble()
        self.train_svm()
        
        # Compare results
        best_model, best_score = self.compare_all_models()
        
        print(f"\n✅ TRAINING COMPLETE!")
        print(f"📊 Best model: {best_model} (AUC: {best_score:.4f})")
        print(f"🏥 Clinical validation applied")
        print(f"🔬 Domain-specific analysis completed")
        
        return self.models, self.results

def main():
    """Main execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='ADHD Detection from CSV Data')
    parser.add_argument('--features_csv', type=str, default='data.csv',
                       help='Path to features CSV file')
    
    args = parser.parse_args()
    
    print("""
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║                   ADHD DETECTION FROM BEHAVIORAL DATA                       ║
    ║                Clinical Validation + Multi-Modal Ensemble                  ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    # Check if file exists
    if not os.path.exists(args.features_csv):
        print(f"❌ Error: File not found: {args.features_csv}")
        print("Please provide the correct path to your CSV file")
        return
    
    # Run training
    trainer = ADHDModelTrainer(args.features_csv)
    models, results = trainer.run_complete_training()
    
    print(f"\n📁 Generated files:")
    print(f"  - feature_importance_*.png (feature importance plots)")
    print(f"  - model_comparison.png (model performance comparison)")
    
    return models, results

if __name__ == "__main__":
    main()