/** UI strings (ja / en) */

export const STRINGS = {
  ja: {
    pageTitle: "スキーターン 力ベクトル（リアルタイム）",
    headerTitle: "スキーターン — 斜面垂直上からの力ベクトル",
    headerSub: "スライダーを動かすと即座に再計算・再描画されます",
    params: "パラメータ",
    slope: "斜面角度 α",
    speed: "速度 v",
    radius: "板のサイドカット半径 R₀",
    radiusHint: "フラット時（切り替え付近）の半径。最大半径",
    edge: "最大エッジ角 ψ",
    edgeHint: "apex での板の傾き。半径は R₀·cosψ までキツくなる",
    depth: "ターンの深さ φ",
    depthHint: "切り替え時の進行方向と斜面下方向のなす角（90°=真横, >90°=切り上がり）",
    mass: "質量 m",
    derivedApex: "apex半径 ≈",
    derivedArc: "1ターン弧長 ≈",
    legendGravity: "斜面方向重力 Fg = mg·sinα",
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
    phasesTitle: "フェーズ別拡大（スキーヤー原点の平行四辺形）",
    axisX: "横方向 x [m]",
    axisY: "降下方向 y [m]",
    downhill: "降下方向 y",
    velocity: "速度",
    phaseTransition: "切り替え",
    phaseEntry: "ターン前半",
    phaseApex: "一番外側",
    phaseExit: "ターン後半",
    resultantShort: "F合",
  },
  en: {
    pageTitle: "Ski Turn Force Vectors (live)",
    headerTitle: "Ski Turn — Force Vectors (top-down on slope)",
    headerSub: "Move sliders to recalculate and redraw instantly",
    params: "Parameters",
    slope: "Slope angle α",
    speed: "Speed v",
    radius: "Ski sidecut radius R₀",
    radiusHint: "Radius when flat (near transition). The largest radius",
    edge: "Max edge angle ψ",
    edgeHint: "Inclination at apex. Radius tightens to R₀·cosψ",
    depth: "Turn depth φ",
    depthHint: "Heading vs fall line at transition (90°=across, >90°=uphill)",
    mass: "Mass m",
    derivedApex: "Apex radius ≈",
    derivedArc: "Arc length per turn ≈",
    legendGravity: "Gravity along slope Fg = mg·sinα",
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
    phasesTitle: "Phase detail (vectors from skier, parallelogram)",
    axisX: "Lateral x [m]",
    axisY: "Downhill y [m]",
    downhill: "Downhill y",
    velocity: "Velocity",
    phaseTransition: "Transition",
    phaseEntry: "Turn entry",
    phaseApex: "Apex",
    phaseExit: "Turn exit",
    resultantShort: "F_net",
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
