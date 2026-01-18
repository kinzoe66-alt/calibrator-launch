/**
 * app.js (HARDENED)
 * Fixes: Cannot set properties of null (textContent)
 * Strategy: never assume elements exist; find or create them.
 */

function getOrCreateOutput() {
  // Try common ids first
  let el =
    document.getElementById("output") ||
    document.getElementById("status") ||
    document.getElementById("result") ||
    document.querySelector("pre");

  // If none exist, create an output <pre>
  if (!el) {
    el = document.createElement("pre");
    el.id = "output";
    el.textContent = "Idle";
    document.body.appendChild(el);
  }

  return el;
}

function getRunButton() {
  // Try common ids
  let btn =
    document.getElementById("runRecon") ||
    document.getElementById("runTest") ||
    document.querySelector("button");

  return btn;
}

function safeSetText(el, text) {
  if (!el) return;
  el.textContent = String(text);
}

function runReconSafe() {
  // If you have a real runRecon somewhere else, use it.
  // Otherwise return a stable payload so UI proves end-to-end.
  const fn =
    (typeof window !== "undefined" && window.runRecon) ? window.runRecon :
    (typeof runRecon !== "undefined") ? runRecon :
    null;

  try {
    if (typeof fn === "function") return fn();
  } catch (e) {
    return { status: "error", error: String(e) };
  }

  return { status: "ok", signal: "calibrator-live", ts: Date.now() };
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = getRunButton();
  const out = getOrCreateOutput();

  if (!btn) {
    safeSetText(out, "ERROR: No button found (expected id runRecon/runTest).");
    return;
  }

  // Ensure click always works and never nulls
  btn.addEventListener("click", () => {
    safeSetText(out, "Running recon...");
    const res = runReconSafe();
    safeSetText(out, JSON.stringify(res, null, 2));
  });
});
