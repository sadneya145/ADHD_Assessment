"""
ADHD Assessment Model - Final Production Version (Inverted Composite)
Higher domain scores = Better performance
Higher composite score = Higher ADHD likelihood (0 = Non-ADHD, 100 = ADHD)
"""

import sys
import json


class ADHDAssessmentModel:
    """Rule-based ADHD assessment using cognitive test results"""
    
    def __init__(self):
        self.weights = {
            'attention': 0.35,
            'impulsivity': 0.40,
            'working_memory': 0.25
        }
    
    def extract_features(self, test_data):
        """Extract and calculate features from raw test data"""
        # Stroop Task
        stroop_score = test_data.get('stroop_score')
        stroop_total = test_data.get('stroop_total', 10)
        stroop_accuracy = (stroop_score / stroop_total) if stroop_score is not None else None
        stroop_rt = test_data.get('stroop_avg_rt')
        
        # N-Back Task
        nback_hits = test_data.get('nback_hits')
        nback_misses = test_data.get('nback_misses')
        nback_total = (nback_hits + nback_misses) if (nback_hits is not None and nback_misses is not None) else None
        nback_accuracy = (nback_hits / nback_total) if nback_total and nback_total > 0 else None
        
        nback_false_alarms = test_data.get('nback_false_alarms')
        nback_correct_rejections = test_data.get('nback_correct_rejections')
        nback_total_nontargets = (nback_false_alarms + nback_correct_rejections) if (
            nback_false_alarms is not None and nback_correct_rejections is not None
        ) else None
        nback_fa_rate = (nback_false_alarms / nback_total_nontargets) if nback_total_nontargets and nback_total_nontargets > 0 else None
        
        # Go/No-Go Task
        gonogo_hits = test_data.get('gonogo_hits')
        gonogo_misses = test_data.get('gonogo_misses')
        gonogo_total = (gonogo_hits + gonogo_misses) if (gonogo_hits is not None and gonogo_misses is not None) else None
        gonogo_accuracy = (gonogo_hits / gonogo_total) if gonogo_total and gonogo_total > 0 else None
        
        gonogo_false_alarms = test_data.get('gonogo_false_alarms')
        gonogo_correct_rejections = test_data.get('gonogo_correct_rejections')
        gonogo_total_nogo = (gonogo_false_alarms + gonogo_correct_rejections) if (
            gonogo_false_alarms is not None and gonogo_correct_rejections is not None
        ) else None
        gonogo_fa_rate = (gonogo_false_alarms / gonogo_total_nogo) if gonogo_total_nogo and gonogo_total_nogo > 0 else None
        
        gonogo_rt = test_data.get('gonogo_avg_rt')
        
        return {
            'stroop_accuracy': stroop_accuracy,
            'stroop_rt': stroop_rt,
            'nback_accuracy': nback_accuracy,
            'nback_fa_rate': nback_fa_rate,
            'gonogo_accuracy': gonogo_accuracy,
            'gonogo_fa_rate': gonogo_fa_rate,
            'gonogo_rt': gonogo_rt
        }
    
    def calculate_attention_score(self, features):
        """Calculate attention score (0-100) - Higher is better"""
        score = 100
        
        if features.get('stroop_accuracy') is not None:
            acc = features['stroop_accuracy']
            if acc < 0.5:
                score -= 35
            elif acc < 0.6:
                score -= 28
            elif acc < 0.7:
                score -= 20
            elif acc < 0.8:
                score -= 10
        
        if features.get('stroop_rt') is not None:
            rt = features['stroop_rt']
            if rt > 2000:
                score -= 15
            elif rt > 1500:
                score -= 10
            elif rt > 1200:
                score -= 5
        
        if features.get('nback_accuracy') is not None:
            acc = features['nback_accuracy']
            if acc < 0.4:
                score -= 25
            elif acc < 0.55:
                score -= 18
            elif acc < 0.7:
                score -= 10
            elif acc < 0.8:
                score -= 5
        
        if features.get('gonogo_accuracy') is not None:
            acc = features['gonogo_accuracy']
            if acc < 0.6:
                score -= 25
            elif acc < 0.7:
                score -= 18
            elif acc < 0.8:
                score -= 12
            elif acc < 0.85:
                score -= 6
        
        return max(score, 0)
    
    def calculate_impulsivity_score(self, features):
        """Calculate impulse control score (0-100) - Higher is better"""
        score = 100
        
        if features.get('nback_fa_rate') is not None:
            fa_rate = features['nback_fa_rate']
            if fa_rate > 0.5:
                score -= 50
            elif fa_rate > 0.4:
                score -= 42
            elif fa_rate > 0.3:
                score -= 32
            elif fa_rate > 0.2:
                score -= 20
            elif fa_rate > 0.15:
                score -= 12
            elif fa_rate > 0.1:
                score -= 6
        
        if features.get('gonogo_fa_rate') is not None:
            fa_rate = features['gonogo_fa_rate']
            if fa_rate > 0.4:
                score -= 50
            elif fa_rate > 0.3:
                score -= 40
            elif fa_rate > 0.2:
                score -= 28
            elif fa_rate > 0.15:
                score -= 18
            elif fa_rate > 0.1:
                score -= 10
            elif fa_rate > 0.05:
                score -= 5
        
        return max(score, 0)
    
    def calculate_working_memory_score(self, features):
        """Calculate working memory score (0-100) - Higher is better"""
        score = 100
        
        if features.get('nback_accuracy') is not None:
            acc = features['nback_accuracy']
            if acc < 0.3:
                score -= 75
            elif acc < 0.45:
                score -= 60
            elif acc < 0.6:
                score -= 45
            elif acc < 0.7:
                score -= 30
            elif acc < 0.8:
                score -= 15
            elif acc < 0.85:
                score -= 8
        
        if features.get('stroop_accuracy') is not None:
            acc = features['stroop_accuracy']
            if acc < 0.5:
                score -= 25
            elif acc < 0.65:
                score -= 18
            elif acc < 0.75:
                score -= 12
            elif acc < 0.85:
                score -= 6
        
        return max(score, 0)
    
    def predict(self, test_data):
        """Main prediction function"""
        features = self.extract_features(test_data)
        
        attention_score = self.calculate_attention_score(features)
        impulsivity_score = self.calculate_impulsivity_score(features)
        working_memory_score = self.calculate_working_memory_score(features)
        
        # Normal composite (higher = better)
        normal_composite = (
            attention_score * self.weights['attention'] +
            impulsivity_score * self.weights['impulsivity'] +
            working_memory_score * self.weights['working_memory']
        )
        
        # Invert so higher = higher ADHD likelihood
        composite_score = round(100 - normal_composite, 2)
        
        # Interpret thresholds (now high = ADHD)
        if composite_score > 75:
            likelihood = 'High'
            risk_level = 4
        elif composite_score > 60:
            likelihood = 'Moderate-High'
            risk_level = 3
        elif composite_score > 45:
            likelihood = 'Moderate'
            risk_level = 2
        elif composite_score > 30:
            likelihood = 'Low-Moderate'
            risk_level = 1
        else:
            likelihood = 'Low'
            risk_level = 0
        
        return {
            'composite_score': composite_score,
            'likelihood': likelihood,
            'risk_level': risk_level,
            'domain_scores': {
                'attention': round(attention_score, 2),
                'impulsivity': round(impulsivity_score, 2),
                'working_memory': round(working_memory_score, 2)
            },
            'features': features
        }


def main():
    """Entry point for Node.js integration"""
    try:
        raw_input = sys.stdin.read()
        
        if not raw_input:
            print(json.dumps({"error": "No input received"}))
            return
        
        test_data = json.loads(raw_input)
        
        formatted_input = {
            "stroop_score": test_data.get("stroop", {}).get("score"),
            "stroop_total": test_data.get("stroop", {}).get("totalRounds", 10),
            "stroop_avg_rt": test_data.get("stroop", {}).get("avgReactionTime"),
            "nback_hits": test_data.get("nBack", {}).get("hits"),
            "nback_misses": test_data.get("nBack", {}).get("misses"),
            "nback_false_alarms": test_data.get("nBack", {}).get("falseAlarms", 0),
            "nback_correct_rejections": test_data.get("nBack", {}).get("correctRejections", 0),
            "gonogo_hits": test_data.get("goNoGo", {}).get("hits"),
            "gonogo_misses": test_data.get("goNoGo", {}).get("misses"),
            "gonogo_false_alarms": test_data.get("goNoGo", {}).get("falseAlarms", 0),
            "gonogo_correct_rejections": test_data.get("goNoGo", {}).get("correctRejections", 0),
            "gonogo_avg_rt": test_data.get("goNoGo", {}).get("avgReactionTime", 0)
        }
        
        model = ADHDAssessmentModel()
        result = model.predict(formatted_input)
        
        print(json.dumps(result))
        
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
    except Exception as e:
        print(json.dumps({"error": f"Unexpected error: {str(e)}"}))


if __name__ == "__main__":
    main()
