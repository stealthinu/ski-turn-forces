/** 斜面垂直上から見たスキーターンの力計算 */

export const G = 9.81;

export const PHASES = [
  { id: "transition", label: "切り替え", theta: 0 },
  { id: "entry", label: "ターン前半", theta: Math.PI / 4 },
  { id: "apex", label: "一番外側", theta: Math.PI / 2 },
  { id: "exit", label: "ターン後半", theta: (3 * Math.PI) / 4 },
];

export const PHASE_COLORS = ["#7C3AED", "#EA580C", "#DB2777", "#0891B2"];

/** @typedef {{ slope: number, speed: number, amp: number, wave: number, mass: number }} SimParams */

/**
 * apex の曲率半径 R から振幅 A を逆算（サイン軌道、θ=π/2 で最小 R）
 * R = (λ/2π)² / A  →  A = (λ/2π)² / R
 */
export function ampFromApexRadius(wavelength, apexRadius) {
  const k = wavelength / (2 * Math.PI);
  return (k * k) / Math.max(apexRadius, 0.5);
}

/** apex 半径（参考表示用） */
export function apexRadius(wavelength, amplitude) {
  const k = wavelength / (2 * Math.PI);
  return (k * k) / amplitude;
}

export function pathPoint(theta, wavelength, amplitude) {
  const x = (wavelength / (2 * Math.PI)) * theta;
  const y = amplitude * Math.sin(theta);
  const dx = wavelength / (2 * Math.PI);
  const dy = amplitude * Math.cos(theta);
  const ddx = 0;
  const ddy = -amplitude * Math.sin(theta);
  return { x, y, dx, dy, ddx, ddy };
}

export function signedCurvature(dx, dy, ddx, ddy) {
  const denom = (dx * dx + dy * dy) ** 1.5;
  if (denom < 1e-12) return 0;
  return (dx * ddy - dy * ddx) / denom;
}

function unit(v) {
  const n = Math.hypot(v[0], v[1]);
  return n < 1e-12 ? [1, 0] : [v[0] / n, v[1] / n];
}

/** @returns {import('./physics.js').ForceState} */
export function forcesAt(theta, params) {
  const { slope, speed, amp, wave, mass } = params;
  const { x, y, dx, dy, ddx, ddy } = pathPoint(theta, wave, amp);
  const tangent = unit([dx, dy]);
  const kappa = signedCurvature(dx, dy, ddx, ddy);
  const radius = Math.abs(kappa) > 1e-9 ? Math.abs(1 / kappa) : Infinity;

  const fgMag = mass * G * Math.sin((slope * Math.PI) / 180);
  const gravity = { x: fgMag, y: 0 };

  let centrifugal = { x: 0, y: 0 };
  if (Math.abs(kappa) > 1e-9) {
    const leftNormal = { x: -tangent[1], y: tangent[0] };
    const centerDir =
      kappa > 0
        ? leftNormal
        : { x: -leftNormal.x, y: -leftNormal.y };
    const fcMag = mass * speed * speed * Math.abs(kappa);
    centrifugal = { x: -centerDir.x * fcMag, y: -centerDir.y * fcMag };
  }

  const resultant = {
    x: gravity.x + centrifugal.x,
    y: gravity.y + centrifugal.y,
  };

  return {
    theta,
    x,
    y,
    tangent: { x: tangent[0], y: tangent[1] },
    radius,
    kappa,
    gravity,
    centrifugal,
    resultant,
  };
}

export function samplePath(params, n = 400) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const th = (2 * Math.PI * i) / n;
    const { x, y } = pathPoint(th, params.wave, params.amp);
    pts.push({ x, y, theta: th });
  }
  return pts;
}

export function phaseStates(params) {
  return PHASES.map((phase) => ({
    ...phase,
    state: forcesAt(phase.theta, params),
  }));
}

export function magnitudes(state) {
  const fg = Math.hypot(state.gravity.x, state.gravity.y);
  const fc = Math.hypot(state.centrifugal.x, state.centrifugal.y);
  const fn = Math.hypot(state.resultant.x, state.resultant.y);
  const angle = (Math.atan2(state.resultant.y, state.resultant.x) * 180) / Math.PI;
  return { fg, fc, fn, angle };
}
