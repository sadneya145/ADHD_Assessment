const { spawn } = require('child_process');
const path = require('path');

function runPythonAssessment(assessmentData) {
  return new Promise((resolve, reject) => {
    console.log('\n🐍 ==================== PYTHON START ====================');
    console.log('📥 Input to Python:', JSON.stringify(assessmentData, null, 2));

    // Determine Python command based on platform
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.join(__dirname, 'games.py');
    
    console.log('📄 Script path:', scriptPath);
    console.log('🖥️ Platform:', process.platform);
    console.log('🐍 Python command:', pythonCommand);

    const py = spawn(pythonCommand, [scriptPath]);

    let output = '';
    let errorOutput = '';

    py.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      console.log('📤 Python stdout:', chunk.trim());
    });

    py.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorOutput += chunk;
      console.error('⚠️ Python stderr:', chunk.trim());
    });

    py.on('error', (error) => {
      console.error('❌ Failed to spawn Python:', error.message);
      reject(new Error(`Python spawn failed: ${error.message}`));
    });

    py.on('close', (code) => {
      console.log(`🐍 Python exited with code: ${code}`);
      console.log('🐍 ==================== PYTHON END ====================\n');
      
      // If Python exited with error code
      if (code !== 0) {
        console.error('❌ Python exit code:', code);
        console.error('❌ Error output:', errorOutput);
        return reject(new Error(`Python failed (code ${code}): ${errorOutput || 'No error details'}`));
      }

      // If we got stderr but no stdout, that's suspicious
      if (errorOutput && !output.trim()) {
        console.error('❌ Only stderr, no stdout:', errorOutput);
        return reject(new Error(`Python error: ${errorOutput}`));
      }

      // Try to parse the output
      try {
        const trimmedOutput = output.trim();
        console.log('📋 Parsing output:', trimmedOutput);
        
        if (!trimmedOutput) {
          return reject(new Error('Python returned empty output'));
        }

        const result = JSON.parse(trimmedOutput);
        
        // Check if Python returned an error object
        if (result.error) {
          console.error('❌ Python returned error:', result.error);
          return reject(new Error(`Python error: ${result.error}`));
        }

        // Convert numeric risk_level to string
        if (typeof result.risk_level === 'number') {
          const riskMap = {
            0: 'low',
            1: 'low', 
            2: 'moderate',
            3: 'moderate',
            4: 'high'
          };
          result.risk_level = riskMap[result.risk_level] || 'unknown';
        }

        console.log('✅ Python result parsed successfully');
        console.log('📊 Composite score:', result.composite_score);
        console.log('📊 Likelihood:', result.likelihood);
        console.log('📊 Domain scores:', result.domain_scores);
        
        resolve(result);
        
      } catch (parseError) {
        console.error('❌ Failed to parse Python output:', parseError.message);
        console.error('❌ Raw output:', output);
        reject(new Error(`JSON parse error: ${parseError.message}. Output: ${output.substring(0, 200)}`));
      }
    });

    // Write input data to Python's stdin
    try {
      const inputJSON = JSON.stringify(assessmentData);
      console.log('📝 Writing to stdin (length: ' + inputJSON.length + ')');
      py.stdin.write(inputJSON);
      py.stdin.end();
    } catch (writeError) {
      console.error('❌ Failed to write to stdin:', writeError);
      reject(new Error(`Stdin write failed: ${writeError.message}`));
    }
  });
}

module.exports = runPythonAssessment;