const { spawn } = require('child_process');

function runPythonAssessment(assessmentData) {
  return new Promise((resolve, reject) => {
    // ⚠️ On Windows, use 'python' instead of 'python3'
    const py = spawn('python', ['games.py']);

    let output = '';
    let errorOutput = '';

    py.stdout.on('data', (data) => {
      output += data.toString();
    });

    py.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    py.on('close', (code) => {
      if (code !== 0 || errorOutput) {
        return reject(new Error(`Python error: ${errorOutput}`));
      }

      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });

    py.stdin.write(JSON.stringify(assessmentData));
    py.stdin.end();
  });
}

module.exports = runPythonAssessment;
