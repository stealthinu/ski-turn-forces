import test from "node:test";
import assert from "node:assert/strict";

import { PHASE_COLORS, simulate } from "../js/physics.js";
import { renderOverviewSvg } from "../js/render.js";

const PHASE_LABELS = ["Transition", "Turn entry", "Apex", "Turn exit"];

const i18n = {
  t(key) {
    return {
      axisX: "Lateral x [m]",
      axisY: "Downhill y [m]",
      downhill: "Downhill y",
    }[key] ?? key;
  },
};

test("renderOverviewSvg outputs a standalone overview diagram as svg", () => {
  const params = { slope: 20, speed: 14, R: 15, depth: 60, mass: 60 };
  const sim = simulate(params);
  const phases = sim.phases.map((phase, index) => ({
    ...phase,
    label: PHASE_LABELS[index],
    color: PHASE_COLORS[index],
  }));

  const svg = renderOverviewSvg({
    width: 960,
    height: 520,
    phases,
    path: sim.path,
    i18n,
  });

  assert.match(svg, /^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /viewBox="0 0 960 520"/);
  assert.match(svg, /<polyline[^>]+stroke="#64748B"/);
  assert.match(svg, /Downhill y/);
  assert.match(svg, /Lateral x \[m\]/);
  assert.match(svg, /Turn entry/);
  assert.match(svg, /marker-end="url\(#arrowhead-1\)"/);
});
