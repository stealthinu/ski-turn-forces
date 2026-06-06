/**
 * 斜面垂直上から見たスキーターンの力計算（可変半径カービングモデル）
 *
 * 座標系:
 *   x = 横方向（画面では左右）
 *   y = 降下方向（画面では下向き）
 *
 * モデル:
 *   - 進行方向 φ を斜面下方向（フォールライン）からの偏角とする。
 *   - 半径 r(φ) = R_apex / cos(φ)。apex(φ=0) で最小 R_apex（一番きつい）、
 *     切り替え(|φ|=φmax) に向かって板がフラット化し半径が開く（Fc は切り替えでも非ゼロ）。
 *
 * 入力（人間が触る直感的な2つ）:
 *   R     = ターン弧の曲率半径（= apex の最小半径）[m]。スキーで言う「ターンのR」。
 *           R を大きくすると弧が緩く（ターン全体が大きく）なる。
 *   depth = ターンの深さ φmax [deg]（切り替えでの進行方向と斜面下方向のなす角）。
 *
 * 導出量:
 *   1ターンの縦長 L = 2·R·φmax
 *   ターン横幅 W = -2·R·ln(cos φmax)
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

/** @typedef {{ slope:number, speed:number, R:number, depth:number, mass:number }} SimParams */

const deg2rad = (d) => (d * Math.PI) / 180;

/** φmax を 85° 以下に制限（cos→0 での半径発散を防ぐ） */
const MAX_DEPTH_RAD = deg2rad(85);

/** カービング半径 r(φ) = R_apex / cos(φ) [m] */
function radiusAt(phi, Rapex) {
  return Rapex / Math.cos(phi);
}

/** ヘディング φ における力（右ターン、外向き = 速度の右法線） */
function forcesAtPhi(phi, Rapex, params) {
  const { slope, speed, mass } = params;
  const r = radiusAt(phi, Rapex);

  const tangent = { x: Math.sin(phi), y: Math.cos(phi) };
  const outward = { x: Math.cos(phi), y: -Math.sin(phi) }; // 右ターンの外向き

  const fgMag = mass * G * Math.sin(deg2rad(slope));
  const fcMag = (mass * speed * speed) / r;
  const gravity = { x: 0, y: fgMag };
  const centrifugal = { x: outward.x * fcMag, y: outward.y * fcMag };
  const resultant = { x: gravity.x + centrifugal.x, y: gravity.y + centrifugal.y };

  return { radius: r, tangent, gravity, centrifugal, resultant };
}

/**
 * 連結ターン軌道・代表フェーズ・派生量を返す。
 * @param {SimParams} params
 */
export function simulate(params, turns = 2, perTurn = 200) {
  const Rapex = params.R; // 曲率半径（apex の最小半径）
  const depthRad = Math.min(deg2rad(params.depth), MAX_DEPTH_RAD);

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
      const r = radiusAt(phiMid, Rapex);
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
    const f = forcesAtPhi(targetPhi, Rapex, params);
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

  return {
    path,
    phases,
    depthDeg: (depthRad * 180) / Math.PI,
    apexRadius: Rapex,
    length: 2 * Rapex * depthRad,
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
