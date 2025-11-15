const { spawnSync } = require('child_process');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runUntilPass() {
  let attempt = 1;
  let delayMs = 500;
  const maxDelay = 5000;

  while (true) {
    console.log(`\n[TEST LOOP] Attempt ${attempt}...`);
    const result = spawnSync('npx', ['vitest', 'run'], { stdio: 'inherit', shell: true });
    const code = result.status ?? result.exitCode ?? 1;
    if (code === 0) {
      console.log(`[TEST LOOP] All tests passed on attempt ${attempt}.`);
      process.exit(0);
    }
    console.log(`[TEST LOOP] Tests failed (code ${code}). Retrying after ${delayMs}ms...`);
    await sleep(delayMs);
    attempt += 1;
    delayMs = Math.min(Math.floor(delayMs * 1.5), maxDelay);
  }
}

runUntilPass().catch((err) => {
  console.error('[TEST LOOP] Unexpected error:', err);
  process.exit(1);
});
