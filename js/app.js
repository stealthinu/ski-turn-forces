import { PHASE_COLORS, magnitudes, simulate } from "./physics.js";
import { applyI18n, getLang, phaseLabel, setLang, t } from "./i18n.js";
import { renderOverview, renderOverviewSvg, renderPhasePanel } from "./render.js";

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
  exportOverviewSvg: document.getElementById("export-overview-svg"),
};

const i18n = { t, phaseLabel };
let lastRenderState = null;

function readParams() {
  return {
    slope: Number(els.slope.value),
    speed: Number(els.speed.value),
    R: Number(els.radius.value),
    depth: Number(els.depth.value),
    mass: Number(els.mass.value),
  };
}

function buildPhases(sim) {
  return sim.phases.map((phase, index) => ({
    ...phase,
    label: phaseLabel(phase.id),
    color: PHASE_COLORS[index],
  }));
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
  if (els.exportOverviewSvg) {
    const label = t("exportOverviewSvgLabel");
    els.exportOverviewSvg.setAttribute("aria-label", label);
    els.exportOverviewSvg.setAttribute("title", label);
  }
}

function updateTable(phases) {
  els.tbody.replaceChildren(
    ...phases.map(({ label, state }) => {
      const { fg, fc, fn, angle } = magnitudes(state);
      const tr = document.createElement("tr");
      const radius = Number.isFinite(state.radius) ? state.radius.toFixed(1) : "--";
      tr.innerHTML = `
        <td>${label}</td>
        <td>${radius}</td>
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
  const phases = buildPhases(sim);

  updateValueLabels(params, sim);
  renderOverview(overviewCanvas, params, phases, sim.path, i18n);
  phaseCanvases.forEach((canvas, index) => renderPhasePanel(canvas, phases[index], i18n));
  updateTable(phases);

  lastRenderState = { params, sim, phases };
}

function downloadOverviewSvg() {
  if (!lastRenderState) return;

  const width = Math.max(Math.round(overviewCanvas.clientWidth), 960);
  const height = Math.max(Math.round(overviewCanvas.clientHeight), 520);
  const svg = renderOverviewSvg({
    width,
    height,
    phases: lastRenderState.phases,
    path: lastRenderState.sim.path,
    i18n,
  });

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ski-turn-overview.svg";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
els.exportOverviewSvg?.addEventListener("click", downloadOverviewSvg);
window.addEventListener("resize", render);

render();
