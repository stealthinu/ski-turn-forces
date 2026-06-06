/**
 * 斜面垂直上から見たスキーターンの力計算（一定半径の円弧ターンモデル）
 *
 * 座標系:
 *   x = 横方向（画面では左右）
 *   y = 降下方向（画面では下向き）
 *
 * 1ターンを「半径 R 一定・中心角 θ の円弧」とみなす。
 *   - 1ターン弧長 L = R·θ
 *   - 進行方向（ヘディング）はフォールライン基準で +θ/2 → 0 → -θ/2 と回る
 *   - 遠心力 Fc = m·v²/R は大きさ一定、向き（外向き）だけが回転する
 */

export const G = 9.81;

/** ターン内の代表フェーズ（frac: 0=切り替え … 0.5=apex … 1=次の切り替え） */
export const PHASES = [
  { id: "transition", frac: 0 },
  { id: "entry", frac: 0.25 },
  { id: "apex", frac: 0.5 },
  { id: "exit", frac: 0.75 },
];

export const PHASE_COLORS = ["#7C3AED", "#EA580C", "#DB2777", "#0891B2"];

/** @typedef {{ slope: number, speed: number, R: number, turnAngle: number, mass: number }} SimParams */

const deg2rad = (d) => (d * Math.PI) / 180;

/** 1ターン弧長 L = R·θ [m] */
export function arcLength(R, turnAngleDeg) {
  return R * deg2rad(turnAngleDeg);
}

/** 1ターンあたりの降下距離 [m]（切り替え→次の切り替えの直線距離） */
export function downhillPerTurn(R, turnAngleDeg) {
  return 2 * R * Math.sin(deg2rad(turnAngleDeg) / 2);
}

/** 横振幅（フォールライン中心から apex までの片振幅） [m] */
export function lateralAmplitude(R, turnAngleDeg) {
  return R * (1 - Math.cos(deg2rad(turnAngleDeg) / 2));
}

/**
 * ターン内フラクション frac における力と位置（右ターン1本の座標系）。
 * 右ターン始点を原点(0,0)、進行とともに +y 方向へ降下。
 */
export function forcesAtFraction(frac, params) {
  const { slope, speed, R, turnAngle, mass } = params;
  const theta = deg2rad(turnAngle);
  const phi = (theta / 2) * (1 - 2 * frac); // ヘディング角（+θ/2 → -θ/2）

  // 進行方向（フォールライン +y からの偏角 φ）
  const tangent = { x: Math.sin(phi), y: Math.cos(phi) };
  // 遠心力の向き（右ターンで外向き）
  const outward = { x: Math.cos(phi), y: -Math.sin(phi) };

  const fgMag = mass * G * Math.sin(deg2rad(slope));
  const fcMag = (mass * speed * speed) / R;
  const gravity = { x: 0, y: fgMag };
  const centrifugal = { x: outward.x * fcMag, y: outward.y * fcMag };
  const resultant = {
    x: gravity.x + centrifugal.x,
    y: gravity.y + centrifugal.y,
  };

  // 右ターン円弧上の位置（始点(0,0)基準）
  const x = R * (Math.cos(phi) - Math.cos(theta / 2));
  const y = R * (Math.sin(theta / 2) - Math.sin(phi));

  return { frac, phi, x, y, tangent, radius: R, gravity, centrifugal, resultant };
}

/**
 * 連結ターンの軌道（右→左→…を交互に）。
 * 切り替え点はフォールライン(x=0)上、apex が左右に振れる S 字。
 */
export function samplePath(params, turns = 2, perTurn = 120) {
  const { R, turnAngle } = params;
  const theta = deg2rad(turnAngle);
  const pts = [];
  let pos = { x: 0, y: 0 };
  let phi = theta / 2; // 最初（右ターン）の始点ヘディング

  for (let t = 0; t < turns; t++) {
    const right = t % 2 === 0;
    for (let i = 0; i <= perTurn; i++) {
      pts.push({ x: pos.x, y: pos.y });
      if (i === perTurn) break;
      const dphi = (theta / perTurn) * (right ? -1 : 1);
      const ds = R * Math.abs(dphi);
      pos = { x: pos.x + Math.sin(phi) * ds, y: pos.y + Math.cos(phi) * ds };
      phi += dphi;
    }
  }
  return pts;
}

export function phaseStates(params) {
  return PHASES.map((phase) => ({
    ...phase,
    state: forcesAtFraction(phase.frac, params),
  }));
}

export function magnitudes(state) {
  const fg = Math.hypot(state.gravity.x, state.gravity.y);
  const fc = Math.hypot(state.centrifugal.x, state.centrifugal.y);
  const fn = Math.hypot(state.resultant.x, state.resultant.y);
  const angle = (Math.atan2(state.resultant.y, state.resultant.x) * 180) / Math.PI;
  return { fg, fc, fn, angle };
}
