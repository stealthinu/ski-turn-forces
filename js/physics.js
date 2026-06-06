/**
 * 斜面垂直上から見たスキーターンの力計算（可変半径カービングモデル）
 *
 * 座標系:
 *   x = 横方向（画面では左右）
 *   y = 降下方向（画面では下向き）
 *
 * モデル:
 *   - 進行方向 φ を斜面下方向（フォールライン）からの偏角とする。
 *   - 半径 r(φ) = R / cos(φ)。apex(φ=0) で最小 R（一番きつい）、
 *     切り替え(|φ|=φmax) に向かって板がフラット化し半径が開く。
 *   - これにより 1ターンの縦（降下）長さ L = ∫cos(φ)·r dφ = 2·R·φmax と単純化。
 *     → 「ターンR」と「ターンの長さ L」を指定すると φmax = L/(2R) で深さが決まる。
 *   - 遠心力 Fc = m·v²/r。半径が場所で変わるので apex で最大。
 *
 * 入力パラメータ（直感的な2つ + 環境）:
 *   R      : ターン半径（apex の最小半径＝円で見たときの半径）[m]
 *   length : 1ターンの縦（降下方向）長さ [m]
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

/** @typedef {{ slope:number, speed:number, R:number, length:number, mass:number }} SimParams */

const deg2rad = (d) => (d * Math.PI) / 180;

/** φmax を 85° 以下に制限（cos→0 での半径発散を防ぐ） */
const MAX_DEPTH_RAD = deg2rad(85);

/** ターンの深さ φmax [rad] = L / (2R)（85° で頭打ち） */
export function depthFromLength(R, length) {
  return Math.min(length / (2 * R), MAX_DEPTH_RAD);
}

/** カービング半径 r(φ) = R / cos(φ) [m] */
function radiusAt(phi, R) {
  return R / Math.cos(phi);
}

/** ヘディング φ における力（右ターン、外向き = 速度の右法線） */
function forcesAtPhi(phi, params) {
  const { slope, speed, R, mass } = params;
  const r = radiusAt(phi, R);

  const tangent = { x: Math.sin(phi), y: Math.cos(phi) };
  const outward = { x: Math.cos(phi), y: -Math.sin(phi) }; // 右ターンの外向き

  const fgMag = mass * G * Math.sin(deg2rad(slope));
  const fcMag = (mass * speed * speed) / r;
  const gravity = { x: 0, y: fgMag };
  const centrifugal = { x: outward.x * fcMag, y: outward.y * fcMag };
  const resultant = { x: gravity.x + centrifugal.x, y: gravity.y + centrifugal.y };

  return { phi, radius: r, tangent, gravity, centrifugal, resultant };
}

/**
 * ターンをヘディングで数値積分し、連結ターン軌道・代表フェーズ・派生量を返す。
 * @param {SimParams} params
 */
export function simulate(params, turns = 2, perTurn = 200) {
  const depthRad = depthFromLength(params.R, params.length);

  const path = [];
  const firstTurn = [];
  let pos = { x: 0, y: 0 };
  let phi = depthRad; // 最初（右ターン）の切り替え地点ヘディング
  let maxX = 0;

  for (let t = 0; t < turns; t++) {
    const right = t % 2 === 0;
    for (let i = 0; i <= perTurn; i++) {
      path.push({ x: pos.x, y: pos.y });
      if (t === 0) {
        firstTurn.push({ phi, x: pos.x, y: pos.y });
        maxX = Math.max(maxX, Math.abs(pos.x));
      }
      if (i === perTurn) break;
      const dphi = ((2 * depthRad) / perTurn) * (right ? -1 : 1);
      const phiMid = phi + dphi / 2;
      const r = radiusAt(phiMid, params.R);
      const ds = r * Math.abs(dphi);
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
        gravity: f.gravity,
        centrifugal: f.centrifugal,
        resultant: f.resultant,
      },
    };
  });

  const downhill = firstTurn.length ? firstTurn[firstTurn.length - 1].y : 0;

  return {
    path,
    phases,
    depthDeg: (depthRad * 180) / Math.PI,
    minRadius: params.R,
    maxRadius: radiusAt(depthRad, params.R),
    downhill,
    width: 2 * maxX,
  };
}

export function magnitudes(state) {
  const fg = Math.hypot(state.gravity.x, state.gravity.y);
  const fc = Math.hypot(state.centrifugal.x, state.centrifugal.y);
  const fn = Math.hypot(state.resultant.x, state.resultant.y);
  const angle = (Math.atan2(state.resultant.y, state.resultant.x) * 180) / Math.PI;
  return { fg, fc, fn, angle };
}
