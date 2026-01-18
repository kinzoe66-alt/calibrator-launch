/* ============================================================
   CALIBRATOR — SINGLE STATE, DETERMINISTIC SYSTEM
   ============================================================

   SEMANTICS:
   - Manual Signals: quantitative factors chosen by the user
     (weights, intensities, scores).
   - Raw Input: qualitative context describing the situation.
   - Derived Signals: deterministic features extracted from Raw Input.
   - Metrics: numeric summary of the calibration run.
   - Interpretation: actionable system understanding.

   ============================================================ */

/* =========================
   Global State
   ========================= */
const state = {
  status: "idle",          // idle | running | complete | error
  signalsDraft: [10, 20, 30],
  rawInput: "",
  runs: [],
  error: null
};

/* =========================
   Pure Helpers
   ========================= */
function deriveTextSignals(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);

  const positive = ["good", "clear", "success", "positive", "ready"];
  const negative = ["bad", "confused", "fail", "error", "blocked"];

  let sentiment = 0;
  words.forEach(w => {
    const lw = w.toLowerCase();
    if (positive.includes(lw)) sentiment++;
    if (negative.includes(lw)) sentiment--;
  });

  return [
    text.length,           // Text Length
    words.length,          // Word Count
    sentences.length,      // Sentence Count
    sentiment               // Sentiment Proxy
  ];
}

function deriveMetrics(signals) {
  let min = signals[0];
  let max = signals[0];
  let sum = 0;

  signals.forEach(v => {
    min = Math.min(min, v);
    max = Math.max(max, v);
    sum += v;
  });

  return {
    min,
    max,
    mean: Number((sum / signals.length).toFixed(2)),
    count: signals.length
  };
}

/* =========================
   Interpretation Logic
   ========================= */
function interpret(metrics, textSignals) {
  if (!metrics) {
    return {
      pressure: "Low",
      load: "Low",
      clarity: "Low",
      readiness: "Not Ready"
    };
  }

  const textLength = textSignals[0] || 0;
  const sentenceCount = textSignals[2] || 1;

  const pressure =
    metrics.mean + textLength > 200 ? "High" :
    metrics.mean + textLength > 80 ? "Medium" : "Low";

  const load =
    metrics.count + sentenceCount > 15 ? "High" :
    metrics.count + sentenceCount > 8 ? "Medium" : "Low";

  const clarity =
    sentenceCount > 6 ? "Low" :
    sentenceCount > 3 ? "Medium" : "High";

  const readiness =
    pressure !== "High" && clarity === "High"
      ? "Ready"
      : "Not Ready";

  return { pressure, load, clarity, readiness };
}

/* =========================
   Actions
   ========================= */
function updateSignal(index, value) {
  if (!Number.isFinite(value)) return;
  state.signalsDraft[index] = value;
  render();
}

function updateRawInput(value) {
  state.rawInput = value;
  render();
}

function submitCalibration() {
  if (!state.rawInput.trim()) {
    state.error = "Raw Input is required to run calibration.";
    render();
    return;
  }

  state.status = "running";
  state.error = null;
  render();

  const derived = deriveTextSignals(state.rawInput);
  const signals = state.signalsDraft.concat(derived);
  const metrics = deriveMetrics(signals);

  state.runs.unshift({
    id: state.runs.length + 1,
    timestamp: Date.now(),
    signals,
    metrics,
    derived
  });
  state.runs = state.runs.slice(0, 5);

  state.rawInput = "";
  state.status = "complete";
  render();
}

function resetAll() {
  state.status = "idle";
  state.signalsDraft = [10, 20, 30];
  state.rawInput = "";
  state.runs = [];
  state.error = null;
  render();
}

/* =========================
   Render (Single Path)
   ========================= */
function render() {
  const root = document.getElementById("app");
  const latest = state.runs[0];
  const interp = latest
    ? interpret(latest.metrics, latest.derived)
    : interpret(null, []);

  root.innerHTML = `
    <h1>Calibrator</h1>
    <p class="subhead">
      Quantitative signals + qualitative context → calibrated system state
    </p>

    <div class="panel status-${state.status}">
      <div class="status ${state.status}">
        Status: ${state.status.toUpperCase()}
      </div>

      <div class="inputs">
        ${state.signalsDraft.map((v, i) => `
          <div class="signal-row">
            <label>Signal ${i + 1} (Quantitative Factor)</label>
            <input type="number" value="${v}" data-i="${i}" />
          </div>
        `).join("")}
      </div>

      <div class="inputs" style="margin-top:12px;">
        <label>Raw Input (Qualitative Context)</label>
        <textarea>${state.rawInput}</textarea>
      </div>

      <div class="row">
        <button class="primary" id="submit">Submit Calibration</button>
        <button class="secondary" id="reset">Reset</button>
      </div>

      ${state.error ? `<div class="status error">${state.error}</div>` : ""}
    </div>

    <div class="panel interpretation">
      <strong>Interpretation</strong>
      <div class="kv">
        <div class="k">Pressure Level</div>
        <div class="v ${interp.pressure.toLowerCase()}">${interp.pressure}</div>

        <div class="k">Cognitive Load</div>
        <div class="v ${interp.load.toLowerCase()}">${interp.load}</div>

        <div class="k">Clarity</div>
        <div class="v ${interp.clarity.toLowerCase()}">${interp.clarity}</div>

        <div class="k">Action Readiness</div>
        <div class="v ${interp.readiness === "Ready" ? "ready" : "not-ready"}">
          ${interp.readiness}
        </div>
      </div>
    </div>

    <div class="panel">
      <strong>Latest Metrics</strong>
      <div class="kv">
        <div class="k">Min</div><div>${latest ? latest.metrics.min : "—"}</div>
        <div class="k">Max</div><div>${latest ? latest.metrics.max : "—"}</div>
        <div class="k">Mean</div><div>${latest ? latest.metrics.mean : "—"}</div>
        <div class="k">Count</div><div>${latest ? latest.metrics.count : "—"}</div>
      </div>
    </div>

    <div class="panel">
      <strong>Recent Runs</strong>
      <div class="list">
        ${state.runs.map(r => `
          <div class="run">
            <div class="run-title">Run #${r.id}</div>
            <div>${new Date(r.timestamp).toLocaleString()}</div>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  root.querySelectorAll("input[type=number]").forEach(el =>
    el.addEventListener("input", e =>
      updateSignal(Number(e.target.dataset.i), Number(e.target.value))
    )
  );

  root.querySelector("textarea").addEventListener("input", e =>
    updateRawInput(e.target.value)
  );

  document.getElementById("submit").onclick = submitCalibration;
  document.getElementById("reset").onclick = resetAll;
}

/* =========================
   Boot
   ========================= */
render();
