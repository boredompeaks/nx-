#!/usr/bin/env node

/**
 * Test Loop Runner
 * Runs tests continuously until they pass or max attempts reached
 * Implements exponential backoff and detailed error reporting
 */

const { spawn } = require('child_process');
const chalk = require('chalk');

const MAX_ATTEMPTS = 10;
const INITIAL_DELAY = 1000; // 1 second
const MAX_DELAY = 30000; // 30 seconds

let attempts = 0;
let currentDelay = INITIAL_DELAY;

function runTests() {
  attempts++;
  console.log(chalk.blue(`\n🧪 Test attempt ${attempts}/${MAX_ATTEMPTS}`));
  console.log(chalk.gray(`Running: npm test`));

  const testProcess = spawn('npm', ['test'], {
    stdio: 'pipe',
    shell: true
  });

  let stdout = '';
  let stderr = '';

  testProcess.stdout.on('data', (data) => {
    stdout += data.toString();
    process.stdout.write(data);
  });

  testProcess.stderr.on('data', (data) => {
    stderr += data.toString();
    process.stderr.write(data);
  });

  testProcess.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.green('\n✅ All tests passed!'));
      console.log(chalk.green(`Completed in ${attempts} attempt(s)`));
      process.exit(0);
    } else {
      console.log(chalk.red(`\n❌ Tests failed with code ${code}`));
      
      if (attempts >= MAX_ATTEMPTS) {
        console.log(chalk.red(`\n🛑 Maximum attempts (${MAX_ATTEMPTS}) reached.`));
        console.log(chalk.red('Tests are consistently failing. Please fix the issues and try again.'));
        
        // Show last error summary
        if (stderr) {
          console.log(chalk.yellow('\n📋 Last error summary:'));
          console.log(stderr.split('\n').slice(-10).join('\n'));
        }
        
        process.exit(1);
      }

      console.log(chalk.yellow(`\n⏳ Retrying in ${currentDelay}ms...`));
      console.log(chalk.gray(`Next attempt: ${attempts + 1}/${MAX_ATTEMPTS}`));
      
      setTimeout(() => {
        // Exponential backoff with max delay
        currentDelay = Math.min(currentDelay * 2, MAX_DELAY);
        runTests();
      }, currentDelay);
    }
  });

  testProcess.on('error', (error) => {
    console.log(chalk.red(`\n💥 Test process error: ${error.message}`));
    
    if (attempts >= MAX_ATTEMPTS) {
      console.log(chalk.red('Maximum attempts reached. Exiting.'));
      process.exit(1);
    }

    setTimeout(() => {
      runTests();
    }, currentDelay);
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🛑 Test loop interrupted by user'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n🛑 Test loop terminated'));
  process.exit(0);
});

console.log(chalk.bold.blue('🔄 Starting test loop...'));
console.log(chalk.gray(`Max attempts: ${MAX_ATTEMPTS}`));
console.log(chalk.gray(`Initial delay: ${INITIAL_DELAY}ms`));
console.log(chalk.gray('Press Ctrl+C to stop\n'));

runTests();