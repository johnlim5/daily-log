// Pomodoro Timer Web Worker
// Runs in a separate thread — NOT throttled when the tab is inactive.

let endTime = null;
let phase = null; // 'work' | 'break'
let intervalId = null;

function tick() {
  if (endTime === null) return;
  const now = Date.now();
  const remaining = Math.max(0, endTime - now);
  postMessage({ type: 'tick', remaining, phase });
  if (remaining <= 0) {
    clearInterval(intervalId);
    intervalId = null;
    endTime = null;
    postMessage({ type: 'done', phase });
  }
}

self.onmessage = function (e) {
  const { action, duration, phaseType } = e.data;

  if (action === 'start') {
    if (intervalId) clearInterval(intervalId);
    phase = phaseType;
    endTime = Date.now() + duration;
    // Tick every 200ms for smooth updates without excessive CPU
    intervalId = setInterval(tick, 200);
    tick(); // immediate first tick
  }

  if (action === 'pause') {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    // Convert remaining time so we can resume later
    if (endTime !== null) {
      const remaining = Math.max(0, endTime - Date.now());
      endTime = null;
      postMessage({ type: 'paused', remaining, phase });
    }
  }

  if (action === 'resume') {
    // duration here is the remaining ms passed back from UI
    endTime = Date.now() + duration;
    intervalId = setInterval(tick, 200);
    tick();
  }

  if (action === 'stop') {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    endTime = null;
    phase = null;
    postMessage({ type: 'stopped' });
  }
};
