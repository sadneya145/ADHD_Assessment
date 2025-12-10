"""
Mouse Movement Analysis for ADHD Detection
Entry point for Node.js integration
"""

import sys
import json
import numpy as np
from typing import Dict


class ADHDMouseAnalyzer:
    """Analyzes mouse movement data to detect ADHD indicators."""
    
    def __init__(self):
        # Research-based thresholds
        self.thresholds = {
            "total_distance": {"low": 1000, "high": 4000},
            "max_velocity": {"low": 300, "high": 1000},
            "max_acceleration": {"low": 5000, "high": 20000},
            "vel_std": {"low": 100, "high": 500},
            "acc_std": {"low": 1000, "high": 5000},
            "direction_changes": {"low": 5, "high": 20}
        }
    
    def compute_metrics(self, mouse_data: list) -> Dict:
        """Compute movement metrics from position data."""
        if len(mouse_data) < 2:
            return self._empty_metrics()
        
        # Extract arrays
        times = np.array([point.get('time', 0) for point in mouse_data])
        xs = np.array([point.get('x', 0) for point in mouse_data])
        ys = np.array([point.get('y', 0) for point in mouse_data])
        
        # Time and position differences
        dt = np.diff(times)
        dx = np.diff(xs)
        dy = np.diff(ys)
        
        # Avoid division by zero
        dt = np.where(dt == 0, 1e-6, dt)
        
        # Distance and velocity
        dist = np.sqrt(dx**2 + dy**2)
        velocity = dist / dt
        
        # Acceleration
        if len(velocity) > 1:
            acceleration = np.diff(velocity) / dt[1:]
        else:
            acceleration = np.array([])
        
        # Count direction changes
        direction_changes = self._count_direction_changes(dx, dy)
        
        # Aggregate metrics
        metrics = {
            "total_distance": float(np.sum(dist)),
            "max_velocity": float(np.max(velocity)) if len(velocity) > 0 else 0,
            "max_acceleration": float(np.max(np.abs(acceleration))) if len(acceleration) > 0 else 0,
            "vel_std": float(np.std(velocity)) if len(velocity) > 0 else 0,
            "acc_std": float(np.std(acceleration)) if len(acceleration) > 0 else 0,
            "mean_velocity": float(np.mean(velocity)) if len(velocity) > 0 else 0,
            "direction_changes": direction_changes
        }
        
        return metrics
    
    def _empty_metrics(self) -> Dict:
        """Return empty metrics for insufficient data."""
        return {
            "total_distance": 0,
            "max_velocity": 0,
            "max_acceleration": 0,
            "vel_std": 0,
            "acc_std": 0,
            "mean_velocity": 0,
            "direction_changes": 0
        }
    
    def _count_direction_changes(self, dx: np.ndarray, dy: np.ndarray) -> int:
        """Count number of significant direction changes."""
        if len(dx) < 2:
            return 0
        
        direction_changes = 0
        for i in range(1, len(dx)):
            dot_product = dx[i-1] * dx[i] + dy[i-1] * dy[i]
            if dot_product < 0:
                direction_changes += 1
        return direction_changes
    
    def classify_feature(self, value: float, low: float, high: float) -> str:
        """Classify a metric value as Normal, Borderline, or High."""
        if value < low:
            return "Normal"
        elif value > high:
            return "High"
        else:
            return "Borderline"
    
    def analyze(self, mouse_data: list) -> Dict:
        """Main analysis function."""
        # Compute metrics
        metrics = self.compute_metrics(mouse_data)
        
        # Classify each metric
        classifications = {
            "Total Distance": self.classify_feature(
                metrics["total_distance"], 
                **self.thresholds["total_distance"]
            ),
            "Max Velocity": self.classify_feature(
                metrics["max_velocity"], 
                **self.thresholds["max_velocity"]
            ),
            "Max Acceleration": self.classify_feature(
                metrics["max_acceleration"], 
                **self.thresholds["max_acceleration"]
            ),
            "Velocity Variability": self.classify_feature(
                metrics["vel_std"], 
                **self.thresholds["vel_std"]
            ),
            "Acceleration Variability": self.classify_feature(
                metrics["acc_std"], 
                **self.thresholds["acc_std"]
            ),
            "Direction Changes": self.classify_feature(
                metrics["direction_changes"], 
                **self.thresholds["direction_changes"]
            )
        }
        
        # Determine ADHD type
        adhd_type = self._determine_adhd_type(classifications)
        
        # Calculate confidence score
        confidence = self._calculate_confidence(classifications, adhd_type)
        
        return {
            "adhd_type": adhd_type,
            "confidence": confidence,
            "classifications": classifications,
            "raw_metrics": metrics
        }
    
    def _determine_adhd_type(self, classifications: Dict) -> str:
        """Determine ADHD type based on classification patterns."""
        # Check for hyperactive indicators
        hyperactive = (
            classifications["Max Velocity"] == "High" or 
            classifications["Max Acceleration"] == "High"
        )
        
        # Check for inattentive indicators
        inattentive = (
            classifications["Velocity Variability"] == "High" or 
            classifications["Direction Changes"] == "High"
        )
        
        # Determine type
        if hyperactive and inattentive:
            return "Combined Type"
        elif hyperactive:
            return "Hyperactive Type"
        elif inattentive:
            return "Inattentive Type"
        else:
            return "No ADHD Indicators"
    
    def _calculate_confidence(self, classifications: Dict, adhd_type: str) -> float:
        """Calculate confidence score (0-100) for the classification."""
        high_count = sum(1 for v in classifications.values() if v == "High")
        borderline_count = sum(1 for v in classifications.values() if v == "Borderline")
        
        if adhd_type == "No ADHD Indicators":
            # Confidence based on how many are normal
            normal_count = sum(1 for v in classifications.values() if v == "Normal")
            return (normal_count / len(classifications)) * 100
        else:
            # Confidence based on high and borderline indicators
            return min(100, (high_count * 15 + borderline_count * 5) + 30)


def main():
    """Entry point for Node.js integration."""
    try:
        # Read JSON input from stdin
        raw_input = sys.stdin.read()
        
        if not raw_input:
            print(json.dumps({"error": "No input received"}), flush=True)
            return
        
        # Parse input
        input_data = json.loads(raw_input)
        
        # Debug logging to stderr (won't interfere with JSON output)
        sys.stderr.write(f"DEBUG: Received {len(input_data)} mouse data points\n")
        sys.stderr.flush()
        
        # Create analyzer and analyze
        analyzer = ADHDMouseAnalyzer()
        result = analyzer.analyze(input_data)
        
        # Debug output
        sys.stderr.write(f"DEBUG: Analysis result: {result['adhd_type']}, confidence: {result['confidence']:.1f}%\n")
        sys.stderr.flush()
        
        # Output result as JSON
        print(json.dumps(result), flush=True)
        
    except json.JSONDecodeError as e:
        error_msg = {
            "error": f"Invalid JSON input: {str(e)}",
            "adhd_type": "Error",
            "confidence": 0,
            "classifications": {}
        }
        print(json.dumps(error_msg), flush=True)
        sys.stderr.write(f"JSON Error: {str(e)}\n")
        sys.stderr.flush()
        
    except Exception as e:
        error_msg = {
            "error": f"Analysis error: {str(e)}",
            "adhd_type": "Error",
            "confidence": 0,
            "classifications": {}
        }
        print(json.dumps(error_msg), flush=True)
        sys.stderr.write(f"Error: {str(e)}\n")
        sys.stderr.flush()


if __name__ == "__main__":
    main()