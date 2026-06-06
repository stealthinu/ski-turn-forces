/** Canvas 描画ユーティリティ */

const COLORS = {
  gravity: "#2563EB",
  centrifugal: "#DC2626",
  resultant: "#059669",
  guide: "#94A3B8",
  path: "#64748B",
  grid: "#F1F5F9",
  axis: "#CBD5E1",
  text: "#475569",
  muted: "#64748B",
};

/** この λ[m] が描画領域の高さいっぱいになる基準（λ が小さいほど画面でも短く表示） */
const REF_TURN_LENGTH = 80;

export function drawArrow(ctx, x1, y1, x2, y2, color, width = 2) {
  const head = Math.max(7, width * 3.5);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(angle - 0.35), y2 - head * Math.sin(angle - 0.35));
  ctx.lineTo(x2 - head * Math.cos(angle + 0.35), y2 - head * Math.sin(angle + 0.35));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * スキーヤー位置を共通原点とする平行四辺形法
 * Fg, Fc ともスキーヤーから出発し、合力でひし形を完成
 */
export function drawForceParallelogram(ctx, ox, oy, fg, fc, fnet, scale) {
  const fgTip = [ox + fg.x * scale, oy + fg.y * scale];
  const fcTip = [ox + fc.x * scale, oy + fc.y * scale];
  const netTip = [ox + fnet.x * scale, oy + fnet.y * scale];

  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = COLORS.guide;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(fgTip[0], fgTip[1]);
  ctx.lineTo(netTip[0], netTip[1]);
  ctx.lineTo(fcTip[0], fcTip[1]);
  ctx.stroke();
  ctx.restore();

  drawArrow(ctx, ox, oy, fgTip[0], fgTip[1], COLORS.gravity, 2.2);
  drawArrow(ctx, ox, oy, fcTip[0], fcTip[1], COLORS.centrifugal, 2.2);
  drawArrow(ctx, ox, oy, netTip[0], netTip[1], COLORS.resultant, 3);
}

/** ワールド→画面の変換（汎用・等倍フィット） */
export function makeTransform(canvas, bounds, padding = 48) {
  const { minX, maxX, minY, maxY } = bounds;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * devicePixelRatio;
  canvas.height = h * devicePixelRatio;

  const plotW = w - padding * 2;
  const plotH = h - padding * 2;
  const dataW = maxX - minX || 1;
  const dataH = maxY - minY || 1;
  const sx = plotW / dataW;
  const sy = plotH / dataH;
  const s = Math.min(sx, sy);

  const cx = padding + (plotW - dataW * s) / 2;
  const cy = padding + (plotH - dataH * s) / 2;

  const worldToScreen = (x, y) => [cx + (x - minX) * s, cy + (y - minY) * s];

  return { ctx: canvas.getContext("2d"), w, h, s, worldToScreen, padding, minX, maxX, minY, maxY };
}

/**
 * 俯瞰図用スケール。
 * λ=REF_TURN_LENGTH が高さいっぱいになる固定 px/m を基準にし、
 * λ が小さければ画面上でも短く（上端そろえで）表示する。
 * データがはみ出す場合のみ縮小してフィットさせる。
 */
export function makeOverviewTransform(canvas, bounds, padding = 48) {
  const { minX, maxX, minY, maxY } = bounds;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * devicePixelRatio;
  canvas.height = h * devicePixelRatio;

  const plotW = w - padding * 2;
  const plotH = h - padding * 2;
  const dataW = maxX - minX || 1;
  const dataH = maxY - minY || 1;

  let s = plotH / REF_TURN_LENGTH; // 固定 px/m
  s = Math.min(s, plotH / dataH, plotW / dataW); // はみ出す場合のみ縮小

  const cx = padding + (plotW - dataW * s) / 2; // 横は中央
  const cy = padding; // 縦は上端そろえ → λ が短いと下に余白が残る

  const worldToScreen = (x, y) => [cx + (x - minX) * s, cy + (y - minY) * s];

  return { ctx: canvas.getContext("2d"), w, h, s, worldToScreen, padding };
}

export function clearCanvas(ctx, w, h) {
  ctx.save();
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * @param {import('./i18n.js')} i18n
 */
export function renderOverview(canvas, params, phases, path, i18n) {
  const maxDown = Math.max(...path.map((p) => p.y));
  const lateral = params.amp * 1.35;
  const t = makeOverviewTransform(
    canvas,
    { minX: -lateral, maxX: lateral, minY: -2, maxY: maxDown + 3 },
  );
  const { ctx, w, h, worldToScreen } = t;

  clearCanvas(ctx, w, h);
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const y = 48 + ((h - 96) * i) / 8;
    ctx.beginPath();
    ctx.moveTo(48, y);
    ctx.lineTo(w - 24, y);
    ctx.stroke();
  }

  const [cx0, cy0] = worldToScreen(0, 0);
  const [, cy1] = worldToScreen(0, maxDown * 0.35);
  ctx.strokeStyle = COLORS.axis;
  ctx.beginPath();
  ctx.moveTo(cx0, cy0);
  ctx.lineTo(cx0, cy1);
  ctx.stroke();
  drawArrow(ctx, cx0, cy0, cx0, cy0 + 40, COLORS.text, 1.5);
  ctx.fillStyle = COLORS.muted;
  ctx.font = "11px 'Segoe UI', 'Yu Gothic UI', Meiryo, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(i18n.t("downhill"), cx0 + 6, cy0 + 52);

  ctx.strokeStyle = COLORS.path;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  path.forEach((p, i) => {
    const [sx, sy] = worldToScreen(p.x, p.y);
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.stroke();

  let maxF = 1;
  phases.forEach(({ state }) => {
    const fg = Math.hypot(state.gravity.x, state.gravity.y);
    const fc = Math.hypot(state.centrifugal.x, state.centrifugal.y);
    maxF = Math.max(maxF, fg + fc);
  });
  const forceScale = 42 / maxF;

  phases.forEach(({ label, state, color }) => {
    const [px, py] = worldToScreen(state.x, state.y);

    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = "bold 12px 'Segoe UI', 'Yu Gothic UI', Meiryo, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, px, py - 14);

    drawForceParallelogram(ctx, px, py, state.gravity, state.centrifugal, state.resultant, forceScale);

    const fg = Math.hypot(state.gravity.x, state.gravity.y);
    const fc = Math.hypot(state.centrifugal.x, state.centrifugal.y);
    const fn = Math.hypot(state.resultant.x, state.resultant.y);
    const ang = (Math.atan2(state.resultant.y, state.resultant.x) * 180) / Math.PI;
    const rLabel = Number.isFinite(state.radius) ? `R≈${state.radius.toFixed(1)}m` : "R=∞";
    const lines = [
      rLabel,
      `|Fg|=${fg.toFixed(0)}N  |Fc|=${fc.toFixed(0)}N`,
      `|F|=${fn.toFixed(0)}N  ∠${ang.toFixed(0)}°`,
    ];
    const bx = px + 12;
    const by = py + 16;
    ctx.textAlign = "left";
    ctx.font = "10px 'Segoe UI', 'Yu Gothic UI', Meiryo, sans-serif";
    const bw = 130;
    const bh = 42;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    roundRect(ctx, bx, by, bw, bh, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#334155";
    lines.forEach((line, li) => ctx.fillText(line, bx + 6, by + 12 + li * 12));
  });

  ctx.fillStyle = COLORS.muted;
  ctx.font = "12px 'Segoe UI', 'Yu Gothic UI', Meiryo, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(i18n.t("axisX"), w / 2, h - 12);
  ctx.save();
  ctx.translate(16, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(i18n.t("axisY"), 0, 0);
  ctx.restore();
}

export function renderPhasePanel(canvas, phase, i18n) {
  const { label, state, color } = phase;
  const margin = 3.5;
  const t = makeTransform(canvas, {
    minX: state.x - margin,
    maxX: state.x + margin,
    minY: state.y - margin,
    maxY: state.y + margin,
  }, 28);
  const { ctx, w, h, worldToScreen } = t;

  clearCanvas(ctx, w, h);
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  ctx.strokeStyle = COLORS.grid;
  for (let i = 0; i <= 4; i++) {
    const y = 28 + ((h - 56) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(28, y);
    ctx.lineTo(w - 12, y);
    ctx.stroke();
  }

  const [px, py] = worldToScreen(state.x, state.y);
  ctx.beginPath();
  ctx.arc(px, py, 6, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  const fg = Math.hypot(state.gravity.x, state.gravity.y);
  const fc = Math.hypot(state.centrifugal.x, state.centrifugal.y);
  const maxF = Math.max(fg + fc, 1);
  const forceScale = (Math.min(w, h) * 0.22) / maxF;

  drawForceParallelogram(ctx, px, py, state.gravity, state.centrifugal, state.resultant, forceScale);

  const tv = 1.8;
  const [vx, vy] = worldToScreen(
    state.x + state.tangent.x * tv,
    state.y + state.tangent.y * tv,
  );
  ctx.setLineDash([5, 4]);
  drawArrow(ctx, px, py, vx, vy, COLORS.text, 1.6);
  ctx.setLineDash([]);

  ctx.fillStyle = color;
  ctx.font = "bold 13px 'Segoe UI', 'Yu Gothic UI', Meiryo, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(label, 10, 20);

  ctx.fillStyle = "#334155";
  ctx.font = "10px 'Segoe UI', 'Yu Gothic UI', Meiryo, sans-serif";
  const fn = Math.hypot(state.resultant.x, state.resultant.y);
  const rTxt = Number.isFinite(state.radius) ? state.radius.toFixed(1) : "∞";
  const fNetLabel = i18n.t("resultantShort");
  const info = [
    `R ≈ ${rTxt} m`,
    `|Fg| = ${fg.toFixed(0)} N`,
    `|Fc| = ${fc.toFixed(0)} N`,
    `|${fNetLabel}| = ${fn.toFixed(0)} N`,
  ];
  info.forEach((line, i) => ctx.fillText(line, 10, h - 52 + i * 13));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

export { COLORS };
