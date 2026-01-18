import { runRecon } from "./logic.js";

const btn = document.getElementById("runRecon");
const out = document.getElementById("output");

btn.addEventListener("click", () => {
  out.textContent = "Running recon...";
  const res = runRecon();
  out.textContent = JSON.stringify(res, null, 2);
});
