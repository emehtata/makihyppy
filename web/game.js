"use strict";

// Browser port of the SVI/MSX BASIC ski-jump game "Makihyppy"
// (see ../data/makihyppy.bas for the extracted source listing).
//
// This first pass ports the single-jumper practice loop only:
// approach run + takeoff timing, in-flight balance, landing/crash
// detection, distance calculation, and the 5-judge style scoring.
// The full tournament/menu flow (lines 680-1210 in the original)
// has not been ported yet.
//
// Comments reference the original BASIC line numbers so this file
// can be cross-checked against data/makihyppy.bas.

const SCALE = 3;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const statusEl = document.getElementById("status");
const bestEl = document.getElementById("best");
const angleEl = document.getElementById("angle");
const stanceEl = document.getElementById("stanceValue");
const resultEl = document.getElementById("lastResult");
const judgeScoresEl = document.getElementById("judgeScores");
const hintEl = document.getElementById("hint");
const versionEl = document.getElementById("version");
const practiceButton = document.getElementById("practiceButton");
const competitionButton = document.getElementById("competitionButton");
const competitionSetup = document.getElementById("competitionSetup");
const competitorCountEl = document.getElementById("competitorCount");
const roundCountEl = document.getElementById("roundCount");
const competitorInputsEl = document.getElementById("competitorInputs");
const competitionPanel = document.getElementById("competitionPanel");
const competitionMessageEl = document.getElementById("competitionMessage");
const scoreboardBody = document.getElementById("scoreboardBody");
const nextRoundButton = document.getElementById("nextRoundButton");
const sourceNoteEl = document.getElementById("sourceNote");
const jumpButton = document.getElementById("jumpButton");
const raiseButton = document.getElementById("raiseButton");
const lowerButton = document.getElementById("lowerButton");

const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
const language = browserLanguages.some((locale) => locale.toLowerCase().startsWith("fi")) ? "fi" : "en";
const TRANSLATIONS = {
  en: {
    title: "Mäkihyppy — browser port",
    documentTitle: "Mäkihyppy",
    sourceNote: "Ported from the original Spectravideo/MSX BASIC cassette listing (data/makihyppy.bas). Practice and competition modes include the original jump timing, in-flight balance, distance, and 5-judge style scoring.",
    credit: "Original game by Anssi Pulkkinen, published in Mikrobitti 1/1985.",
    gameControls: "Game controls", raiseSkis: "Raise skis", lowerSkis: "Lower skis", jump: "Jump",
    bestDistance: "Best distance", skiPitch: "Ski pitch", stance: "Stance", gameMode: "Game mode",
    practice: "Practice", competition: "Competition", competitors: "Competitors", rounds: "Rounds",
    startCompetition: "Start competition", competitionStandings: "Competition standings", rank: "Rank",
    jumper: "Jumper", country: "Country", lastJump: "Last jump", total: "Total", nextRound: "Next round",
    controls: "Controls",
    helpJump: "Space - start the approach run, then press again at the right moment to take off.",
    helpStance: "A / D - raise or lower the skis while airborne. This changes the original flight stance, including its risk and scoring effects.",
    helpLanding: "Land in stance 1 or 2 for a clean landing. Stance 3 or 4 falls; pushing beyond either end also falls.",
    ready: "ready", safe: "safe", fall: "fall",
    hintComplete: "Hint: competition complete. Review the final standings.",
    hintNextRound: "Hint: review the standings, then start the next round.",
    hintPlayer: "{name}: press SPACE to start your jump.", hintReady: "Hint: press SPACE to begin the approach.",
    hintWait: "Hint: wait until the skier reaches the end of the ramp, then press SPACE.",
    hintTakeoff: "Hint: press SPACE now for the best takeoff.", hintMissed: "Hint: takeoff window missed; ride out this attempt.",
    hintLower: "Hint: press D for stance {stance}.", hintRaise: "Hint: press A for stance {stance}.",
    hintGlide: "Hint: hold stance 3 for the most efficient glide.", hintLanding: "Hint: hold stance 2 for a safe landing.",
    hintClean: "Hint: clean landing. Keep the skis steady.", hintRunout: "Hint: hold SPACE to lift the skier during the run-out.",
    hintFall: "Hint: balance was lost; prepare for the next attempt.",
    approachStatus: "Approach run: press SPACE at the right moment to take off.", flightStatus: "In the air: use A/D to adjust ski angle.",
    cleanLanding: "Clean landing...", lostBalance: "Lost balance...", runoutStatus: "Run-out: use A/D, hold SPACE to lift the skier.",
    judges: "Judges: {marks}. Discarded high {high}, low {low}. Style {style} + distance bonus {bonus}.",
    competitorName: "Competitor {number} name", competitorCountry: "Competitor {number} country", player: "Player", jumperName: "Jumper {number}",
    roundPrepare: "Round {round}: {name}, prepare to jump.", roundComplete: "Round {round} complete. Standings determine reverse jump order.",
    roundCompleteStatus: "Round complete. Select Next round when ready.", competitionComplete: "Competition complete.",
    competitionCompleteStatus: "Competition complete. Select Practice or start a new competition.", roundOf: "Round {round} of {rounds}",
    result: "Distance: {distance} m{fall} - Style points: {points}", fallResult: " (fall)", readyStatus: "Press SPACE to start the approach run.",
    Finland: "Finland", Austria: "Austria", Norway: "Norway", DDR: "DDR", Canada: "Canada",
  },
  fi: {
    title: "Mäkihyppy — selainversio",
    documentTitle: "Mäkihyppy",
    sourceNote: "Siirretty alkuperäisestä Spectravideo/MSX BASIC -kasettilistauksesta (data/makihyppy.bas). Harjoitus- ja kilpailutilat sisältävät alkuperäisen ponnistuksen ajoituksen, ilmatasapainon, pituuden ja viiden tuomarin tyylipisteet.",
    credit: "Alkuperäinen peli: Anssi Pulkkinen, Mikrobitti 1/1985.",
    gameControls: "Pelin ohjaimet", raiseSkis: "Nosta sukset", lowerSkis: "Laske sukset", jump: "Hyppää",
    bestDistance: "Paras pituus", skiPitch: "Suksien kulma", stance: "Asento", gameMode: "Pelitila",
    practice: "Harjoitus", competition: "Kilpailu", competitors: "Kilpailijoita", rounds: "Kierroksia",
    startCompetition: "Aloita kilpailu", competitionStandings: "Kilpailun tulokset", rank: "Sija",
    jumper: "Hyppääjä", country: "Maa", lastJump: "Viime hyppy", total: "Yhteensä", nextRound: "Seuraava kierros",
    controls: "Ohjaimet",
    helpJump: "Välilyönti - aloita vauhti ja paina uudelleen oikealla hetkellä ponnistaaksesi.",
    helpStance: "A / D - nosta tai laske suksia ilmassa. Asento vaikuttaa lentoon, riskiin ja pisteisiin.",
    helpLanding: "Laskeudu asennossa 1 tai 2. Asennot 3 ja 4 aiheuttavat kaatumisen; rajan ylitys kaataa myös.",
    ready: "valmis", safe: "turvallinen", fall: "kaatuminen",
    hintComplete: "Vihje: kilpailu on päättynyt. Tarkista lopputulokset.",
    hintNextRound: "Vihje: tarkista tulokset ja aloita sitten seuraava kierros.",
    hintPlayer: "{name}: aloita hyppy painamalla välilyöntiä.", hintReady: "Vihje: aloita vauhti painamalla välilyöntiä.",
    hintWait: "Vihje: odota, että hyppääjä saavuttaa ponnistuslavan lopun, ja paina välilyöntiä.",
    hintTakeoff: "Vihje: ponnista nyt painamalla välilyöntiä.", hintMissed: "Vihje: ponnistusikkuna meni ohi; laskeudu tällä yrityksellä.",
    hintLower: "Vihje: paina D asentoon {stance}.", hintRaise: "Vihje: paina A asentoon {stance}.",
    hintGlide: "Vihje: pidä asento 3 tehokkainta liitoa varten.", hintLanding: "Vihje: pidä asento 2 turvallista alastuloa varten.",
    hintClean: "Vihje: puhdas alastulo. Pidä sukset vakaina.", hintRunout: "Vihje: pidä välilyöntiä painettuna nostaaksesi hyppääjää loppuliu'ussa.",
    hintFall: "Vihje: tasapaino petti; valmistaudu seuraavaan yritykseen.",
    approachStatus: "Vauhti: ponnista painamalla välilyöntiä oikealla hetkellä.", flightStatus: "Ilmassa: säädä suksien kulmaa A/D-näppäimillä.",
    cleanLanding: "Puhdas alastulo...", lostBalance: "Tasapaino petti...", runoutStatus: "Loppuliuku: käytä A/D-näppäimiä, pidä välilyöntiä painettuna nostaaksesi hyppääjää.",
    judges: "Tuomarit: {marks}. Hylätty korkein {high}, matalin {low}. Tyyli {style} + pituuslisä {bonus}.",
    competitorName: "Kilpailijan {number} nimi", competitorCountry: "Kilpailijan {number} maa", player: "Pelaaja", jumperName: "Hyppääjä {number}",
    roundPrepare: "Kierros {round}: {name}, valmistaudu hyppyyn.", roundComplete: "Kierros {round} päättyi. Tulokset määräävät käänteisen hyppyjärjestyksen.",
    roundCompleteStatus: "Kierros päättyi. Valitse Seuraava kierros, kun olet valmis.", competitionComplete: "Kilpailu päättyi.",
    competitionCompleteStatus: "Kilpailu päättyi. Valitse Harjoitus tai aloita uusi kilpailu.", roundOf: "Kierros {round}/{rounds}",
    result: "Pituus: {distance} m{fall} - Tyylipisteet: {points}", fallResult: " (kaatuminen)", readyStatus: "Aloita vauhti painamalla välilyöntiä.",
    Finland: "Suomi", Austria: "Itävalta", Norway: "Norja", DDR: "DDR", Canada: "Kanada",
  },
};

function t(key, values = {}) {
  return TRANSLATIONS[language][key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? `{${name}}`);
}

function translatePage() {
  document.documentElement.lang = language;
  document.title = t("documentTitle");
  sourceNoteEl.textContent = t("sourceNote");
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
}

translatePage();

// ---------------------------------------------------------------------------
// Data transcribed verbatim from the BASIC DATA statements (lines 1220-1290).
// Splitting/parsing is done here in JS instead of by hand, to avoid manual
// transcription counting errors.
// ---------------------------------------------------------------------------

// DATA 1220 (52 numbers): first 27 feed M(84..110), remaining 25 feed P(26..50)-16.
const DATA_1220 =
  ("91,91,91,91,91,92,92,93,93,94,94,95,95,96,97,98,98,99,100,101,102,103,104,105,106,107,108," +
    "81,81,81,81,81,82,82,82,83,83,84,84,84,85,85,85,86,87,88,89,90,90,91,92,93")
    .split(",")
    .map(Number);

// DATA 1230-1290: sprite pattern bytes (13 sprites x 32 bytes each).
const SPRITE_DATA_RAW = [
  "0,0,0,0,0,0,1,3,63,124,240,248,12,24,112,192,0,0,0,0,0,0,128,128,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,3,227,63,3,0,0,0,3,7,6,24,56,124,122,233,132,0,0,0,225,30,0,0,0,0,0,0,0,0,0,1,1,1,3,6,12,255,0,0,0,3,7,6,56,120,240,224,192,128,0,0,1,254,0",
  "0,0,0,0,0,0,0,1,1,1,3,6,15,56,224,0,0,3,7,6,56,120,240,224,193,129,30,240,128,0,0,16,72,36,31,7,14,28,24,9,10,12,8,16,32,64,128,96,224,200,8,16,32",
  "64,128,0,0,0,0,0,0,0,0,0,3,0,0,7,0,0,0,192,49,15,7,240,0,0,0,3,135,102,56,248,112,112,96,192,128,1,254,192,48,13,2,0,0,0,24,4,2,209,212",
  "212,152,240,112,56,29,15,6,0,0,0,0,0,0,0,128,64,32,48,104,196,130,1,0,16,16,9,5,3,1,3,3,3,3,3,1,1,1,1,1,0,0,128,128,128,0,192,176,240,136",
  "132,130,128,128,128,128,0,0,0,0,1,1,1,3,237,48,28,6,3,0,0,0,192,192,192,128,192,232,144,128,192,32,16,32,192,196,120,0,0,0,0,0,0,0,0,1,1,1,3,3",
  "3,14,16,255,0,0,96,96,96,64,192,232,208,192,128,128,224,32,33,254,1,1,1,1,3,3,3,3,3,3,3,3,3,3,3,255,128,128,128,0,128,128,128,128,128,0,0,0,0,0",
  "1,254,8,8,11,11,11,10,7,7,7,7,7,3,1,1,3,255,64,64,64,64,64,64,128,0,0,0,0,0,128,128,1,254,0,0,0,1,1,1,1,3,4,252,7,0,0,0,0,0,192,192,192,128,208,160,128,224,32,32,161,254,0,0,0,0",
]
  .join(",")
  .split(",")
  .map(Number);

// Decode the raw byte stream into 16x16 monochrome sprite bitmaps.
// MSX 16x16 sprite pattern layout: bytes 0-15 = left half (16 rows, 8px
// wide), bytes 16-31 = right half (16 rows, 8px wide).
function decodeSprite(bytes32) {
  const rows = [];
  for (let r = 0; r < 16; r++) {
    const left = bytes32[r] ?? 0;
    const right = bytes32[16 + r] ?? 0;
    const row = [];
    for (let b = 7; b >= 0; b--) row.push((left >> b) & 1);
    for (let b = 7; b >= 0; b--) row.push((right >> b) & 1);
    rows.push(row);
  }
  return rows;
}

const SPRITE_COUNT = Math.max(1, Math.floor(SPRITE_DATA_RAW.length / 32));
const SPRITES = [];
for (let i = 0; i < SPRITE_COUNT; i++) {
  SPRITES.push(decodeSprite(SPRITE_DATA_RAW.slice(i * 32, i * 32 + 32)));
}

function spriteFor(index) {
  // Falls back gracefully if a transcription gap ever produces fewer than
  // 13 decoded sprites.
  return SPRITES[index % SPRITES.length];
}

// ---------------------------------------------------------------------------
// Hill profile M(x) and flight table P(x), ported from lines 850-920.
// ---------------------------------------------------------------------------

function buildHillProfile() {
  const M = new Array(201).fill(0);
  for (let x = 0; x <= 20; x++) M[x] = 18; // line 850
  for (let x = 21; x <= 70; x++) M[x] = 80 - Math.floor(0.0248 * (x - 70) ** 2); // line 860
  for (let x = 71; x <= 83; x++) M[x] = 90; // line 870
  const extra = DATA_1220.slice(0, 27); // line 880
  for (let x = 84; x <= 110; x++) M[x] = extra[x - 84];
  for (let x = 111; x <= 200; x++) M[x] = 180 - Math.floor(0.008765432099 * (x - 200) ** 2); // line 890
  return M;
}

function buildFlightTable() {
  const P = new Array(101).fill(0);
  for (let x = 1; x <= 25; x++) P[x] = 63; // line 900
  const extra = DATA_1220.slice(27, 52); // line 910
  for (let x = 26; x <= 50; x++) P[x] = extra[x - 26] - 16;
  for (let x = 51; x <= 99; x++) P[x] = 1.68182 * (x - 51) + 78; // line 920
  return P;
}

const M = buildHillProfile();
const P = buildFlightTable();

function clampIndex(v, lo, hi) {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

// ---------------------------------------------------------------------------
// Game state (practice mode, mirrors lines 810-820 + the GOSUB 20 jump).
// ---------------------------------------------------------------------------

const STEP_MS = 26; // pace of one simulated BASIC "frame" (x-step)

let bestDistance = 0; // "KE" record display (line 10 starts at 110 in the original)
let phase = "ready"; // ready -> approach -> flight -> tail -> result -> ready
let x = 5;
let H = 0;
let K = 0;
let ST = 1;
let S = 0;
let triggered = false;
let E = 0; // frames since last balance change (line 120's gate)
let PK = 0; // landing/crash penalty flag

// L-array bookkeeping (lines 170/200/300/400-440), tracked incrementally
// instead of re-scanning an array, since we control the simulation loop.
let L0 = 0;
let L1 = 0;
let L4 = 0;
let LM = 0;
let prevMark = 0;
let lastMark = 0;

let skierX = 4;
let skierY = M[4] - 17;
let skierSprite = 10;
let crashZ = 0;
let landingZ = 0;
let runoutX = 0;
let crashLandX = 0;
let crashKneeOffset = 0;
let skiAngle = 0;
let gameMode = "practice";
let competition = null;

const input = { jump: false, raise: false, lower: false };
const COUNTRIES = ["Finland", "Austria", "Norway", "DDR", "Canada"].map((country) => t(country));

const GAME_VERSION = window.MAKIHYPPY_VERSION ?? { source: "development", built: "not generated" };
versionEl.textContent = `v${GAME_VERSION.source} built ${GAME_VERSION.built}`;

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    if (!input.jump) onJumpKey();
    input.jump = true;
  } else if (event.code === "KeyA") {
    event.preventDefault();
    input.raise = true;
  } else if (event.code === "KeyD") {
    event.preventDefault();
    input.lower = true;
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "Space") input.jump = false;
  else if (event.code === "KeyA") input.raise = false;
  else if (event.code === "KeyD") input.lower = false;
});

function bindTouchControl(button, inputName, onPress) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    input[inputName] = true;
    onPress?.();
  });
  const release = (event) => {
    event.preventDefault();
    input[inputName] = false;
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}

bindTouchControl(jumpButton, "jump", onJumpKey);
bindTouchControl(raiseButton, "raise");
bindTouchControl(lowerButton, "lower");

function setSkiAngle(angle) {
  skiAngle = angle;
  angleEl.textContent = String(angle);
}

function updateStance() {
  stanceEl.textContent = phase === "flight" ? `${S} (${S <= 2 ? t("safe") : t("fall")})` : t("ready");
}

function updateHint() {
  if (gameMode === "competition" && phase === "ready" && competition?.awaitingNext) {
    hintEl.textContent = competition.round >= competition.rounds ? t("hintComplete") : t("hintNextRound");
    return;
  }

  if (gameMode === "competition" && phase === "ready" && competition) {
    hintEl.textContent = t("hintPlayer", { name: competition.competitors[0].name });
    return;
  }

  if (phase === "ready") {
    hintEl.textContent = t("hintReady");
  } else if (phase === "approach") {
    hintEl.textContent = x <= 59
      ? t("hintWait")
      : x <= 67
        ? t("hintTakeoff")
        : t("hintMissed");
  } else if (phase === "flight") {
    const targetStance = x < 112 ? 3 : 2;
    if (S < targetStance) {
      hintEl.textContent = t("hintLower", { stance: targetStance });
    } else if (S > targetStance) {
      hintEl.textContent = t("hintRaise", { stance: targetStance });
    } else if (targetStance === 3) {
      hintEl.textContent = t("hintGlide");
    } else {
      hintEl.textContent = t("hintLanding");
    }
  } else if (phase === "landing") {
    hintEl.textContent = t("hintClean");
  } else if (phase === "runout") {
    hintEl.textContent = t("hintRunout");
  } else {
    hintEl.textContent = t("hintFall");
  }
}

function stanceAngle(stance) {
  return [-28, -12, 10, 28][stance - 1] ?? 0;
}

function onJumpKey() {
  if (phase === "ready") {
    if (gameMode === "competition" && (!competition || competition.awaitingNext || competition.order[competition.turn] !== 0)) {
      return;
    }
    startApproach();
  } else if (phase === "approach" && !triggered && x > 59) {
    takeOff();
  }
}

function startApproach() {
  x = 4;
  H = 0;
  K = 0;
  ST = 1;
  S = 0;
  triggered = false;
  PK = 0;
  L0 = 1;
  L1 = L4 = LM = 0;
  prevMark = 0;
  lastMark = 0;
  E = 0;
  setSkiAngle(0);
  phase = "approach";
  updateStance();
  statusEl.textContent = t("approachStatus");
}

function recordMark(mark) {
  if (mark !== 0) {
    L0++;
    if (mark === 1) L1++;
    else if (mark === 4) L4++;
    else if (mark !== prevMark) LM++;
    lastMark = mark;
  }
  prevMark = mark;
}

// line 70: takeoff timing capture.
function takeOff() {
  triggered = true;
  H = x;
  S = 2;
  applyTimingCost();
}

// line 80/90: takeoff timing style/power cost.
function applyTimingCost() {
  if (H > 62 && H < 68) {
    ST = 2;
  } else {
    ST = 1;
    K += 2;
  }
  K += Math.abs(65 - H);
}

function stepApproach() {
  x += 1;
  skierX = x;
  skierY = M[x] - 17;
  skierSprite = triggered ? 2 : 0;

  if (x >= 70) {
    // line 110
    S = ST;
    if (H < 60) {
      K += 35;
      H = 50;
    }
    startFlight();
  }
}

function startFlight() {
  x = 71;
  E = 0;
  setSkiAngle(stanceAngle(S));
  phase = "flight";
  updateStance();
  statusEl.textContent = t("flightStatus");
}

function stepFlight() {
  // Lines 120-130: stance selects the original angled-ski sprite and also
  // changes drag, landing validity, and fall risk.
  if (E >= 4 && (input.raise || input.lower)) {
    if (input.raise) {
      S -= 1;
      K += 0.3;
    } else if (input.lower) {
      S += 1;
      K += 0.3;
    }
    E = 0;
    setSkiAngle(stanceAngle(S));
    updateStance();
  } else {
    E += 1;
  }

  // line 140: continuous balance cost, S=3 is the "sweet spot".
  if (S === 3) {
    // no extra cost
  } else if (S === 1 || S === 4) {
    K += 0.5;
  } else {
    K += 0.3;
  }

  // line 150: losing balance entirely is an immediate crash.
  if (S < 1 || S > 4) {
    PK = 10;
    startCrashSlide();
    return;
  }

  const idx = clampIndex(x + K - 70, 0, 100);

  // line 160: touchdown detection.
  if (P[idx] + 16 >= M[x]) {
    handleTouchdown();
    return;
  }

  // line 170: airborne, on-track.
  recordMark(S);
  skierX = x;
  skierY = P[idx];
  skierSprite = S;

  x += 1;
  if (x > 180) {
    // Flight loop exhausted without a touchdown reading (shouldn't normally
    // happen given the table shape, but guard against it defensively).
    handleTouchdown();
  }
}

function handleTouchdown() {
  // line 190: landing stance must be 1 or 2 for a clean landing.
  if (S === 1 || S === 2) {
    landingZ = x;
    phase = "landing";
    statusEl.textContent = t("cleanLanding");
  } else {
    PK = 10;
    startCrashSlide();
  }
}

function startCrashSlide() {
  phase = "tail";
  statusEl.textContent = t("lostBalance");
  crashZ = x;
}

function stepCrashSlide() {
  // line 290-310: keep sliding (marking L(Z-70)=5) until a second ground
  // intersection or the loop bound is reached.
  K += 0.5;
  const idx = clampIndex(crashZ + K - 70, 0, 100);
  if (P[idx] + 16 >= M[crashZ] || crashZ >= 170) {
    crashLandX = crashZ;
    crashKneeOffset = 0;
    phase = "crash-land";
    return;
  }
  recordMark(5);
  skierX = crashZ;
  skierY = P[idx];
  skierSprite = 5;
  crashZ += 1;
}

function stepLanding() {
  if (landingZ <= x + 5) {
    skierX = landingZ;
    skierY = M[landingZ] - 14;
    skierSprite = 1;
    landingZ += 1;
    return;
  }

  if (landingZ <= 195) {
    skierX = landingZ;
    skierSprite = landingZ < 165 ? 8 : 12;
    skierY = M[landingZ] - (landingZ < 165 ? 9 : 11);
    landingZ += 1;
    return;
  }

  runoutX = 196;
  S = 9;
  phase = "runout";
  statusEl.textContent = t("runoutStatus");
}

function stepRunout() {
  if (input.raise) S -= 1;
  else if (input.lower) S += 1;
  S = Math.max(9, Math.min(11, S));

  const groundY = runoutX <= 200 ? M[runoutX] : 180;
  skierX = runoutX;
  skierY = groundY - 17 - (input.jump ? 3 : 0);
  skierSprite = S;
  runoutX += 1;

  if (runoutX > 230) finishJump();
}

function stepCrashLand() {
  if (crashLandX <= 200) {
    skierX = crashLandX;
    skierY = M[crashLandX] - 11 + crashKneeOffset;
    skierSprite = 6;
    if (crashLandX === 150) crashKneeOffset = -1;
    else if (crashLandX === 170) crashKneeOffset = -3;
    else if (crashLandX === 183) crashKneeOffset = -6;
    crashLandX += 1;
    return;
  }

  if (crashLandX === 201) {
    skierX = 201;
    skierY = 163;
    skierSprite = 7;
    crashLandX += 1;
    return;
  }

  finishJump();
}

// line 460: distance formula.
function computeDistance() {
  let l0 = L0;
  if (PK !== 0) l0 -= 15; // line 450
  if (l0 < 0) l0 = 0;
  const mIdx = clampIndex(70 + l0, 0, 200);
  const distance = Math.floor(1.9 * Math.sqrt(l0 * l0 + (M[mIdx] - 80) ** 2)) / 2;
  return distance;
}

// line 430 (simplified): style bonus based on the stance at the end of the track.
function computeP3() {
  if (lastMark === 1) return 4;
  if (lastMark === 2) return 3;
  if (lastMark !== 0) return 2;
  return 0;
}

// lines 480-660: the 5-judge trimmed-mean style score.
function computeJudgesScore(distance) {
  const P1 = Math.max(0, 4 - Math.abs(65 - H) * 0.5);
  const P2 = Math.max(0, 12 - (10 * (L1 + L4)) / Math.max(1, L0) - 0.3 * LM);
  const P3 = computeP3();
  let PT = P1 + P2 + P3 - PK;
  if (PT < 2.5) PT = 2.5;
  PT = Math.floor(PT * 2) / 2;

  const PP = distance < 60 ? 0 : Math.floor(((distance - 60) * 600) / 55) / 10;

  const spread = Math.floor(Math.random() * 3) * 0.5; // line 530
  const highJudge = Math.floor(Math.random() * 5);
  let lowJudge = Math.floor(Math.random() * 5);
  while (lowJudge === highJudge) lowJudge = Math.floor(Math.random() * 5);

  const marks = new Array(5).fill(PT);
  marks[highJudge] = PT + spread;
  marks[lowJudge] = PT - spread;
  const openJudges = marks
    .map((mark, index) => (index === highJudge || index === lowJudge ? -1 : index))
    .filter((index) => index >= 0);
  for (let index = 0; index < 2; index++) {
    const judge = openJudges[index];
    marks[judge] = PT + spread - Math.floor(Math.random() * spread * 4) * 0.5;
  }
  marks[openJudges[2]] = 0;
  marks[openJudges[2]] = PT * 5 - marks.reduce((sum, mark) => sum + mark, 0);
  for (let index = 0; index < 5; index++) marks[index] = Math.max(0, Math.min(20, marks[index]));

  const sum = marks.reduce((a, b) => a + b, 0);
  const max = Math.max(...marks);
  const min = Math.min(...marks);
  return {
    marks,
    discardedHigh: max,
    discardedLow: min,
    styleTotal: sum - max - min,
    distanceBonus: PP,
    total: sum - max - min + PP,
  };
}

function renderJudgeScores(score) {
  const marks = score.marks.map((mark) => mark.toFixed(1)).join(" | ");
  judgeScoresEl.textContent = t("judges", {
    marks,
    high: score.discardedHigh.toFixed(1),
    low: score.discardedLow.toFixed(1),
    style: score.styleTotal.toFixed(1),
    bonus: score.distanceBonus.toFixed(1),
  });
}

function resetToReady() {
  skierX = 4;
  skierY = M[4] - 17;
  skierSprite = 10;
  setSkiAngle(0);
  phase = "ready";
  updateStance();
}

function createCompetitorInputs() {
  const count = Math.max(1, Math.min(9, Number(competitorCountEl.value) || 1));
  competitorCountEl.value = String(count);
  competitorInputsEl.replaceChildren();

  for (let index = 0; index < count; index++) {
    const row = document.createElement("div");
    row.className = "competitorInput";
    const name = document.createElement("input");
    name.className = "competitorName";
    name.value = index === 0 ? t("player") : t("jumperName", { number: index + 1 });
    name.maxLength = 15;
    name.setAttribute("aria-label", t("competitorName", { number: index + 1 }));
    const country = document.createElement("select");
    country.className = "competitorCountry";
    country.setAttribute("aria-label", t("competitorCountry", { number: index + 1 }));
    for (const countryName of COUNTRIES) {
      const option = document.createElement("option");
      option.value = countryName;
      option.textContent = countryName;
      if (countryName === COUNTRIES[index % COUNTRIES.length]) option.selected = true;
      country.append(option);
    }
    row.append(name, country);
    competitorInputsEl.append(row);
  }
}

function renderCompetition() {
  if (!competition) return;
  competitionPanel.hidden = false;
  scoreboardBody.replaceChildren();
  const standings = [...competition.competitors].sort((a, b) => b.total - a.total);
  standings.forEach((competitor, index) => {
    const row = document.createElement("tr");
    const lastJump = competitor.jumps.at(-1);
    const values = [
      String(index + 1),
      competitor.name,
      competitor.country,
      lastJump ? `${lastJump.distance.toFixed(1)} m / ${lastJump.points.toFixed(1)}` : "-",
      competitor.total.toFixed(1),
    ];
    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    scoreboardBody.append(row);
  });
}

function aiJump(competitorIndex) {
  const seed = (competition.round * 37 + competitorIndex * 53) % 100;
  const distance = 62 + (seed % 31) + (seed % 2) * 0.5;
  const distanceBonus = Math.floor(((distance - 60) * 600) / 55) / 10;
  const styleTotal = 43 + (seed % 14) * 0.5;
  return { distance, points: styleTotal + distanceBonus };
}

function recordCompetitionJump(competitorIndex, result) {
  const competitor = competition.competitors[competitorIndex];
  competitor.jumps.push({ round: competition.round, ...result });
  competitor.total += result.points;
}

function prepareCompetitionPlayer() {
  resetToReady();
  const player = competition.competitors[0];
  statusEl.textContent = t("roundPrepare", { round: competition.round, name: player.name });
  updateHint();
}

function completeCompetitionRound() {
  competition.awaitingNext = true;
  renderCompetition();
  if (competition.round < competition.rounds) {
    competitionMessageEl.textContent = t("roundComplete", { round: competition.round });
    statusEl.textContent = t("roundCompleteStatus");
    nextRoundButton.hidden = false;
  } else {
    competitionMessageEl.textContent = t("competitionComplete");
    statusEl.textContent = t("competitionCompleteStatus");
    nextRoundButton.hidden = true;
  }
  updateHint();
}

function simulateAiUntilPlayer() {
  while (competition.turn < competition.order.length) {
    const competitorIndex = competition.order[competition.turn];
    if (competitorIndex === 0) {
      prepareCompetitionPlayer();
      return;
    }
    recordCompetitionJump(competitorIndex, aiJump(competitorIndex));
    competition.turn += 1;
  }
  completeCompetitionRound();
}

function beginCompetitionRound() {
  competition.awaitingNext = false;
  competition.order = competition.competitors
    .map((competitor, index) => ({ index, total: competitor.total }))
    .sort((a, b) => a.total - b.total)
    .map(({ index }) => index);
  competition.turn = 0;
  nextRoundButton.hidden = true;
  competitionMessageEl.textContent = t("roundOf", { round: competition.round, rounds: competition.rounds });
  simulateAiUntilPlayer();
  renderCompetition();
}

function completeCompetitionPlayerJump(distance, score) {
  if (competition.awaitingNext || competition.order[competition.turn] !== 0) return;
  recordCompetitionJump(0, { distance, points: score.total });
  competition.turn += 1;
  simulateAiUntilPlayer();
  renderCompetition();
}

function startCompetition() {
  const names = [...competitorInputsEl.querySelectorAll(".competitorName")];
  const countries = [...competitorInputsEl.querySelectorAll(".competitorCountry")];
  competition = {
    round: 1,
    rounds: Math.max(1, Math.min(6, Number(roundCountEl.value) || 1)),
    competitors: names.map((name, index) => ({
      name: name.value.trim() || t("jumperName", { number: index + 1 }),
      country: countries[index].value,
      total: 0,
      jumps: [],
    })),
    order: [],
    turn: 0,
    awaitingNext: false,
  };
  gameMode = "competition";
  competitionSetup.hidden = true;
  resultEl.textContent = "";
  judgeScoresEl.textContent = "";
  beginCompetitionRound();
}

function finishJump() {
  const distance = computeDistance();
  const score = computeJudgesScore(distance);
  const points = score.total;

  if (distance > bestDistance) {
    bestDistance = distance;
    bestEl.textContent = bestDistance.toFixed(1);
  }

  resultEl.textContent = t("result", {
    distance: distance.toFixed(1),
    fall: PK ? t("fallResult") : "",
    points: points.toFixed(1),
  });
  renderJudgeScores(score);

  resetToReady();
  if (gameMode === "competition" && competition) {
    completeCompetitionPlayerJump(distance, score);
  } else {
    statusEl.textContent = t("readyStatus");
    updateHint();
  }
}

practiceButton.addEventListener("click", () => {
  gameMode = "practice";
  competition = null;
  competitionSetup.hidden = true;
  competitionPanel.hidden = true;
  nextRoundButton.hidden = true;
  resetToReady();
  statusEl.textContent = t("readyStatus");
  updateHint();
});

competitionButton.addEventListener("click", () => {
  competitionSetup.hidden = !competitionSetup.hidden;
  if (!competitionSetup.hidden) createCompetitorInputs();
});

competitorCountEl.addEventListener("change", createCompetitorInputs);
competitionSetup.addEventListener("submit", (event) => {
  event.preventDefault();
  startCompetition();
});
nextRoundButton.addEventListener("click", () => {
  if (!competition || !competition.awaitingNext || competition.round >= competition.rounds) return;
  competition.round += 1;
  beginCompetitionRound();
});

createCompetitorInputs();

// ---------------------------------------------------------------------------
// Rendering (approximates lines 930-970's hill drawing + sprite output).
// ---------------------------------------------------------------------------

function drawHill() {
  ctx.fillStyle = "#bfe3ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // --- Ground / hill surface (lines 960-970) -------------------------------
  // The real hill surface only starts at x=71 (the takeoff table); under the
  // inrun tower (x=0..70) the ground is just a flat baseline at y=90
  // ("LINE(0,90)-(70,90),7"). M(x) for x=0..70 is the elevated ramp track,
  // not the ground, so it must not be used for the ground fill/outline here.
  ctx.fillStyle = "#d9d4c4";
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(0, 90 * SCALE);
  ctx.lineTo(70 * SCALE, 90 * SCALE);
  for (let px = 71; px <= 200; px++) ctx.lineTo(px * SCALE, M[px] * SCALE);
  ctx.lineTo(255 * SCALE, 180 * SCALE);
  ctx.lineTo(255 * SCALE, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#5b5347";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 90 * SCALE);
  ctx.lineTo(70 * SCALE, 90 * SCALE);
  for (let px = 71; px <= 200; px++) ctx.lineTo(px * SCALE, M[px] * SCALE);
  ctx.lineTo(255 * SCALE, 180 * SCALE);
  ctx.stroke();

  // --- Inrun ramp + takeoff tower (lines 930-940) --------------------------
  // The ramp the skier actually runs down is a separate, elevated track
  // above the ground line, carried by a few support pillars.
  ctx.strokeStyle = "#1b1b1b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, M[0] * SCALE);
  for (let px = 1; px <= 70; px++) ctx.lineTo(px * SCALE, M[px] * SCALE);
  ctx.lineTo(70 * SCALE, 90 * SCALE);
  ctx.stroke();

  ctx.fillStyle = "#1b1b1b";
  const pillars = [
    [0, 18, 5, 90],
    [17, 18, 20, 90],
    [35, 55, 38, 90],
    [60, 80, 70, 90],
  ];
  for (const [x1, y1, x2, y2] of pillars) {
    ctx.fillRect(x1 * SCALE, y1 * SCALE, (x2 - x1) * SCALE, (y2 - y1) * SCALE);
  }

  // Distance markers (line 950).
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(155 * SCALE, 169 * SCALE);
  ctx.lineTo(162 * SCALE, 169 * SCALE);
  ctx.moveTo(139 * SCALE, 156 * SCALE);
  ctx.lineTo(146 * SCALE, 156 * SCALE);
  ctx.moveTo(125 * SCALE, 141 * SCALE);
  ctx.lineTo(132 * SCALE, 141 * SCALE);
  ctx.stroke();

  ctx.fillStyle = "#333";
  ctx.font = `${SCALE * 5}px monospace`;
  ctx.fillText("120m", 164 * SCALE, 172 * SCALE);
  ctx.fillText("100m", 148 * SCALE, 159 * SCALE);
  ctx.fillText("80m", 134 * SCALE, 144 * SCALE);
}

function drawSkier() {
  const bitmap = spriteFor(skierSprite);
  const px = Math.round(skierX * SCALE);
  const py = Math.round(skierY * SCALE);
  const angle = phase === "flight" ? (skiAngle * Math.PI) / 180 : 0;
  ctx.fillStyle = "#1e3a8a";
  ctx.save();
  ctx.translate(px + 8 * SCALE, py + 8 * SCALE);
  ctx.rotate(angle);
  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      if (bitmap[r][c]) {
        ctx.fillRect((c - 8) * SCALE, (r - 8) * SCALE, SCALE, SCALE);
      }
    }
  }
  ctx.restore();
}

function render() {
  drawHill();
  drawSkier();
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

let lastStepTime = 0;

function tick(now) {
  if (now - lastStepTime >= STEP_MS) {
    lastStepTime = now;
    if (phase === "approach") stepApproach();
    else if (phase === "flight") stepFlight();
    else if (phase === "tail") stepCrashSlide();
    else if (phase === "landing") stepLanding();
    else if (phase === "runout") stepRunout();
    else if (phase === "crash-land") stepCrashLand();
    updateHint();
  }
  render();
  requestAnimationFrame(tick);
}

bestEl.textContent = bestDistance.toFixed(1);
statusEl.textContent = t("readyStatus");
updateHint();
requestAnimationFrame(tick);
