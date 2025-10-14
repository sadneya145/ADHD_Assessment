import json
import numpy as np
import pandas as pd
from typing import Dict, Tuple, List

class ADHDMouseAnalyzer:
    """
    Analyzes mouse movement data to detect ADHD indicators.
    Based on research showing ADHD correlates with increased movement variability,
    higher velocity, and more erratic patterns.
    """
    
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
    
    def load_data(self, filepath: str) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Load mouse tracking data from JSON file."""
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        times = np.array([point['time'] for point in data])
        xs = np.array([point['x'] for point in data])
        ys = np.array([point['y'] for point in data])
        
        return times, xs, ys
    
    def compute_metrics(self, times: np.ndarray, xs: np.ndarray, ys: np.ndarray) -> Dict:
        """Compute movement metrics from position data."""
        # Time and position differences
        dt = np.diff(times)
        dx = np.diff(xs)
        dy = np.diff(ys)
        
        # Distance and velocity
        dist = np.sqrt(dx**2 + dy**2)
        velocity = dist / (dt + 1e-6)
        
        # Acceleration
        acceleration = np.diff(velocity) / (dt[1:] + 1e-6)
        
        # Aggregate metrics
        metrics = {
            "total_distance": np.sum(dist),
            "max_velocity": np.max(velocity) if len(velocity) > 0 else 0,
            "max_acceleration": np.max(np.abs(acceleration)) if len(acceleration) > 0 else 0,
            "vel_std": np.std(velocity) if len(velocity) > 0 else 0,
            "acc_std": np.std(acceleration) if len(acceleration) > 0 else 0,
            "mean_velocity": np.mean(velocity) if len(velocity) > 0 else 0,
            "direction_changes": self._count_direction_changes(dx, dy)
        }
        
        return metrics
    
    def _count_direction_changes(self, dx: np.ndarray, dy: np.ndarray) -> int:
        """Count number of significant direction changes."""
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
    
    def analyze(self, filepath: str) -> Dict:
        """
        Main analysis function.
        Returns classification results and ADHD type prediction.
        """
        # Load and compute
        times, xs, ys = self.load_data(filepath)
        metrics = self.compute_metrics(times, xs, ys)
        
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
            "raw_metrics": metrics,
            "classifications": classifications,
            "adhd_type": adhd_type,
            "confidence": confidence
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
    
    def generate_report(self, results: Dict) -> str:
        """Generate a detailed text report."""
        report = []
        report.append("=" * 60)
        report.append("ADHD MOUSE MOVEMENT ANALYSIS REPORT")
        report.append("=" * 60)
        report.append("")
        
        # Raw metrics
        report.append("RAW METRICS:")
        report.append("-" * 60)
        for key, value in results["raw_metrics"].items():
            report.append(f"  {key.replace('_', ' ').title()}: {value:.2f}")
        report.append("")
        
        # Classifications
        report.append("CLASSIFICATIONS:")
        report.append("-" * 60)
        for key, value in results["classifications"].items():
            report.append(f"  {key}: {value}")
        report.append("")
        
        # Final diagnosis
        report.append("DIAGNOSIS:")
        report.append("-" * 60)
        report.append(f"  Type: {results['adhd_type']}")
        report.append(f"  Confidence: {results['confidence']:.1f}%")
        report.append("")
        
        # Interpretation
        report.append("INTERPRETATION:")
        report.append("-" * 60)
        adhd_type = results['adhd_type']
        
        if adhd_type == "No ADHD Indicators":
            report.append("  Mouse movement patterns are within normal ranges.")
            report.append("  No significant ADHD indicators detected.")
        elif adhd_type == "Hyperactive Type":
            report.append("  Elevated velocity and acceleration detected.")
            report.append("  Patterns consistent with hyperactive-type ADHD.")
        elif adhd_type == "Inattentive Type":
            report.append("  High movement variability and direction changes.")
            report.append("  Patterns consistent with inattentive-type ADHD.")
        elif adhd_type == "Combined Type":
            report.append("  Both hyperactive and inattentive indicators present.")
            report.append("  Patterns consistent with combined-type ADHD.")
        
        report.append("")
        report.append("=" * 60)
        report.append("DISCLAIMER:")
        report.append("This analysis is for research/screening purposes only.")
        report.append("Professional clinical evaluation is required for diagnosis.")
        report.append("=" * 60)
        
        return "\n".join(report)


def main():
    """Example usage of the ADHDMouseAnalyzer."""
    analyzer = ADHDMouseAnalyzer()
    
    # Analyze the data
    results = analyzer.analyze("mouse_tracking_data.json")
    
    # Generate and print report
    report = analyzer.generate_report(results)
    print(report)
    
    # Save results to JSON
    with open("analysis_results.json", 'w') as f:
        # Convert numpy types to native Python types for JSON serialization
        serializable_results = {
            "raw_metrics": {k: float(v) for k, v in results["raw_metrics"].items()},
            "classifications": results["classifications"],
            "adhd_type": results["adhd_type"],
            "confidence": float(results["confidence"])
        }
        json.dump(serializable_results, f, indent=2)
    
    print("\nResults saved to 'analysis_results.json'")


if __name__ == "__main__":
    main()