/** UI strings (ja / en) */

export const STRINGS = {
  ja: {
    pageTitle: "スキーターン 力ベクトル（ライブ）",
    headerTitle: "スキーターン・力ベクトル（斜面上の俯瞰図）",
    headerSub: "スライダーを動かすと計算と図が即座に更新されます",
    params: "パラメータ",
    slope: "斜面角 θ",
    speed: "速度 v",
    radius: "ターンR（曲率半径）",
    radiusHint: "ターン頂点で最小となる曲率半径。大きいほど大きく緩いターン",
    depth: "ターンの深さ φ",
    depthHint: "切り替え時の進行方向とフォールラインのなす角（90° = 真横まで）",
    mass: "質量 m",
    derivedLength: "長さ L ≈",
    derivedWidth: "幅 ≈",
    legendGravity: "斜面方向重力 Fg = mg·sinθ",
    legendCentrifugal: "遠心力 Fc = mv²/R",
    legendResultant: "合力 F = Fg + Fc",
    thPhase: "フェーズ",
    thRadius: "R [m]",
    thFg: "|Fg|",
    thFc: "|Fc|",
    thF: "|F|",
    thAngle: "∠F [°]",
    hint: "静的 HTML/CSS/JS のみで動作します。GitHub Pages などにそのまま公開できます。",
    overviewTitle: "俯瞰図（連結ターン軌道 + 各フェーズの力）",
    phasesTitle: "フェーズ詳細（スキーヤー起点のベクトル）",
    axisX: "横方向 x [m]",
    axisY: "フォールライン y [m]",
    downhill: "フォールライン y",
    velocity: "速度",
    phaseTransition: "切り替え",
    phaseEntry: "ターン導入",
    phaseApex: "頂点",
    phaseExit: "ターン抜け",
    resultantShort: "F_net",
    exportOverviewSvg: "SVG出力",
    exportOverviewSvgLabel: "Overview を SVG で保存",
  },
  en: {
    pageTitle: "Ski Turn Force Vectors (live)",
    headerTitle: "Ski Turn - Force Vectors (top-down on slope)",
    headerSub: "Move sliders to recalculate and redraw instantly",
    params: "Parameters",
    slope: "Slope angle θ",
    speed: "Speed v",
    radius: "Turn radius R (curvature)",
    radiusHint: "Radius of curvature at the apex. Larger = bigger, gentler turn",
    depth: "Turn depth φ",
    depthHint: "Heading vs fall line at transition (90° = fully across)",
    mass: "Mass m",
    derivedLength: "Length L ≈",
    derivedWidth: "Width ≈",
    legendGravity: "Gravity along slope Fg = mg·sinθ",
    legendCentrifugal: "Centrifugal force Fc = mv²/R",
    legendResultant: "Resultant F = Fg + Fc",
    thPhase: "Phase",
    thRadius: "R [m]",
    thFg: "|Fg|",
    thFc: "|Fc|",
    thF: "|F|",
    thAngle: "∠F [°]",
    hint: "Static HTML/CSS/JS only. Works on GitHub Pages as-is.",
    overviewTitle: "Overview (linked-turn path + forces at each phase)",
    phasesTitle: "Phase detail (vectors from skier)",
    axisX: "Lateral x [m]",
    axisY: "Downhill y [m]",
    downhill: "Downhill y",
    velocity: "Velocity",
    phaseTransition: "Transition",
    phaseEntry: "Turn entry",
    phaseApex: "Apex",
    phaseExit: "Turn exit",
    resultantShort: "F_net",
    exportOverviewSvg: "Export SVG",
    exportOverviewSvgLabel: "Save the overview diagram as SVG",
  },
};

const PHASE_IDS = ["transition", "entry", "apex", "exit"];
const PHASE_LABEL_KEYS = {
  transition: "phaseTransition",
  entry: "phaseEntry",
  apex: "phaseApex",
  exit: "phaseExit",
};

let currentLang = localStorage.getItem("ski-turn-lang") || "ja";

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (!STRINGS[lang]) return;
  currentLang = lang;
  localStorage.setItem("ski-turn-lang", lang);
  document.documentElement.lang = lang === "ja" ? "ja" : "en";
}

export function t(key) {
  return STRINGS[currentLang][key] ?? STRINGS.ja[key] ?? key;
}

export function phaseLabel(phaseId) {
  const key = PHASE_LABEL_KEYS[phaseId];
  return key ? t(key) : phaseId;
}

export function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
  document.title = t("pageTitle");
}

export { PHASE_IDS, PHASE_LABEL_KEYS };
