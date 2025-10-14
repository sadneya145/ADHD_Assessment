# backend/app.py
import sys
import json
from ADHDMouseAnalyzer import ADHDMouseAnalyzer

if __name__ == "__main__":
    # Read mouse data JSON from stdin
    raw_input = sys.stdin.read()
    mouse_data = json.loads(raw_input)

    # Save temporarily (or process directly)
    temp_file = "mouse_tracking_data.json"
    with open(temp_file, "w") as f:
        json.dump(mouse_data, f)

    # Run analysis
    analyzer = ADHDMouseAnalyzer()
    results = analyzer.analyze(temp_file)

    # Ensure all values are serializable
    serializable_results = {
        "raw_metrics": {k: float(v) for k, v in results["raw_metrics"].items()},
        "classifications": results["classifications"],
        "adhd_type": results["adhd_type"],
        "confidence": float(results["confidence"])
    }

    # Print JSON result to stdout
    print(json.dumps(serializable_results))
