const { spawn } = require('child_process');
const path = require('path');

/**
 * Run a Python script and return a promise
 * @param {string} scriptPath - Full path to the Python script
 * @returns {Promise<string>} - Resolves with stdout, rejects with error
 */
function runPythonScript(scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${path.basename(scriptPath)}`);

    const python = spawn('python', [scriptPath]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(output.trim());
    });

    python.stderr.on('data', (data) => {
      const error = data.toString();
      stderr += error;
      console.error(error.trim());
    });

    python.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ ${path.basename(scriptPath)} completed\n`);
        resolve(stdout);
      } else {
        console.error(`✗ ${path.basename(scriptPath)} failed with code ${code}\n`);
        reject(new Error(`Script failed: ${stderr || stdout}`));
      }
    });

    python.on('error', (error) => {
      console.error(`Failed to start Python: ${error.message}`);
      reject(error);
    });
  });
}

module.exports = { runPythonScript };