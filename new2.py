"""
ADHD Detection from Video-Based Behavioral Game Analysis
Multi-Model Training and Evaluation System
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, classification_report
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
import xgboost as xgb
from tensorflow.keras.models import Sequential, Model
from tensorflow.keras.layers import LSTM, Dense, Dropout, Conv1D, MaxPooling1D, Flatten, Input, concatenate, BatchNormalization, GlobalAveragePooling1D
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

class ADHDVideoAnalysisModel:
    """
    Multi-modal ADHD Detection System based on:
    - Movement patterns from video analysis
    - Executive function task performance (Go/NoGo, Stroop, N-Back)
    - Oculomotor patterns during reading tasks
    """
    
    def __init__(self, csv_path):
        self.csv_path = csv_path
        self.models = {}
        self.results = {}
        self.scaler = StandardScaler()
        
    def load_and_preprocess_data(self):
        """Load CSV data and prepare for training"""
        print("="*80)
        print("Loading Video-Based Behavioral Analysis Data...")
        print("="*80)
        
        # Load data
        df = pd.read_csv(self.csv_path)
        print(f"\nDataset Shape: {df.shape}")
        print(f"ADHD Cases: {df['adhd_label'].sum()}")
        print(f"Control Cases: {(df['adhd_label'] == 0).sum()}")
        
        # Feature groups based on medical literature
        self.feature_groups = {
            'movement_features': [
                'head_movement', 'neck_movement', 'shoulder_movement', 'other_joints'
            ],
            'stroop_features': [
                'stroop_congruent_rt', 'stroop_incongruent_rt', 'stroop_effect',
                'stroop_error_incongruent', 'stroop_commission_errors'
            ],
            'nback_features': [
                'nback_accuracy', 'nback_false_alarm', 'nback_latency', 'nback_load_sensitivity'
            ],
            'gonogo_features': [
                'gonogo_commission', 'gonogo_omission', 'gonogo_rt_variability', 'gonogo_inhibition_score'
            ],
            'oculomotor_features': [
                'fixation_duration', 'total_reading_time', 'reading_speed',
                'num_regressions', 'saccade_fix_ratio', 'fixation_stability'
            ]
        }
        
        # All features
        all_features = []
        for group in self.feature_groups.values():
            all_features.extend(group)
        
        # Separate features and labels
        X = df[all_features].values
        y = df['adhd_label'].values
        
        # Split data (80% train, 20% test)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Standardize features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        self.X_train = X_train_scaled
        self.X_test = X_test_scaled
        self.y_train = y_train
        self.y_test = y_test
        self.feature_names = all_features
        
        print(f"\nTraining Set: {X_train.shape}")
        print(f"Test Set: {X_test.shape}")
        
        return X_train_scaled, X_test_scaled, y_train, y_test
    
    def train_random_forest(self):
        """
        Random Forest - Excellent for capturing non-linear relationships
        in behavioral patterns
        """
        print("\n" + "="*80)
        print("MODEL 1: Random Forest Classifier")
        print("="*80)
        
        model = RandomForestClassifier(
            n_estimators=500,
            max_depth=15,
            min_samples_split=10,
            min_samples_leaf=4,
            max_features='sqrt',
            random_state=42,
            n_jobs=-1,
            class_weight='balanced'  # Handle class imbalance
        )
        
        model.fit(self.X_train, self.y_train)
        self.models['random_forest'] = model
        
        # Evaluate
        y_pred = model.predict(self.X_test)
        y_proba = model.predict_proba(self.X_test)[:, 1]
        
        self._print_metrics('Random Forest', y_pred, y_proba)
        
        # Feature importance
        self._plot_feature_importance(model.feature_importances_, 'Random Forest')
        
        return model
    
    def train_xgboost(self):
        """
        XGBoost - State-of-the-art gradient boosting
        Excellent for structured/tabular data from video analysis
        """
        print("\n" + "="*80)
        print("MODEL 2: XGBoost Classifier")
        print("="*80)
        
        model = xgb.XGBClassifier(
            n_estimators=300,
            max_depth=8,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            reg_alpha=0.1,
            reg_lambda=1.0,
            random_state=42,
            eval_metric='logloss',
            scale_pos_weight=(self.y_train == 0).sum() / (self.y_train == 1).sum()
        )
        
        model.fit(
            self.X_train, self.y_train,
            eval_set=[(self.X_test, self.y_test)],
            verbose=False
        )
        
        self.models['xgboost'] = model
        
        # Evaluate
        y_pred = model.predict(self.X_test)
        y_proba = model.predict_proba(self.X_test)[:, 1]
        
        self._print_metrics('XGBoost', y_pred, y_proba)
        
        # Feature importance
        self._plot_feature_importance(model.feature_importances_, 'XGBoost')
        
        return model
    
    def train_lstm_temporal(self):
        """
        LSTM Neural Network - Captures temporal patterns in task performance
        Useful for sequences like Go/NoGo trials, Stroop progression
        (Fixed version with padding to handle variable feature group sizes)
        """
        print("\n" + "="*80)
        print("MODEL 3: LSTM Neural Network (Temporal Patterns)")
        print("="*80)

        # ---- FIX STARTS HERE ----
        group_sizes = [len(g) for g in self.feature_groups.values()]  # [4,5,4,4,6]
        max_features = max(group_sizes)  # Padding length per timestep

        # Prepare padded arrays
        X_train_lstm = np.zeros((self.X_train.shape[0], len(group_sizes), max_features))
        X_test_lstm = np.zeros((self.X_test.shape[0], len(group_sizes), max_features))

        for i, size in enumerate(group_sizes):
            start = sum(group_sizes[:i])
            end = start + size
            X_train_lstm[:, i, :size] = self.X_train[:, start:end]
            X_test_lstm[:, i, :size] = self.X_test[:, start:end]
        # ---- FIX ENDS HERE ----

        # Build LSTM model
        model = Sequential([
            LSTM(128, return_sequences=True, input_shape=(X_train_lstm.shape[1], X_train_lstm.shape[2])),
            Dropout(0.3),
            LSTM(64, return_sequences=False),
            Dropout(0.3),
            Dense(32, activation='relu'),
            BatchNormalization(),
            Dropout(0.2),
            Dense(16, activation='relu'),
            Dense(1, activation='sigmoid')
        ])

        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy']
        )

        early_stop = EarlyStopping(monitor='val_loss', patience=15, restore_best_weights=True)
        reduce_lr = ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=1e-6)

        # Train the model
        history = model.fit(
            X_train_lstm, self.y_train,
            validation_split=0.2,
            epochs=100,
            batch_size=32,
            callbacks=[early_stop, reduce_lr],
            verbose=0
        )

        self.models['lstm'] = model

        # Evaluate
        y_proba = model.predict(X_test_lstm).flatten()
        y_pred = (y_proba > 0.5).astype(int)

        self._print_metrics('LSTM', y_pred, y_proba)
        
        return model, history

    
    def train_cnn_1d(self):
        """
        1D CNN - Extracts local patterns from feature sequences
        Good for detecting specific behavioral signatures
        """
        print("\n" + "="*80)
        print("MODEL 4: 1D Convolutional Neural Network")
        print("="*80)
        
        # Reshape for CNN: (samples, features, 1)
        X_train_cnn = self.X_train.reshape(self.X_train.shape[0], self.X_train.shape[1], 1)
        X_test_cnn = self.X_test.reshape(self.X_test.shape[0], self.X_test.shape[1], 1)
        
        model = Sequential([
            Conv1D(64, kernel_size=3, activation='relu', input_shape=(X_train_cnn.shape[1], 1)),
            BatchNormalization(),
            MaxPooling1D(pool_size=2),
            Dropout(0.3),
            
            Conv1D(128, kernel_size=3, activation='relu'),
            BatchNormalization(),
            GlobalAveragePooling1D(),
            
            Dense(64, activation='relu'),
            BatchNormalization(),
            Dropout(0.3),
            Dense(32, activation='relu'),
            Dropout(0.2),
            Dense(1, activation='sigmoid')
        ])
        
        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        early_stop = EarlyStopping(monitor='val_loss', patience=15, restore_best_weights=True)
        reduce_lr = ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=1e-6)
        
        history = model.fit(
            X_train_cnn, self.y_train,
            validation_split=0.2,
            epochs=100,
            batch_size=32,
            callbacks=[early_stop, reduce_lr],
            verbose=0
        )
        
        self.models['cnn_1d'] = model
        
        # Evaluate
        y_proba = model.predict(X_test_cnn).flatten()
        y_pred = (y_proba > 0.5).astype(int)
        
        self._print_metrics('1D-CNN', y_pred, y_proba)
        
        return model, history
    
    def train_multimodal_fusion(self):
        """
        Multi-Modal Fusion Network - Processes different feature groups separately
        then combines them (movement, executive function, oculomotor)
        """
        print("\n" + "="*80)
        print("MODEL 5: Multi-Modal Fusion Neural Network")
        print("="*80)
        
        # Create separate inputs for each modality
        input_movement = Input(shape=(4,), name='movement')  # 4 movement features
        input_executive = Input(shape=(13,), name='executive')  # Stroop + N-Back + Go/NoGo
        input_oculomotor = Input(shape=(6,), name='oculomotor')  # Eye tracking features
        
        # Movement pathway
        x1 = Dense(16, activation='relu')(input_movement)
        x1 = BatchNormalization()(x1)
        x1 = Dropout(0.3)(x1)
        x1 = Dense(8, activation='relu')(x1)
        
        # Executive function pathway
        x2 = Dense(32, activation='relu')(input_executive)
        x2 = BatchNormalization()(x2)
        x2 = Dropout(0.3)(x2)
        x2 = Dense(16, activation='relu')(x2)
        x2 = Dropout(0.2)(x2)
        x2 = Dense(8, activation='relu')(x2)
        
        # Oculomotor pathway
        x3 = Dense(16, activation='relu')(input_oculomotor)
        x3 = BatchNormalization()(x3)
        x3 = Dropout(0.3)(x3)
        x3 = Dense(8, activation='relu')(x3)
        
        # Fusion layer
        merged = concatenate([x1, x2, x3])
        x = Dense(32, activation='relu')(merged)
        x = BatchNormalization()(x)
        x = Dropout(0.3)(x)
        x = Dense(16, activation='relu')(x)
        output = Dense(1, activation='sigmoid')(x)
        
        model = Model(inputs=[input_movement, input_executive, input_oculomotor], outputs=output)
        
        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        # Prepare multi-input data
        X_train_movement = self.X_train[:, :4]
        X_train_executive = self.X_train[:, 4:17]
        X_train_oculomotor = self.X_train[:, 17:]
        
        X_test_movement = self.X_test[:, :4]
        X_test_executive = self.X_test[:, 4:17]
        X_test_oculomotor = self.X_test[:, 17:]
        
        early_stop = EarlyStopping(monitor='val_loss', patience=15, restore_best_weights=True)
        reduce_lr = ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=1e-6)
        
        history = model.fit(
            [X_train_movement, X_train_executive, X_train_oculomotor],
            self.y_train,
            validation_split=0.2,
            epochs=100,
            batch_size=32,
            callbacks=[early_stop, reduce_lr],
            verbose=0
        )
        
        self.models['fusion'] = model
        
        # Evaluate
        y_proba = model.predict([X_test_movement, X_test_executive, X_test_oculomotor]).flatten()
        y_pred = (y_proba > 0.5).astype(int)
        
        self._print_metrics('Multi-Modal Fusion', y_pred, y_proba)
        
        return model, history
    
    def train_ensemble_voting(self):
        """
        Ensemble Voting Classifier - Combines RF, XGBoost, and SVM
        """
        print("\n" + "="*80)
        print("MODEL 6: Ensemble Voting (RF + XGBoost + SVM)")
        print("="*80)

        # ✅ Make sure these are estimator **instances**, not fitted models
        from sklearn.ensemble import RandomForestClassifier, VotingClassifier
        from sklearn.svm import SVC
        from xgboost import XGBClassifier

        rf = RandomForestClassifier(
            n_estimators=200,
            random_state=42,
            class_weight='balanced'
        )

        xgb = XGBClassifier(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=4,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            use_label_encoder=False,
            eval_metric='logloss'
        )

        svm = SVC(
            probability=True,
            kernel='rbf',
            C=1,
            gamma='scale',
            random_state=42
        )

        # 🧠 Use estimator *objects* here
        ensemble = VotingClassifier(
            estimators=[
                ('rf', rf),
                ('xgb', xgb),
                ('svm', svm)
            ],
            voting='soft'
        )

        ensemble.fit(self.X_train, self.y_train)

        y_proba = ensemble.predict_proba(self.X_test)[:, 1]
        y_pred = (y_proba > 0.5).astype(int)

        self.models['ensemble'] = ensemble
        self._print_metrics('Ensemble', y_pred, y_proba)

        return ensemble

    
    def _print_metrics(self, model_name, y_pred, y_proba):
        """Print comprehensive evaluation metrics"""
        acc = accuracy_score(self.y_test, y_pred)
        prec = precision_score(self.y_test, y_pred)
        rec = recall_score(self.y_test, y_pred)
        f1 = f1_score(self.y_test, y_pred)
        auc = roc_auc_score(self.y_test, y_proba)
        
        self.results[model_name] = {
            'accuracy': acc,
            'precision': prec,
            'recall': rec,
            'f1': f1,
            'auc': auc
        }
        
        print(f"\n{'Metric':<20} {'Score':<10}")
        print("-" * 30)
        print(f"{'Accuracy':<20} {acc:.4f}")
        print(f"{'Precision':<20} {prec:.4f}")
        print(f"{'Recall':<20} {rec:.4f}")
        print(f"{'F1-Score':<20} {f1:.4f}")
        print(f"{'ROC-AUC':<20} {auc:.4f}")
        
        print("\nConfusion Matrix:")
        cm = confusion_matrix(self.y_test, y_pred)
        print(f"True Neg: {cm[0,0]:<5} False Pos: {cm[0,1]}")
        print(f"False Neg: {cm[1,0]:<5} True Pos: {cm[1,1]}")
        
        print("\nClassification Report:")
        print(classification_report(self.y_test, y_pred, target_names=['Control', 'ADHD']))
    
    def _plot_feature_importance(self, importances, model_name):
        """Plot top 15 features"""
        indices = np.argsort(importances)[-15:]
        
        plt.figure(figsize=(10, 8))
        plt.barh(range(len(indices)), importances[indices])
        plt.yticks(range(len(indices)), [self.feature_names[i] for i in indices])
        plt.xlabel('Feature Importance')
        plt.title(f'Top 15 Features - {model_name}')
        plt.tight_layout()
        plt.savefig(f'feature_importance_{model_name.replace(" ", "_")}.png', dpi=300, bbox_inches='tight')
        plt.close()
        print(f"Feature importance plot saved: feature_importance_{model_name.replace(' ', '_')}.png")
    
    def compare_all_models(self):
        """Compare all models side by side"""
        print("\n" + "="*80)
        print("FINAL MODEL COMPARISON")
        print("="*80)
        
        comparison_df = pd.DataFrame(self.results).T
        comparison_df = comparison_df.round(4)
        print("\n", comparison_df.to_string())
        
        # Plot comparison
        fig, axes = plt.subplots(2, 3, figsize=(15, 10))
        metrics = ['accuracy', 'precision', 'recall', 'f1', 'auc']
        
        for idx, metric in enumerate(metrics):
            ax = axes[idx // 3, idx % 3]
            data = comparison_df[metric].sort_values(ascending=False)
            ax.barh(range(len(data)), data.values)
            ax.set_yticks(range(len(data)))
            ax.set_yticklabels(data.index)
            ax.set_xlabel('Score')
            ax.set_title(f'{metric.upper()}')
            ax.set_xlim([0, 1])
            
            for i, v in enumerate(data.values):
                ax.text(v + 0.01, i, f'{v:.3f}', va='center')
        
        axes[1, 2].axis('off')
        plt.tight_layout()
        plt.savefig('model_comparison.png', dpi=300, bbox_inches='tight')
        plt.close()
        print("\nComparison plot saved: model_comparison.png")
        
        # Best model
        best_model = comparison_df['auc'].idxmax()
        best_auc = comparison_df['auc'].max()
        print(f"\n🏆 Best Model: {best_model} (AUC: {best_auc:.4f})")


# Main execution
if __name__ == "__main__":
    print("""
    ╔══════════════════════════════════════════════════════════════════════════════╗
    ║         ADHD Detection from Video-Based Behavioral Game Analysis             ║
    ║                    Multi-Model Training & Evaluation                         ║
    ╚══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    # Initialize system
    CSV_PATH = 'adhd_synthetic_dataset.csv'  # Your CSV file path
    
    adhd_system = ADHDVideoAnalysisModel(CSV_PATH)
    
    # Load and preprocess data
    adhd_system.load_and_preprocess_data()
    
    # Train all models
    print("\n🚀 Starting model training pipeline...\n")
    
    adhd_system.train_random_forest()
    adhd_system.train_xgboost()
    adhd_system.train_lstm_temporal()
    adhd_system.train_cnn_1d()
    adhd_system.train_multimodal_fusion()
    adhd_system.train_ensemble_voting()
    
    # Final comparison
    adhd_system.compare_all_models()
    
    print("\n✅ Training complete! All models evaluated and results saved.")
    print("\nGenerated files:")
    print("  - feature_importance_*.png")
    print("  - model_comparison.png")