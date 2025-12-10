"""
ADHD Assessment Model - Age-Adjusted Version
Entry point for Node.js integration
"""

import sys
import json


class ADHDAssessmentModel:
    """Rule-based ADHD assessment using cognitive test results"""
    
    def __init__(self, age):
        self.age = age
        self.age_group = self._get_age_group(age)
        self.weights = self._get_age_adjusted_weights()
        self.thresholds = self._get_age_adjusted_thresholds()
    
    def _get_age_group(self, age):
        """Determine age group"""
        if 5 <= age <= 8:
            return '5-8'
        elif 9 <= age <= 12:
            return '9-12'
        elif 13 <= age <= 15:
            return '13-15'
        else:
            return '9-12'  # Default to middle group
    
    def _get_age_adjusted_weights(self):
        """Get domain weights adjusted for age group"""
        weights_by_age = {
            '5-8': {
                'attention': 0.30,
                'impulsivity': 0.45,
                'working_memory': 0.25
            },
            '9-12': {
                'attention': 0.35,
                'impulsivity': 0.40,
                'working_memory': 0.25
            },
            '13-15': {
                'attention': 0.40,
                'impulsivity': 0.35,
                'working_memory': 0.25
            }
        }
        return weights_by_age[self.age_group]
    
    def _get_age_adjusted_thresholds(self):
        """Get penalty thresholds adjusted for age group"""
        thresholds_by_age = {
            '5-8': {
                'stroop_acc_severe': 0.40,
                'stroop_acc_high': 0.50,
                'stroop_acc_mod': 0.60,
                'stroop_acc_low': 0.70,
                'stroop_rt_severe': 2500,
                'stroop_rt_high': 2000,
                'stroop_rt_mod': 1500,
                'nback_acc_severe': 0.30,
                'nback_acc_high': 0.45,
                'nback_acc_mod': 0.60,
                'nback_acc_low': 0.70,
                'gonogo_acc_severe': 0.50,
                'gonogo_acc_high': 0.60,
                'gonogo_acc_mod': 0.70,
                'gonogo_acc_low': 0.80,
                'nback_fa_severe': 0.60,
                'nback_fa_high': 0.50,
                'nback_fa_mod': 0.40,
                'nback_fa_low': 0.30,
                'nback_fa_vlow': 0.20,
                'nback_fa_min': 0.15,
                'gonogo_fa_severe': 0.50,
                'gonogo_fa_high': 0.40,
                'gonogo_fa_mod': 0.30,
                'gonogo_fa_low': 0.20,
                'gonogo_fa_vlow': 0.15,
                'gonogo_fa_min': 0.10
            },
            '9-12': {
                'stroop_acc_severe': 0.50,
                'stroop_acc_high': 0.60,
                'stroop_acc_mod': 0.70,
                'stroop_acc_low': 0.80,
                'stroop_rt_severe': 2000,
                'stroop_rt_high': 1500,
                'stroop_rt_mod': 1200,
                'nback_acc_severe': 0.40,
                'nback_acc_high': 0.55,
                'nback_acc_mod': 0.70,
                'nback_acc_low': 0.80,
                'gonogo_acc_severe': 0.60,
                'gonogo_acc_high': 0.70,
                'gonogo_acc_mod': 0.80,
                'gonogo_acc_low': 0.85,
                'nback_fa_severe': 0.50,
                'nback_fa_high': 0.40,
                'nback_fa_mod': 0.30,
                'nback_fa_low': 0.20,
                'nback_fa_vlow': 0.15,
                'nback_fa_min': 0.10,
                'gonogo_fa_severe': 0.40,
                'gonogo_fa_high': 0.30,
                'gonogo_fa_mod': 0.20,
                'gonogo_fa_low': 0.15,
                'gonogo_fa_vlow': 0.10,
                'gonogo_fa_min': 0.05
            },
            '13-15': {
                'stroop_acc_severe': 0.55,
                'stroop_acc_high': 0.65,
                'stroop_acc_mod': 0.75,
                'stroop_acc_low': 0.85,
                'stroop_rt_severe': 1800,
                'stroop_rt_high': 1400,
                'stroop_rt_mod': 1100,
                'nback_acc_severe': 0.45,
                'nback_acc_high': 0.60,
                'nback_acc_mod': 0.75,
                'nback_acc_low': 0.85,
                'gonogo_acc_severe': 0.65,
                'gonogo_acc_high': 0.75,
                'gonogo_acc_mod': 0.85,
                'gonogo_acc_low': 0.90,
                'nback_fa_severe': 0.45,
                'nback_fa_high': 0.35,
                'nback_fa_mod': 0.25,
                'nback_fa_low': 0.18,
                'nback_fa_vlow': 0.12,
                'nback_fa_min': 0.08,
                'gonogo_fa_severe': 0.35,
                'gonogo_fa_high': 0.25,
                'gonogo_fa_mod': 0.18,
                'gonogo_fa_low': 0.12,
                'gonogo_fa_vlow': 0.08,
                'gonogo_fa_min': 0.04
            }
        }
        return thresholds_by_age[self.age_group]
    
    def extract_features(self, test_data):
        """Extract and calculate features from raw test data"""
        stroop_score = test_data.get('stroop_score')
        stroop_total = test_data.get('stroop_total', 10)
        stroop_accuracy = (stroop_score / stroop_total) if stroop_score is not None else None
        stroop_rt = test_data.get('stroop_avg_rt')
        
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
        t = self.thresholds
        
        if features.get('stroop_accuracy') is not None:
            acc = features['stroop_accuracy']
            if acc < t['stroop_acc_severe']:
                score -= 35
            elif acc < t['stroop_acc_high']:
                score -= 28
            elif acc < t['stroop_acc_mod']:
                score -= 20
            elif acc < t['stroop_acc_low']:
                score -= 10
        
        if features.get('stroop_rt') is not None:
            rt = features['stroop_rt']
            if rt > t['stroop_rt_severe']:
                score -= 15
            elif rt > t['stroop_rt_high']:
                score -= 10
            elif rt > t['stroop_rt_mod']:
                score -= 5
        
        if features.get('nback_accuracy') is not None:
            acc = features['nback_accuracy']
            if acc < t['nback_acc_severe']:
                score -= 25
            elif acc < t['nback_acc_high']:
                score -= 18
            elif acc < t['nback_acc_mod']:
                score -= 10
            elif acc < t['nback_acc_low']:
                score -= 5
        
        if features.get('gonogo_accuracy') is not None:
            acc = features['gonogo_accuracy']
            if acc < t['gonogo_acc_severe']:
                score -= 25
            elif acc < t['gonogo_acc_high']:
                score -= 18
            elif acc < t['gonogo_acc_mod']:
                score -= 12
            elif acc < t['gonogo_acc_low']:
                score -= 6
        
        return max(score, 0)
    
    def calculate_impulsivity_score(self, features):
        """Calculate impulse control score (0-100) - Higher is better"""
        score = 100
        t = self.thresholds
        
        if features.get('nback_fa_rate') is not None:
            fa_rate = features['nback_fa_rate']
            if fa_rate > t['nback_fa_severe']:
                score -= 50
            elif fa_rate > t['nback_fa_high']:
                score -= 42
            elif fa_rate > t['nback_fa_mod']:
                score -= 32
            elif fa_rate > t['nback_fa_low']:
                score -= 20
            elif fa_rate > t['nback_fa_vlow']:
                score -= 12
            elif fa_rate > t['nback_fa_min']:
                score -= 6
        
        if features.get('gonogo_fa_rate') is not None:
            fa_rate = features['gonogo_fa_rate']
            if fa_rate > t['gonogo_fa_severe']:
                score -= 50
            elif fa_rate > t['gonogo_fa_high']:
                score -= 40
            elif fa_rate > t['gonogo_fa_mod']:
                score -= 28
            elif fa_rate > t['gonogo_fa_low']:
                score -= 18
            elif fa_rate > t['gonogo_fa_vlow']:
                score -= 10
            elif fa_rate > t['gonogo_fa_min']:
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
        
        normal_composite = (
            attention_score * self.weights['attention'] +
            impulsivity_score * self.weights['impulsivity'] +
            working_memory_score * self.weights['working_memory']
        )
        
        composite_score = round(100 - normal_composite, 2)
        
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
            'age_group': self.age_group,
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
        
        # Extract age from input (required)
        age = test_data.get("age")
        if age is None:
            print(json.dumps({"error": "Age is required"}))
            return
        
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
        
        model = ADHDAssessmentModel(age)
        result = model.predict(formatted_input)
        
        print(json.dumps(result))
        
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}))
    except Exception as e:
        print(json.dumps({"error": f"Unexpected error: {str(e)}"}))


if __name__ == "__main__":
    main()