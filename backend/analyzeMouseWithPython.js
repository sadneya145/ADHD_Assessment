// analyzeMouseWithPython.js
const { spawn } = require('child_process');
const path = require('path');

function analyzeMouseWithPython(mouseData) {
  return new Promise((resolve, reject) => {
    console.log('\n🐭 ==================== MOUSE ANALYSIS START ====================');
    console.log('📊 Mouse data points:', Array.isArray(mouseData) ? mouseData.length : 'Invalid data');

    // Validate input
    if (!Array.isArray(mouseData) || mouseData.length === 0) {
      console.error('❌ Invalid mouse data provided');
      return reject(new Error('Invalid or empty mouse data'));
    }

    // Determine Python command based on platform
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    const scriptPath = path.join(__dirname, 'app.py');
    
    console.log('📄 Script path:', scriptPath);
    console.log('🖥️ Platform:', process.platform);
    console.log('🐍 Python command:', pythonCommand);

    // Check if we have the required data structure
    const samplePoint = mouseData[0];
    console.log('📍 Sample data point:', JSON.stringify(samplePoint));

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
      console.log('🐭 ==================== MOUSE ANALYSIS END ====================\n');
      reject(new Error(`Python spawn failed: ${error.message}`));
    });

    py.on('close', (code) => {
      console.log(`🐍 Python exited with code: ${code}`);
      console.log('🐭 ==================== MOUSE ANALYSIS END ====================\n');
      
      // If Python exited with error code
      if (code !== 0) {
        console.error('❌ Python exit code:', code);
        console.error('❌ Error output:', errorOutput);
        return reject(new Error(`Python failed (code ${code}): ${errorOutput || 'No error details'}`));
      }

      // Try to parse the output
      try {
        const trimmedOutput = output.trim();
        console.log('📋 Output length:', trimmedOutput.length);
        
        if (!trimmedOutput) {
          return reject(new Error('Python returned empty output'));
        }

        const result = JSON.parse(trimmedOutput);
        
        // Check if Python returned an error object
        if (result.error) {
          console.error('❌ Python returned error:', result.error);
          return reject(new Error(`Python error: ${result.error}`));
        }

        // Validate result structure
        if (!result.adhd_type || result.confidence === undefined) {
          console.error('❌ Invalid result structure:', result);
          return reject(new Error('Python returned invalid result structure'));
        }

        console.log('✅ Mouse analysis completed successfully');
        console.log('📊 Result:', {
          adhd_type: result.adhd_type,
          confidence: result.confidence.toFixed(1) + '%',
          classifications: Object.keys(result.classifications || {}).length + ' metrics'
        });
        
        resolve(result);
        
      } catch (parseError) {
        console.error('❌ Failed to parse Python output:', parseError.message);
        console.error('❌ Raw output:', output.substring(0, 200));
        reject(new Error(`JSON parse error: ${parseError.message}. Output: ${output.substring(0, 100)}`));
      }
    });

    // Write mouse data to Python's stdin
    try {
      const inputJSON = JSON.stringify(mouseData);
      console.log('📝 Writing to stdin:');
      console.log('  - Data points:', mouseData.length);
      console.log('  - JSON length:', inputJSON.length);
      console.log('  - First point:', JSON.stringify(mouseData[0]));
      console.log('  - Last point:', JSON.stringify(mouseData[mouseData.length - 1]));
      
      py.stdin.write(inputJSON);
      py.stdin.end();
    } catch (writeError) {
      console.error('❌ Failed to write to stdin:', writeError);
      reject(new Error(`Stdin write failed: ${writeError.message}`));
    }
  });
}

module.exports = analyzeMouseWithPython;