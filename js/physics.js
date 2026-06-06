/**
 * 斜面垂直上から見たスキーターンの力計算（サインカーブ・ターンモデル）
 *
 * 座標系:
 *   x = 横方向（画面では左右）
 *   y = 降下方向（画面では下向き）
 *
 * 軌道は x = A·sin(t), y = c·t（c = λ/2π）のサインカーブ。
 *   - 曲率半径は場所で変化し、apex（一番外側 t=π/2）で最小 = R、
 *     切り替え（t=0, π）で ∞ になる。
 *   - 入力は「apex の最小半径 R」と「1ターン角 θ」。
 *     θ は 1ターン弧長 L = R·θ を決め、そこから A, λ を数値的に解く。
 *   - 遠心力 Fc = m·v²/r（r は局所半径）。apex で最大、切り替えで 0。
 */

export const G = 9.81;

/** ターン内の代表フェーズ（1ターン = t:0→π） */
export const PHASES = [
  { id: "transition", theta: 0 },
  { id: "entry", theta: Math.PI / 4 },
  { id: "apex", theta: Math.PI / 2 },
  { id: "exit", theta: (3 * Math.PI) / 4 },
];

export const PHASE_COLORS = ["#7C3AED", "#EA580C", "#DB2777", "#0891B2"];

/** @typedef {{ slope: number, speed: number, amp: number, wave: number, mass: number }} SimParams */

const deg2rad = (d) => (d * Math.PI) / 180;

/** 1ターン弧長 L = R·θ [m]（θ は度） */
export function arcLength(R, turnAngleDeg) {
  return R * deg2rad(turnAngleDeg);
}

/** サイン1ターン分（t:0→π）の弧長を数値積分 */
function sineArcLength(amp, c, steps = 240) {
  let sum = 0;
  const dt = Math.PI / steps;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) * dt;
    const dx = amp * Math.cos(t);
    sum += Math.hypot(dx, c) * dt;
  }
  return sum;
}

/**
 * 「apex 最小半径 R」と「1ターン弧長 L=R·θ」を満たすサインカーブを解く。
 * 制約: R = c²/A（apex 半径） → A = c²/R。c を二分法で弧長に合わせる。
 * @returns {{ amp: number, wave: number, arc: number }}
 */
export function solveSineFromRTurn(R, turnAngleDeg) {
  const targetArc = arcLength(R, turnAngleDeg);
  const arcForC = (c) => sineArcLength((c * c) / R, c);
  let lo = 0.01;
  let hi = 1000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (arcForC(mid) < targetArc) lo = mid;
    else hi = mid;
  }
  const c = (lo + hi) / 2;
  const amp = (c * c) / R;
  const wave = 2 * Math.PI * c;
  return { amp, wave, arc: targetArc };
}

export function pathPoint(theta, wavelength, amplitude) {
  const c = wavelength / (2 * Math.PI);
  const x = amplitude * Math.sin(theta);
  const y = c * theta;
  const dx = amplitude * Math.cos(theta);
  const dy = c;
  const ddx = -amplitude * Math.sin(theta);
  const ddy = 0;
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

export function forcesAt(theta, params) {
  const { slope, speed, amp, wave, mass } = params;
  const { x, y, dx, dy, ddx, ddy } = pathPoint(theta, wave, amp);
  const tangent = unit([dx, dy]);
  const kappa = signedCurvature(dx, dy, ddx, ddy);
  const radius = Math.abs(kappa) > 1e-9 ? Math.abs(1 / kappa) : Infinity;

  const fgMag = mass * G * Math.sin(deg2rad(slope));
  const gravity = { x: 0, y: fgMag };

  let centrifugal = { x: 0, y: 0 };
  if (Math.abs(kappa) > 1e-9) {
    const leftNormal = { x: -tangent[1], y: tangent[0] };
    const centerDir = kappa > 0 ? leftNormal : { x: -leftNormal.x, y: -leftNormal.y };
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

/** 連結ターン軌道（t:0→2π = 右ターン + 左ターンの S 字） */
export function samplePath(params, n = 400) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
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
