const { spawn } = require("child_process");
const path = require("path");

function runVideoAssessment(videoUrl) {
  return new Promise((resolve, reject) => {
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const scriptPath = path.join(__dirname, "video.py");

    const py = spawn(pythonCmd, [scriptPath]);

    let output = "";
    let errorOutput = "";

    py.stdout.on("data", (data) => {
      output += data.toString();
    });

    py.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    py.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(errorOutput || "Python failed"));
      }

      try {
        const result = JSON.parse(output.trim());
        if (result.error) {
          return reject(new Error(result.error));
        }
        resolve(result);
      } catch (err) {
        reject(new Error("Invalid JSON from Python"));
      }
    });

    py.stdin.write(JSON.stringify({ videoUrl }));
    py.stdin.end();
  });
}

module.exports = runVideoAssessment;
