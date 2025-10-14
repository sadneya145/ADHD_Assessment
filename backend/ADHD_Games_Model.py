# ============================================
# ADHD Assessment Model (Rule-based, Partial Input Friendly)
# ============================================
import sys
import json

class ADHDAssessmentModel:
    def __init__(self):
        self.weights = {
            'attention': 0.35,
            'impulsivity': 0.40,
            'working_memory': 0.25
        }

    # -----------------------------
    # Extract features safely
    # -----------------------------
    def extract_features(self, test_data):
         # Stroop
        stroop_score = test_data.get('stroop_score')
        stroop_total = test_data.get('stroop_total', 10)
        stroop_accuracy = (stroop_score / stroop_total) if stroop_score is not None else None
        stroop_rt = test_data.get('stroop_avg_rt')

        # NBack
        nback_hits = test_data.get('nback_hits')
        nback_misses = test_data.get('nback_misses')
        nback_total = (nback_hits + nback_misses) if (nback_hits is not None and nback_misses is not None) else None
        nback_accuracy = (nback_hits / nback_total) if nback_total else None

        nback_false_alarms = test_data.get('nback_false_alarms')
        nback_correct_rejections = test_data.get('nback_correct_rejections')
        nback_total_nontargets = (nback_false_alarms + nback_correct_rejections) if (
            nback_false_alarms is not None and nback_correct_rejections is not None
        ) else None
        nback_fa_rate = (nback_false_alarms / nback_total_nontargets) if nback_total_nontargets else None

        # GoNoGo
        gonogo_hits = test_data.get('gonogo_hits')
        gonogo_misses = test_data.get('gonogo_misses')
        gonogo_total = (gonogo_hits + gonogo_misses) if (gonogo_hits is not None and gonogo_misses is not None) else None
        gonogo_accuracy = (gonogo_hits / gonogo_total) if gonogo_total else None

        gonogo_false_alarms = test_data.get('gonogo_false_alarms')
        gonogo_correct_rejections = test_data.get('gonogo_correct_rejections')
        gonogo_total_nogo = (gonogo_false_alarms + gonogo_correct_rejections) if (
            gonogo_false_alarms is not None and gonogo_correct_rejections is not None
        ) else None
        gonogo_fa_rate = (gonogo_false_alarms / gonogo_total_nogo) if gonogo_total_nogo else None

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

    # -----------------------------
    # Attention score
    # -----------------------------
    def calculate_attention_score(self, f):
        score = 0
        if f.get('stroop_accuracy') is not None:
            if f['stroop_accuracy'] < 0.5: score += 35
            elif f['stroop_accuracy'] < 0.6: score += 28
            elif f['stroop_accuracy'] < 0.7: score += 20
            elif f['stroop_accuracy'] < 0.8: score += 10

        if f.get('stroop_rt') is not None:
            if f['stroop_rt'] > 2000: score += 15
            elif f['stroop_rt'] > 1500: score += 10
            elif f['stroop_rt'] > 1200: score += 5

        if f.get('nback_accuracy') is not None:
            if f['nback_accuracy'] < 0.4: score += 25
            elif f['nback_accuracy'] < 0.55: score += 18
            elif f['nback_accuracy'] < 0.7: score += 10
            elif f['nback_accuracy'] < 0.8: score += 5

        if f.get('gonogo_accuracy') is not None:
            if f['gonogo_accuracy'] < 0.6: score += 25
            elif f['gonogo_accuracy'] < 0.7: score += 18
            elif f['gonogo_accuracy'] < 0.8: score += 12
            elif f['gonogo_accuracy'] < 0.85: score += 6

        return min(score, 100)


    # -----------------------------
    # Impulsivity score
    # -----------------------------
    def calculate_impulsivity_score(self, f):
        score = 0
        if f['nback_fa_rate'] is not None:
            if f['nback_fa_rate'] > 0.5: score += 50
            elif f['nback_fa_rate'] > 0.4: score += 42
            elif f['nback_fa_rate'] > 0.3: score += 32
            elif f['nback_fa_rate'] > 0.2: score += 20
            elif f['nback_fa_rate'] > 0.15: score += 12
            elif f['nback_fa_rate'] > 0.1: score += 6
        if f['gonogo_fa_rate'] is not None:
            if f['gonogo_fa_rate'] > 0.4: score += 50
            elif f['gonogo_fa_rate'] > 0.3: score += 40
            elif f['gonogo_fa_rate'] > 0.2: score += 28
            elif f['gonogo_fa_rate'] > 0.15: score += 18
            elif f['gonogo_fa_rate'] > 0.1: score += 10
            elif f['gonogo_fa_rate'] > 0.05: score += 5
        return min(score, 100)

    # -----------------------------
    # Working Memory score
    # -----------------------------
    def calculate_working_memory_score(self, f):
        score = 0
        if f['nback_accuracy'] is not None:
            if f['nback_accuracy'] < 0.3: score += 75
            elif f['nback_accuracy'] < 0.45: score += 60
            elif f['nback_accuracy'] < 0.6: score += 45
            elif f['nback_accuracy'] < 0.7: score += 30
            elif f['nback_accuracy'] < 0.8: score += 15
            elif f['nback_accuracy'] < 0.85: score += 8
        if f['stroop_accuracy'] is not None:
            if f['stroop_accuracy'] < 0.5: score += 25
            elif f['stroop_accuracy'] < 0.65: score += 18
            elif f['stroop_accuracy'] < 0.75: score += 12
            elif f['stroop_accuracy'] < 0.85: score += 6
        return min(score, 100)

    # -----------------------------
    # Prediction
    # -----------------------------
    def predict(self, test_data):
        f = self.extract_features(test_data)

        attention_score = self.calculate_attention_score(f)
        impulsivity_score = self.calculate_impulsivity_score(f)
        working_memory_score = self.calculate_working_memory_score(f)

        # Composite weighted only on available domains
        available_weights = {k: v for k, v in self.weights.items() if True}  # All domains exist
        composite_score = (
            attention_score * self.weights['attention'] +
            impulsivity_score * self.weights['impulsivity'] +
            working_memory_score * self.weights['working_memory']
        )

        # Risk classification
        if composite_score >= 70:
            likelihood = 'High'
            risk_level = 4
        elif composite_score >= 55:
            likelihood = 'Moderate-High'
            risk_level = 3
        elif composite_score >= 40:
            likelihood = 'Moderate'
            risk_level = 2
        elif composite_score >= 25:
            likelihood = 'Low-Moderate'
            risk_level = 1
        else:
            likelihood = 'Low'
            risk_level = 0

        return {
            'composite_score': round(composite_score, 2),
            'likelihood': likelihood,
            'risk_level': risk_level,
            'domain_scores': {
                'attention': round(attention_score, 2),
                'impulsivity': round(impulsivity_score, 2),
                'working_memory': round(working_memory_score, 2)
            },
            'features': f
        }

# ============================================
# ENTRY POINT FOR NODE.JS
# ============================================
def main():
    raw_input = sys.stdin.read()
    if not raw_input:
        print(json.dumps({"error": "No input received"}))
        return

    try:
        test_data = json.loads(raw_input)

        formatted_input = {
            "stroop_score": test_data.get("stroop", {}).get("score"),
            "stroop_total": test_data.get("stroop", {}).get("totalRounds"),
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

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
