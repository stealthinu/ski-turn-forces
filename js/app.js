import { PHASE_COLORS, magnitudes, simulate } from "./physics.js";
import { applyI18n, getLang, phaseLabel, setLang, t } from "./i18n.js";
import { renderOverview, renderPhasePanel } from "./render.js";

const overviewCanvas = document.getElementById("overview");
const phaseCanvases = [...document.querySelectorAll(".phase-canvas")];

const els = {
  slope: document.getElementById("slope"),
  speed: document.getElementById("speed"),
  radius: document.getElementById("radius"),
  depth: document.getElementById("depth"),
  mass: document.getElementById("mass"),
  vSlope: document.getElementById("v-slope"),
  vSpeed: document.getElementById("v-speed"),
  vRadius: document.getElementById("v-radius"),
  vDepth: document.getElementById("v-depth"),
  vLength: document.getElementById("v-length"),
  vWidth: document.getElementById("v-width"),
  vMass: document.getElementById("v-mass"),
  tbody: document.querySelector("#data-table tbody"),
  langJa: document.getElementById("lang-ja"),
  langEn: document.getElementById("lang-en"),
};

const i18n = { t, phaseLabel };

function readParams() {
  return {
    slope: +els.slope.value,
    speed: +els.speed.value,
    R: +els.radius.value,
    depth: +els.depth.value,
    mass: +els.mass.value,
  };
}

function updateValueLabels(params, sim) {
  els.vSlope.textContent = String(params.slope);
  els.vSpeed.textContent = params.speed.toFixed(1);
  els.vRadius.textContent = params.R.toFixed(1);
  els.vDepth.textContent = String(params.depth);
  els.vLength.textContent = sim.length.toFixed(1);
  els.vWidth.textContent = sim.width.toFixed(1);
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
  const sim = simulate(params);
  updateValueLabels(params, sim);

  const phases = sim.phases.map((p, i) => ({
    ...p,
    label: phaseLabel(p.id),
    color: PHASE_COLORS[i],
  }));

  renderOverview(overviewCanvas, params, phases, sim.path, i18n);
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

["slope", "speed", "radius", "depth", "mass"].forEach((id) => {
  document.getElementById(id).addEventListener("input", render);
});
els.langJa?.addEventListener("click", () => switchLang("ja"));
els.langEn?.addEventListener("click", () => switchLang("en"));
window.addEventListener("resize", render);
render();
