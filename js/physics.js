/**
 * 斜面垂直上から見たスキーターンの力計算（エッジ角ベースのカービングモデル）
 *
 * 座標系:
 *   x = 横方向（画面では左右）
 *   y = 降下方向（画面では下向き）
 *
 * モデル:
 *   - 進行方向 φ を斜面下方向（フォールライン）からの偏角とする。
 *   - エッジ角 ψ(φ) は apex(φ=0) で最大、切り替え(φ=±φmax) で 0。
 *   - カービング半径 r = R₀·cos(ψ)。R₀ は板のサイドカット半径（フラット時）。
 *     → apex で最小 R₀·cos(ψmax)、切り替えで R₀（最大）。
 *   - 経路は φ を +φmax → −φmax と動かして数値積分（ds = r·|dφ|）。
 *   - φmax は「ターンの深さ」。90°で真横、>90°で切り上がり（uphill）も表現できる。
 *   - 遠心力 Fc = m·v²/r。半径が場所で変わるので apex で最大。
 */

export const G = 9.81;

/** ターン内の代表フェーズ（frac: 0=切り替え, 0.5=apex, … φ = φmax·(1-2·frac)） */
export const PHASES = [
  { id: "transition", frac: 0 },
  { id: "entry", frac: 0.25 },
  { id: "apex", frac: 0.5 },
  { id: "exit", frac: 0.75 },
];

export const PHASE_COLORS = ["#7C3AED", "#EA580C", "#DB2777", "#0891B2"];

/** @typedef {{ slope:number, speed:number, R0:number, edgeMax:number, depth:number, mass:number }} SimParams */

const deg2rad = (d) => (d * Math.PI) / 180;

/** エッジ角 ψ(φ)：apex(φ=0)で最大、切り替え(|φ|=φmax)で 0 [rad] */
function edgeAngleAt(phi, edgeMaxRad, depthRad) {
  if (depthRad < 1e-6) return edgeMaxRad;
  return edgeMaxRad * Math.cos((Math.PI * phi) / (2 * depthRad));
}

/** カービング半径 r(φ) = R₀·cos(ψ) [m] */
function radiusAt(phi, R0, edgeMaxRad, depthRad) {
  return R0 * Math.cos(edgeAngleAt(phi, edgeMaxRad, depthRad));
}

/** apex（最小）半径 = R₀·cos(ψmax) */
export function apexRadius(R0, edgeMaxDeg) {
  return R0 * Math.cos(deg2rad(edgeMaxDeg));
}

/** ヘディング φ における力（右ターン、外向き = 速度の右法線） */
function forcesAtPhi(phi, params) {
  const { slope, speed, R0, edgeMax, depth, mass } = params;
  const edgeRad = deg2rad(edgeMax);
  const depthRad = deg2rad(depth);
  const r = radiusAt(phi, R0, edgeRad, depthRad);

  const tangent = { x: Math.sin(phi), y: Math.cos(phi) };
  const outward = { x: Math.cos(phi), y: -Math.sin(phi) }; // 右ターンの外向き

  const fgMag = mass * G * Math.sin(deg2rad(slope));
  const fcMag = (mass * speed * speed) / r;
  const gravity = { x: 0, y: fgMag };
  const centrifugal = { x: outward.x * fcMag, y: outward.y * fcMag };
  const resultant = { x: gravity.x + centrifugal.x, y: gravity.y + centrifugal.y };

  return { phi, radius: r, edge: edgeAngleAt(phi, edgeRad, depthRad), tangent, gravity, centrifugal, resultant };
}

/**
 * ターンをヘディングで数値積分し、連結ターン軌道・代表フェーズ・派生量を返す。
 * @param {SimParams} params
 */
export function simulate(params, turns = 2, perTurn = 200) {
  const depthRad = deg2rad(params.depth);
  const edgeRad = deg2rad(params.edgeMax);

  const path = [];
  const firstTurn = [];
  let pos = { x: 0, y: 0 };
  let phi = depthRad; // 最初（右ターン）の切り替え地点ヘディング
  let arc = 0;

  for (let t = 0; t < turns; t++) {
    const right = t % 2 === 0;
    for (let i = 0; i <= perTurn; i++) {
      path.push({ x: pos.x, y: pos.y });
      if (t === 0) firstTurn.push({ phi, x: pos.x, y: pos.y });
      if (i === perTurn) break;
      const dphi = ((2 * depthRad) / perTurn) * (right ? -1 : 1);
      const phiMid = phi + dphi / 2;
      const r = radiusAt(phiMid, params.R0, edgeRad, depthRad);
      const ds = r * Math.abs(dphi);
      if (t === 0) arc += ds;
      pos = { x: pos.x + Math.sin(phiMid) * ds, y: pos.y + Math.cos(phiMid) * ds };
      phi += dphi;
    }
  }

  const phases = PHASES.map((p) => {
    const targetPhi = depthRad * (1 - 2 * p.frac);
    let best = firstTurn[0];
    for (const s of firstTurn) {
      if (Math.abs(s.phi - targetPhi) < Math.abs(best.phi - targetPhi)) best = s;
    }
    const f = forcesAtPhi(targetPhi, params);
    return {
      ...p,
      state: {
        x: best.x,
        y: best.y,
        tangent: f.tangent,
        radius: f.radius,
        edge: f.edge,
        gravity: f.gravity,
        centrifugal: f.centrifugal,
        resultant: f.resultant,
      },
    };
  });

  return {
    path,
    phases,
    apexRadius: apexRadius(params.R0, params.edgeMax),
    arc,
    maxHeading: params.depth,
  };
}

export function magnitudes(state) {
  const fg = Math.hypot(state.gravity.x, state.gravity.y);
  const fc = Math.hypot(state.centrifugal.x, state.centrifugal.y);
  const fn = Math.hypot(state.resultant.x, state.resultant.y);
  const angle = (Math.atan2(state.resultant.y, state.resultant.x) * 180) / Math.PI;
  return { fg, fc, fn, angle };
}
