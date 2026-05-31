import {
  PHASE_COLORS,
  ampFromApexRadius,
  magnitudes,
  phaseStates,
  samplePath,
} from "./physics.js";
import { renderOverview, renderPhasePanel } from "./render.js";

const overviewCanvas = document.getElementById("overview");
const phaseCanvases = [...document.querySelectorAll(".phase-canvas")];

const els = {
  slope: document.getElementById("slope"),
  speed: document.getElementById("speed"),
  radius: document.getElementById("radius"),
  wave: document.getElementById("wave"),
  mass: document.getElementById("mass"),
  vSlope: document.getElementById("v-slope"),
  vSpeed: document.getElementById("v-speed"),
  vRadius: document.getElementById("v-radius"),
  vWave: document.getElementById("v-wave"),
  vMass: document.getElementById("v-mass"),
  vAmp: document.getElementById("v-amp"),
  tbody: document.querySelector("#data-table tbody"),
};

function readParams() {
  const wave = +els.wave.value;
  const apexR = +els.radius.value;
  return {
    slope: +els.slope.value,
    speed: +els.speed.value,
    wave,
    mass: +els.mass.value,
    amp: ampFromApexRadius(wave, apexR),
    apexR,
  };
}

function updateLabels(params) {
  els.vSlope.textContent = String(params.slope);
  els.vSpeed.textContent = params.speed.toFixed(1);
  els.vRadius.textContent = params.apexR.toFixed(1);
  els.vWave.textContent = String(params.wave);
  els.vMass.textContent = String(params.mass);
  els.vAmp.textContent = params.amp.toFixed(1);
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
  updateLabels(params);

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
    color: PHASE_COLORS[i],
  }));

  renderOverview(overviewCanvas, simParams, phases, path);
  phaseCanvases.forEach((canvas, i) => renderPhasePanel(canvas, phases[i]));
  updateTable(phases);
}

["slope", "speed", "radius", "wave", "mass"].forEach((id) => {
  document.getElementById(id).addEventListener("input", render);
});
window.addEventListener("resize", render);
render();
