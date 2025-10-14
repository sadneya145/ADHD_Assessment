// backend/analyzeMouseWithPython.js
const { spawn } = require('child_process');

function analyzeMouseWithPython(mouseData) {
  return new Promise((resolve, reject) => {
    const py = spawn(process.platform === 'win32' ? 'python' : 'python3', ['app.py']);
 // Use 'python' on Windows if needed

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

    py.stdin.write(JSON.stringify(mouseData));
    py.stdin.end();
  });
}

module.exports = analyzeMouseWithPython;
