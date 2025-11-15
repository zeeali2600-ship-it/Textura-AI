// Textura AI frontend main.js (v2.1)
// Backend: Render POST /api/generate-image
// IMPORTANT: NEVER expose API key here. Keys live only in server env variables.

// ====== CONFIG ======
const API_URL = 'https://textura-api.onrender.com/api/generate-image'; // change only if your Render URL differs
const DEFAULT_MODEL_ID = 'imagen-4.0-fast-generate';
const DEFAULT_ASPECT_RATIO = '1:1';
const REQUEST_TIMEOUT_MS = 60000; // 60s

console.log('Main.js v2.1 loaded');

// ====== DOM ======
const TRIALS_KEY = 'textura_trials_left';
const preview = document.getElementById('preview');
const trialsEl = document.getElementById('trials-left');
const genBtn = document.getElementById('generate');
const subBtn = document.getElementById('subscribe');
const promptEl = document.getElementById('prompt');

// Future optional selects:
// const modelSelect = document.getElementById('model');        // <select id="model">
// const ratioSelect = document.getElementById('aspect-ratio'); // <select id="aspect-ratio">

// ====== STATE ======
let trials = Number(localStorage.getItem(TRIALS_KEY));
if (!Number.isFinite(trials) || trials <= 0) trials = 3;
updateTrials();

// ====== EVENT: Generate ======
genBtn.addEventListener('click', async () => {
  const prompt = (promptEl.value || '').trim();
  if (!prompt) {
    alert('Please enter a prompt.');
    return;
  }
  if (trials <= 0) {
    alert('Free trials khatam. Please Subscribe.');
    return;
  }

  setLoading(true);
  clearPreviewError();

  try {
    const payload = buildPayload(prompt);
    const data = await postWithTimeout(API_URL, payload, REQUEST_TIMEOUT_MS);

    if (!data || !data.imageUrl) {
      throw new Error('No imageUrl returned.');
    }

    showImage(data.imageUrl);

    // Trials only decrement on success
    trials -= 1;
    localStorage.setItem(TRIALS_KEY, String(trials));
    updateTrials();
  } catch (e) {
    console.error(e);
    showError('Error: ' + (e.message || e));
    alert('Kuch ghalt hogaya: ' + (e.message || e));
  } finally {
    setLoading(false);
  }
});

// ====== EVENT: Subscribe ======
subBtn.addEventListener('click', () => {
  alert('Subscribe flow Windows Store me baad me add hoga (demo).');
});

// ====== HELPERS ======
function buildPayload(prompt) {
  // Agar dropdowns ayenge to unki values yahan pick karenge
  const model_id = DEFAULT_MODEL_ID; // modelSelect?.value || DEFAULT_MODEL_ID;
  const aspect_ratio = DEFAULT_ASPECT_RATIO; // ratioSelect?.value || DEFAULT_ASPECT_RATIO;
  return { prompt, model_id, aspect_ratio };
}

async function postWithTimeout(url, body, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal
  }).catch(err => {
    clearTimeout(id);
    throw new Error('Network fail: ' + err.message);
  });

  clearTimeout(id);

  if (!res.ok) {
    // Try parse JSON error
    let detail = '';
    try {
      const jsonErr = await res.json();
      detail = jsonErr.error || JSON.stringify(jsonErr).slice(0, 150);
    } catch {
      detail = res.status + ' ' + res.statusText;
    }
    throw new Error('API error: ' + detail);
  }

  return res.json().catch(() => {
    throw new Error('Bad JSON response');
  });
}

function updateTrials() {
  if (trialsEl) trialsEl.textContent = String(trials);
}

function setLoading(isLoading) {
  genBtn.disabled = isLoading;
  genBtn.textContent = isLoading ? 'Generating…' : 'Generate Image';
}

function showImage(url) {
  preview.innerHTML = '';
  const img = document.createElement('img');
  img.className = 'generated';
  img.alt = 'Generated image';
  img.src = url;
  img.loading = 'lazy';
  preview.appendChild(img);
}

function showError(msg) {
  // Show an error box inside preview
  if (!preview) return;
  const div = document.createElement('div');
  div.className = 'error-box';
  div.style.padding = '12px';
  div.style.color = '#b00020';
  div.style.background = '#ffecec';
  div.style.border = '1px solid #ffb3b3';
  div.style.borderRadius = '8px';
  div.textContent = msg;
  preview.innerHTML = '';
  preview.appendChild(div);
}

function clearPreviewError() {
  // Just clears previous content (image or error)
  // Could add logic to only remove error if needed
}

window.addEventListener('unhandledrejection', (ev) => {
  console.error('Unhandled promise rejection:', ev.reason);
  showError('Unhandled error: ' + (ev.reason?.message || ev.reason));
});

// OPTIONAL: utility to reset trials during dev
window.resetTrials = function (n = 3) {
  trials = n;
  localStorage.setItem(TRIALS_KEY, String(trials));
  updateTrials();
  console.log('Trials reset to', n);
};

// ====== END ======
