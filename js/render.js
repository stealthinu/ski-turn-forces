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

const REF_DOWNHILL = 90;
const REF_WIDTH = 70;
const OVERVIEW_ZOOM = 2.5;

function formatNum(value) {
  return Number(value).toFixed(2).replace(/\.?0+$/, "");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function arrowHeadPoints(x1, y1, x2, y2, width) {
  const head = Math.max(7, width * 3.5);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  return [
    [x2, y2],
    [x2 - head * Math.cos(angle - 0.35), y2 - head * Math.sin(angle - 0.35)],
    [x2 - head * Math.cos(angle + 0.35), y2 - head * Math.sin(angle + 0.35)],
  ];
}

function getForceTips(ox, oy, fg, fc, fnet, scale) {
  return {
    fgTip: [ox + fg.x * scale, oy + fg.y * scale],
    fcTip: [ox + fc.x * scale, oy + fc.y * scale],
    netTip: [ox + fnet.x * scale, oy + fnet.y * scale],
  };
}

function buildOverviewMetrics(width, height, path, phases, padding = 48) {
  const plotW = width - padding * 2;
  const plotH = height - padding * 2;
  const s = OVERVIEW_ZOOM * Math.min(plotH / REF_DOWNHILL, plotW / REF_WIDTH);
  const cx = width / 2;
  const cy = padding;
  const worldToScreen = (x, y) => [cx + x * s, cy + y * s];
  const maxDown = Math.max(...path.map((p) => p.y), 0);

  let maxF = 1;
  phases.forEach(({ state }) => {
    const fg = Math.hypot(state.gravity.x, state.gravity.y);
    const fc = Math.hypot(state.centrifugal.x, state.centrifugal.y);
    maxF = Math.max(maxF, fg + fc);
  });

  return {
    width,
    height,
    padding,
    s,
    maxDown,
    forceScale: (42 * OVERVIEW_ZOOM) / maxF,
    worldToScreen,
  };
}

function drawGrid(ctx, width, height) {
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const y = 48 + ((height - 96) * i) / 8;
    ctx.beginPath();
    ctx.moveTo(48, y);
    ctx.lineTo(width - 24, y);
    ctx.stroke();
  }
}

function drawOverviewAxis(ctx, width, height, metrics, i18n) {
  const { worldToScreen, maxDown } = metrics;
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

  ctx.font = "12px 'Segoe UI', 'Yu Gothic UI', Meiryo, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(i18n.t("axisX"), width / 2, height - 12);
  ctx.save();
  ctx.translate(16, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(i18n.t("axisY"), 0, 0);
  ctx.restore();
}

function drawOverviewPath(ctx, path, worldToScreen) {
  ctx.strokeStyle = COLORS.path;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  path.forEach((point, index) => {
    const [sx, sy] = worldToScreen(point.x, point.y);
    if (index === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.stroke();
}

function drawOverviewPhase(ctx, phase, worldToScreen, forceScale) {
  const { label, state, color } = phase;
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
}

export function drawArrow(ctx, x1, y1, x2, y2, color, width = 2) {
  const headPoints = arrowHeadPoints(x1, y1, x2, y2, width);
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
  ctx.moveTo(headPoints[0][0], headPoints[0][1]);
  ctx.lineTo(headPoints[1][0], headPoints[1][1]);
  ctx.lineTo(headPoints[2][0], headPoints[2][1]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawForceParallelogram(ctx, ox, oy, fg, fc, fnet, scale) {
  const { fgTip, fcTip, netTip } = getForceTips(ox, oy, fg, fc, fnet, scale);

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

export function makeOverviewTransform(canvas, padding = 48) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * devicePixelRatio;
  canvas.height = h * devicePixelRatio;

  const metrics = buildOverviewMetrics(w, h, [{ x: 0, y: 0 }], [], padding);
  return { ctx: canvas.getContext("2d"), w, h, s: metrics.s, worldToScreen: metrics.worldToScreen, padding };
}

export function clearCanvas(ctx, w, h) {
  ctx.save();
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function renderOverview(canvas, params, phases, path, i18n) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * devicePixelRatio;
  canvas.height = h * devicePixelRatio;

  const ctx = canvas.getContext("2d");
  const metrics = buildOverviewMetrics(w, h, path, phases);

  clearCanvas(ctx, w, h);
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  drawGrid(ctx, w, h);
  drawOverviewAxis(ctx, w, h, metrics, i18n);
  drawOverviewPath(ctx, path, metrics.worldToScreen);
  phases.forEach((phase) => drawOverviewPhase(ctx, phase, metrics.worldToScreen, metrics.forceScale));
}

function svgText(x, y, text, { fill, fontSize, anchor = "middle", weight = 400 } = {}) {
  const attrs = [
    `x="${formatNum(x)}"`,
    `y="${formatNum(y)}"`,
    `fill="${fill}"`,
    `font-size="${fontSize}"`,
    `font-family="'Segoe UI', 'Yu Gothic UI', Meiryo, sans-serif"`,
    `font-weight="${weight}"`,
    `text-anchor="${anchor}"`,
  ].join(" ");
  return `<text ${attrs}>${escapeXml(text)}</text>`;
}

function svgArrow(x1, y1, x2, y2, color, width, markerId) {
  return `<line x1="${formatNum(x1)}" y1="${formatNum(y1)}" x2="${formatNum(x2)}" y2="${formatNum(y2)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" marker-end="url(#arrowhead-${markerId})" />`;
}

export function renderOverviewSvg({ width, height, phases, path, i18n }) {
  const metrics = buildOverviewMetrics(width, height, path, phases);
  const { worldToScreen, maxDown, forceScale } = metrics;
  const ariaLabel = escapeXml(i18n.t("overviewTitle") || "Overview");
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${ariaLabel}">`,
    "<defs>",
  ];

  [1, 2, 3].forEach((id) => {
    parts.push(
      `<marker id="arrowhead-${id}" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto" markerUnits="userSpaceOnUse">`,
      '<path d="M 0 0 L 12 6 L 0 12 z" fill="context-stroke" />',
      "</marker>",
    );
  });
  parts.push("</defs>");
  parts.push(`<rect width="${width}" height="${height}" fill="#FFFFFF" />`);

  for (let i = 0; i <= 8; i++) {
    const y = 48 + ((height - 96) * i) / 8;
    parts.push(
      `<line x1="48" y1="${formatNum(y)}" x2="${formatNum(width - 24)}" y2="${formatNum(y)}" stroke="${COLORS.grid}" stroke-width="1" />`,
    );
  }

  const [cx0, cy0] = worldToScreen(0, 0);
  const [, cy1] = worldToScreen(0, maxDown * 0.35);
  parts.push(
    `<line x1="${formatNum(cx0)}" y1="${formatNum(cy0)}" x2="${formatNum(cx0)}" y2="${formatNum(cy1)}" stroke="${COLORS.axis}" stroke-width="1" />`,
    svgArrow(cx0, cy0, cx0, cy0 + 40, COLORS.text, 1.5, 1),
    svgText(cx0 + 6, cy0 + 52, i18n.t("downhill"), {
      fill: COLORS.muted,
      fontSize: 11,
      anchor: "start",
    }),
  );

  const pathPoints = path
    .map((point) => {
      const [sx, sy] = worldToScreen(point.x, point.y);
      return `${formatNum(sx)},${formatNum(sy)}`;
    })
    .join(" ");
  parts.push(
    `<polyline points="${pathPoints}" fill="none" stroke="${COLORS.path}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />`,
  );

  phases.forEach(({ label, state, color }) => {
    const [px, py] = worldToScreen(state.x, state.y);
    const { fgTip, fcTip, netTip } = getForceTips(
      px,
      py,
      state.gravity,
      state.centrifugal,
      state.resultant,
      forceScale,
    );

    parts.push(
      `<circle cx="${formatNum(px)}" cy="${formatNum(py)}" r="7" fill="${color}" stroke="#fff" stroke-width="2" />`,
      svgText(px, py - 14, label, { fill: color, fontSize: 12, weight: 700 }),
      `<polyline points="${formatNum(fgTip[0])},${formatNum(fgTip[1])} ${formatNum(netTip[0])},${formatNum(netTip[1])} ${formatNum(fcTip[0])},${formatNum(fcTip[1])}" fill="none" stroke="${COLORS.guide}" stroke-width="1" stroke-dasharray="4 4" />`,
      svgArrow(px, py, fgTip[0], fgTip[1], COLORS.gravity, 2.2, 2),
      svgArrow(px, py, fcTip[0], fcTip[1], COLORS.centrifugal, 2.2, 2),
      svgArrow(px, py, netTip[0], netTip[1], COLORS.resultant, 3, 3),
    );
  });

  parts.push(
    svgText(width / 2, height - 12, i18n.t("axisX"), { fill: COLORS.muted, fontSize: 12 }),
    `<g transform="translate(16 ${formatNum(height / 2)}) rotate(-90)">`,
    svgText(0, 0, i18n.t("axisY"), { fill: COLORS.muted, fontSize: 12 }),
    "</g>",
    "</svg>",
  );

  return parts.join("");
}

export function renderPhasePanel(canvas, phase, i18n) {
  const { label, state, color } = phase;
  const margin = 3.5;
  const t = makeTransform(
    canvas,
    {
      minX: state.x - margin,
      maxX: state.x + margin,
      minY: state.y - margin,
      maxY: state.y + margin,
    },
    28,
  );
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
  const [vx, vy] = worldToScreen(state.x + state.tangent.x * tv, state.y + state.tangent.y * tv);
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
  const rTxt = Number.isFinite(state.radius) ? state.radius.toFixed(1) : "--";
  const fNetLabel = i18n.t("resultantShort");
  const info = [
    `R = ${rTxt} m`,
    `|Fg| = ${fg.toFixed(0)} N`,
    `|Fc| = ${fc.toFixed(0)} N`,
    `|${fNetLabel}| = ${fn.toFixed(0)} N`,
  ];
  info.forEach((line, index) => ctx.fillText(line, 10, h - 52 + index * 13));
}

export { COLORS };
