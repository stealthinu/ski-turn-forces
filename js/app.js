import {
  PHASE_COLORS,
  magnitudes,
  phaseStates,
  samplePath,
  solveSineFromRTurn,
} from "./physics.js";
import { applyI18n, getLang, phaseLabel, setLang, t } from "./i18n.js";
import { renderOverview, renderPhasePanel } from "./render.js";

const overviewCanvas = document.getElementById("overview");
const phaseCanvases = [...document.querySelectorAll(".phase-canvas")];

const els = {
  slope: document.getElementById("slope"),
  speed: document.getElementById("speed"),
  radius: document.getElementById("radius"),
  turnAngle: document.getElementById("turn-angle"),
  mass: document.getElementById("mass"),
  vSlope: document.getElementById("v-slope"),
  vSpeed: document.getElementById("v-speed"),
  vRadius: document.getElementById("v-radius"),
  vTurnAngle: document.getElementById("v-turn-angle"),
  vArc: document.getElementById("v-arc"),
  vMass: document.getElementById("v-mass"),
  tbody: document.querySelector("#data-table tbody"),
  langJa: document.getElementById("lang-ja"),
  langEn: document.getElementById("lang-en"),
};

const i18n = { t, phaseLabel };

function readParams() {
  const R = +els.radius.value;
  const turnAngle = +els.turnAngle.value;
  const { amp, wave, arc } = solveSineFromRTurn(R, turnAngle);
  return {
    slope: +els.slope.value,
    speed: +els.speed.value,
    R,
    turnAngle,
    mass: +els.mass.value,
    amp,
    wave,
    arc,
  };
}

function updateValueLabels(params) {
  els.vSlope.textContent = String(params.slope);
  els.vSpeed.textContent = params.speed.toFixed(1);
  els.vRadius.textContent = params.R.toFixed(1);
  els.vTurnAngle.textContent = String(params.turnAngle);
  els.vArc.textContent = params.arc.toFixed(1);
  els.vMass.textContent = String(params.mass);
}

function updateLangButtons() {
  const lang = getLang();
  els.langJa?.classList.toggle("active", lang === "ja");
  els.langEn?.classList.toggle("active", lang === "en");
}

function updateTable(phases) {
  els.tbody.replaceChildren(
    ...phases.map(({ label, state }) => {
      const { fg, fc, fn, angle } = magnitudes(state);
      const tr = document.createElement("tr");
      const r = Number.isFinite(state.radius) ? state.radius.toFixed(1) : "∞";
      tr.innerHTML = `
        <td>${label}</td>
        <td>${r}</td>
        <td>${fg.toFixed(0)}</td>
        <td>${fc.toFixed(0)}</td>
        <td>${fn.toFixed(0)}</td>
        <td>${angle.toFixed(0)}</td>`;
      return tr;
    }),
  );
}

function render() {
  const params = readParams();
  updateValueLabels(params);

  const simParams = {
    slope: params.slope,
    speed: params.speed,
    amp: params.amp,
    wave: params.wave,
    mass: params.mass,
  };

  const path = samplePath(simParams);
  const phases = phaseStates(simParams).map((p, i) => ({
    ...p,
    label: phaseLabel(p.id),
    color: PHASE_COLORS[i],
  }));

  renderOverview(overviewCanvas, simParams, phases, path, i18n);
  phaseCanvases.forEach((canvas, i) => renderPhasePanel(canvas, phases[i], i18n));
  updateTable(phases);
}

function switchLang(lang) {
  setLang(lang);
  applyI18n();
  updateLangButtons();
  render();
}

document.documentElement.lang = getLang() === "ja" ? "ja" : "en";
applyI18n();
updateLangButtons();

["slope", "speed", "radius", "turn-angle", "mass"].forEach((id) => {
  document.getElementById(id).addEventListener("input", render);
});
els.langJa?.addEventListener("click", () => switchLang("ja"));
els.langEn?.addEventListener("click", () => switchLang("en"));
window.addEventListener("resize", render);
render();
