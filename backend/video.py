# video.py
import sys
import json
import tempfile
import requests
import traceback
from ADHD_Video_Model import ADHDVideoModel

def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input:
            print(json.dumps({"error": "No input received"}), flush=True)
            return

        data = json.loads(raw_input)
        video_url = data.get("videoUrl")

        if not video_url:
            print(json.dumps({"error": "videoUrl is required"}), flush=True)
            return

        # Download video
        response = requests.get(video_url, stream=True, timeout=60)
        response.raise_for_status()

        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            for chunk in response.iter_content(1024 * 1024):
                tmp.write(chunk)
            video_path = tmp.name

        model = ADHDVideoModel()
        result = model.analyze_video(video_path)

        print(json.dumps(result), flush=True)

    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "traceback": traceback.format_exc()
        }), flush=True)

if __name__ == "__main__":
    main()
