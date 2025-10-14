# adhd_model.py
import sys
import json
from ADHD_Games_Model import ADHDAssessmentModel  # your model file

def main():
    raw_input = sys.stdin.read()
    if not raw_input:
        print(json.dumps({"error": "No input received"}))
        return

    try:
        test_data = json.loads(raw_input)

        # Use dict.get to safely access keys (returns None if missing)
        formatted_input = {
            "stroop_score": test_data.get("stroop", {}).get("score"),
            "stroop_total": test_data.get("stroop", {}).get("totalRounds"),
            "stroop_avg_rt": test_data.get("stroop", {}).get("avgReactionTime"),

            "nback_hits": test_data.get("nBack", {}).get("hits"),
            "nback_misses": test_data.get("nBack", {}).get("misses"),
            "nback_false_alarms": test_data.get("nBack", {}).get("falseAlarms"),
            "nback_correct_rejections": test_data.get("nBack", {}).get("correctRejections"),

            "gonogo_hits": test_data.get("goNoGo", {}).get("hits"),
            "gonogo_misses": test_data.get("goNoGo", {}).get("misses"),
            "gonogo_false_alarms": test_data.get("goNoGo", {}).get("falseAlarms"),
            "gonogo_correct_rejections": test_data.get("goNoGo", {}).get("correctRejections"),
            "gonogo_avg_rt": test_data.get("goNoGo", {}).get("avgReactionTime")
        }

        model = ADHDAssessmentModel()
        result = model.predict(formatted_input)

        print(json.dumps(result))  # Output back to Node.js

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()
