# games.py
import sys
import json
import traceback

try:
    from ADHD_Games_Model import ADHDAssessmentModel
except ImportError:
    # Fallback if import fails
    ADHDAssessmentModel = None

def main():
    try:
        raw_input = sys.stdin.read()
        
        if not raw_input:
            print(json.dumps({"error": "No input received"}), flush=True)
            return

        test_data = json.loads(raw_input)
        
        # Extract age (CRITICAL - required by the model)
        age = test_data.get("age", 12)  # Default to 12 if not provided
        
        # Format the input data
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

        # Debug logging (goes to stderr, won't interfere with JSON output)
        sys.stderr.write(f"DEBUG: Age = {age}\n")
        sys.stderr.write(f"DEBUG: Formatted input = {json.dumps(formatted_input, indent=2)}\n")
        sys.stderr.flush()

        if ADHDAssessmentModel is None:
            print(json.dumps({
                "error": "ADHD_Games_Model not found. Please ensure ADHD_Games_Model.py exists."
            }), flush=True)
            return

        # Initialize model with age
        model = ADHDAssessmentModel(age)
        result = model.predict(formatted_input)

        # Debug output
        sys.stderr.write(f"DEBUG: Model result = {json.dumps(result, indent=2)}\n")
        sys.stderr.flush()

        # Output result as JSON
        print(json.dumps(result), flush=True)

    except json.JSONDecodeError as e:
        error_msg = {
            "error": f"Invalid JSON input: {str(e)}",
            "input_received": raw_input[:200] if 'raw_input' in locals() else "N/A"
        }
        print(json.dumps(error_msg), flush=True)
        sys.stderr.write(f"JSON Error: {traceback.format_exc()}\n")
        sys.stderr.flush()
        
    except Exception as e:
        error_msg = {
            "error": f"Unexpected error: {str(e)}",
            "traceback": traceback.format_exc()
        }
        print(json.dumps(error_msg), flush=True)
        sys.stderr.write(f"Error: {traceback.format_exc()}\n")
        sys.stderr.flush()

if __name__ == "__main__":
    main()